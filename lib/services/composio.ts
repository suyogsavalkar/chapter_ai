import { Composio, jsonSchemaToZodSchema, removeNonRequiredProperties } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { tool } from "ai";

/**
 * Gemini-safe provider wrapper
 * - Sanitizes JSON Schemas to avoid Gemini enum/type mismatches
 * - Example issue: string-typed fields with numeric enum values (e.g., 30-49 in Todoist color IDs)
 */
class GeminiSafeVercelProvider extends VercelProvider {
  constructor() {
    // Enable strict mode to keep only required parameters and set additionalProperties=false
    super({ strict: true });
  }

  private stringifyAllEnumsAndCollectConverters(schema: any, original: any, path: Array<string | symbol> = []) {
    const converters: Array<{ path: Array<string | symbol>; to: "number" | "integer" | "boolean" }> = [];
    const visit = (node: any, origNode: any, p: Array<string | symbol>): any => {
      if (!node || typeof node !== "object") return node;
      const clone: any = Array.isArray(node) ? [...node] : { ...node };

      // If this node has an enum, convert all values to strings for Gemini compatibility.
      if (Array.isArray(clone.enum)) {
        clone.enum = clone.enum.map((v: any) => String(v));
        // Force the schema type to string for this node to align with enum
        if (clone.type && clone.type !== "object" && clone.type !== "array") {
          // Track converter if original type was numeric/boolean
          const origType = origNode?.type;
          if (origType === "number" || origType === "integer" || origType === "boolean") {
            converters.push({ path: p, to: origType });
          }
          clone.type = "string";
        }
      }

      // Recurse into properties
      if (clone.properties && typeof clone.properties === "object") {
        const newProps: Record<string, any> = {};
        for (const [k, v] of Object.entries(clone.properties)) {
          newProps[k] = visit(v, origNode?.properties?.[k], [...p, k]);
        }
        clone.properties = newProps;
      }

      // Recurse into items (arrays)
      if (clone.items) {
        clone.items = visit(clone.items, origNode?.items, [...p, Symbol("__items__")]);
      }

      // anyOf / oneOf / allOf
      if (Array.isArray(clone.anyOf)) clone.anyOf = clone.anyOf.map((s: any, i: number) => visit(s, origNode?.anyOf?.[i], [...p, Symbol(`anyOf_${i}`)]));
      if (Array.isArray(clone.oneOf)) clone.oneOf = clone.oneOf.map((s: any, i: number) => visit(s, origNode?.oneOf?.[i], [...p, Symbol(`oneOf_${i}`)]));
      if (Array.isArray(clone.allOf)) clone.allOf = clone.allOf.map((s: any, i: number) => visit(s, origNode?.allOf?.[i], [...p, Symbol(`allOf_${i}`)]));

      return clone;
    };

    const sanitized = visit(schema, original, path);
    return { sanitized, converters };
  }

  private applyConverters(input: any, converters: Array<{ path: Array<string | symbol>; to: "number" | "integer" | "boolean" }>) {
    const convertValue = (val: any, to: "number" | "integer" | "boolean") => {
      if (to === "boolean") {
        if (typeof val === "boolean") return val;
        if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
        if (typeof val === "number") return val !== 0;
        return Boolean(val);
      }
      if (typeof val === "string") {
        const num = to === "integer" ? parseInt(val, 10) : parseFloat(val);
        return Number.isNaN(num) ? val : num;
      }
      return val;
    };

    const setAtPath = (obj: any, path: Array<string | symbol>, to: "number" | "integer" | "boolean") => {
      const walk = (target: any, idx: number): void => {
        if (idx >= path.length || target == null) return;
        const key = path[idx];
        const isItems = typeof key === "symbol" && String(key).includes("__items__");
        if (isItems) {
          if (Array.isArray(target)) {
            target.forEach((item, i) => walk(target[i], idx + 1));
          }
          return;
        }
        if (idx === path.length - 1) {
          if (Object.prototype.hasOwnProperty.call(target, key as any)) {
            target[key as any] = convertValue(target[key as any], to);
          }
          return;
        }
        walk(target[key as any], idx + 1);
      };
      walk(obj, 0);
    };

    const clone = typeof input === "object" && input !== null ? JSON.parse(JSON.stringify(input)) : input;
    for (const c of converters) setAtPath(clone, c.path, c.to);
    return clone;
  }

  override wrapTool(composioTool: any, executeTool: any) {
    try {
      const originalParams = composioTool?.inputParameters ?? {};
      const { sanitized, converters } = this.stringifyAllEnumsAndCollectConverters(
        originalParams,
        originalParams
      );
      const schema = this.strict && sanitized?.type === "object" ? removeNonRequiredProperties(sanitized) : sanitized ?? {};
      const inputParametersSchema = jsonSchemaToZodSchema(schema);

      return tool({
        description: composioTool.description,
        inputSchema: inputParametersSchema,
        execute: async (params: any) => {
          const input = typeof params === "string" ? JSON.parse(params) : params;
          const restored = this.applyConverters(input, converters);
          return await executeTool(composioTool.slug, restored);
        },
      });
    } catch (err) {
      console.warn(
        "GeminiSafeVercelProvider: failed to sanitize tool, falling back to default",
        { slug: composioTool?.slug, err }
      );
      return super.wrapTool(composioTool, executeTool);
    }
  }
}

/**
 * Composio client instance for server-side operations
 * This should only be used in server-side code (API routes, server components)
 * For client-side operations, use the API endpoints in /app/api/
 */

if (!process.env.COMPOSIO_API_KEY) {
  console.error("COMPOSIO_API_KEY is not set in environment variables");
}

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
  provider: new GeminiSafeVercelProvider(),
});

export default composio;
