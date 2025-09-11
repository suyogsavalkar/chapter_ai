import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

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
  provider: new VercelProvider(),
});

export default composio;
