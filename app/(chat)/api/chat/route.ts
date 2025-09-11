import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { auth, type UserType } from "@/app/(auth)/auth";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { createDocument } from "@/lib/ai/tools/create-document";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { getComposioTools } from "@/lib/ai/tools/composio";
import { isProductionEnvironment } from "@/lib/constants";
import { myProvider } from "@/lib/ai/providers";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { postRequestBodySchema, type PostRequestBody } from "./schema";
import { geolocation } from "@vercel/functions";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { after } from "next/server";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { ChatModel } from "@/lib/ai/models";
import type { VisibilityType } from "@/components/visibility-selector";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      enabledToolkits,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
      enabledToolkits?: Array<{ slug: string; isConnected?: boolean }>;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    // Get enabled toolkits from request or fetch from server as fallback
    let toolkitSlugs = (enabledToolkits || [])
      .filter((t) => t.isConnected === true)
      .map((t) => t.slug.toLowerCase());

    // If no toolkits provided in request, fetch from server to ensure persistence
    if (toolkitSlugs.length === 0) {
      try {
        const toolkitsResponse = await fetch(
          `${request.url.split("/api/chat")[0]}/api/toolkits`,
          {
            headers: {
              Cookie: request.headers.get("Cookie") || "",
            },
          }
        );

        if (toolkitsResponse.ok) {
          const toolkitsData = await toolkitsResponse.json();
          const connectedToolkits = (toolkitsData.toolkits || [])
            .filter((t: any) => t.isConnected)
            .map((t: any) => t.slug.toLowerCase());

          toolkitSlugs = connectedToolkits;
          console.log(
            "Chat API - Fetched connected toolkits from server:",
            toolkitSlugs
          );
        }
      } catch (error) {
        console.warn("Failed to fetch toolkits from server:", error);
      }
    }

    console.log("Chat API - Enabled toolkits received:", enabledToolkits);
    console.log("Chat API - Final toolkit slugs:", toolkitSlugs);
    console.log("Chat API - User ID:", session.user.id);

    // Fetch Composio tools for connected toolkits
    const composioTools =
      toolkitSlugs.length > 0
        ? await getComposioTools(session.user.id, toolkitSlugs)
        : {};

    console.log(
      "Chat API - Composio tools loaded:",
      Object.keys(composioTools || {})
    );

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log("Chat API - Selected chat model:", selectedChatModel);

        const activeTools = [
          "getWeather",
          "createDocument",
          "updateDocument",
          "requestSuggestions",
          ...Object.keys(composioTools || {}),
        ];

        // Note: Removed the reasoning model check to always enable tools
        console.log(
          "Chat API - Tools will be enabled for model:",
          selectedChatModel
        );

        // Build the complete tools object
        const builtInTools = {
          getWeather,
          createDocument: createDocument({ session, dataStream }),
          updateDocument: updateDocument({ session, dataStream }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
          }),
        };

        console.log("Built-in tools:", Object.keys(builtInTools));
        console.log("Composio tools:", Object.keys(composioTools || {}));

        const allTools = {
          ...builtInTools,
          ...composioTools,
        };

        // Enhanced debugging and sanitization for Gemini function naming rules
        console.log("=== TOOL DEBUGGING START ===");
        console.log(
          "Total tools before sanitization:",
          Object.keys(allTools).length
        );

        // Check for invalid tool names before sanitization
        const invalidTools: string[] = [];
        const validationRegex = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

        Object.keys(allTools).forEach((name, index) => {
          const isValid = validationRegex.test(name) && name.length <= 64;
          if (!isValid) {
            invalidTools.push(
              `[${index}] "${name}" - ${
                !validationRegex.test(name) ? "invalid chars/start" : "too long"
              }`
            );
          }
        });

        if (invalidTools.length > 0) {
          console.log("❌ INVALID TOOL NAMES FOUND:");
          invalidTools.forEach((tool) => console.log("  ", tool));
        } else {
          console.log("✅ All tool names are valid for Gemini");
        }

        // Log all tool names for inspection
        console.log("All tool names:", Object.keys(allTools));

        // Sanitize tool names to satisfy Gemini function naming rules
        // Rules: start with letter or underscore; allowed chars: a-zA-Z0-9_.-; max length 64
        const sanitizeName = (name: string) => {
          let sanitized = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
          if (!/^[A-Za-z_]/.test(sanitized)) sanitized = `_${sanitized}`;

          // Handle long names more intelligently
          if (sanitized.length > 64) {
            // Try to preserve meaningful parts by truncating from the middle
            const prefix = sanitized.substring(0, 30);
            const suffix = sanitized.substring(sanitized.length - 30);
            sanitized = `${prefix}__${suffix}`;

            // If still too long, just truncate
            if (sanitized.length > 64) {
              sanitized = sanitized.slice(0, 64);
            }
          }
          return sanitized;
        };

        const sanitizeTools = (toolsObj: Record<string, any>) => {
          const used = new Set<string>();
          const nameMap = new Map<string, string>(); // original -> sanitized
          const result: Record<string, any> = {};
          const changes: string[] = [];

          for (const [origName, fn] of Object.entries(toolsObj)) {
            let base = sanitizeName(origName);
            let name = base;
            let i = 1;
            while (used.has(name)) {
              const suffix = `_${i++}`;
              const maxBaseLen = 64 - suffix.length;
              name =
                (base.length > maxBaseLen ? base.slice(0, maxBaseLen) : base) +
                suffix;
            }
            used.add(name);
            nameMap.set(origName, name);
            result[name] = fn;

            if (origName !== name) {
              changes.push(`"${origName}" → "${name}"`);
            }
          }

          if (changes.length > 0) {
            console.log("Tool name changes made:");
            changes.forEach((change) => console.log("  ", change));
          }

          return { tools: result, nameMap };
        };

        const { tools: safeTools, nameMap } = sanitizeTools(allTools);
        console.log(
          "Total tools after sanitization:",
          Object.keys(safeTools).length
        );
        console.log("=== TOOL DEBUGGING END ===");
        const activeToolsSafe = activeTools.map((n) => nameMap.get(n) ?? n);

        console.log("Chat API - Active tools configured:", activeToolsSafe);
        console.log("Chat API - All tools available:", Object.keys(safeTools));
        console.log(
          "Chat API - Composio tools in allTools:",
          Object.keys(safeTools).filter(
            (key) =>
              key.startsWith("GMAIL_") || key.startsWith("GOOGLECALENDAR_")
          )
        );

        // Log system prompt for debugging
        const systemPromptText = systemPrompt({
          selectedChatModel,
          requestHints,
          availableTools: activeTools,
        });
        console.log(
          "Chat API - System prompt includes tools:",
          systemPromptText.includes("Gmail") ||
            systemPromptText.includes("Google Calendar")
        );
        console.log(
          "Chat API - System prompt length:",
          systemPromptText.length
        );

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            availableTools: activeToolsSafe,
          }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools: activeToolsSafe,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: safeTools,
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream())
        )
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error);
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
