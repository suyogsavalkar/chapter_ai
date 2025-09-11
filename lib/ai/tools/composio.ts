import composio from "@/lib/services/composio";

// Cache for tools to avoid repeated API calls
const toolsCache = new Map<string, { tools: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches Composio tools for a user based on enabled toolkits
 * This is used specifically for AI/LLM tool integration
 */
export async function getComposioTools(userId: string, toolkitSlugs: string[]) {
  console.log("getComposioTools called with:", { userId, toolkitSlugs });

  if (!toolkitSlugs || toolkitSlugs.length === 0) {
    console.log("No toolkit slugs provided, returning empty tools");
    return {};
  }

  // Create cache key
  const cacheKey = `${userId}:${toolkitSlugs.sort().join(",")}`;
  const cached = toolsCache.get(cacheKey);

  // Return cached tools if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("Returning cached Composio tools:", Object.keys(cached.tools));
    return cached.tools;
  }

  try {
    console.log("Fetching tools from Composio for toolkits:", toolkitSlugs);

    // First, verify that the user has connected accounts for these toolkits
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: toolkitSlugs,
    });

    console.log("Connected accounts found:", {
      total: connectedAccounts.items?.length || 0,
      active:
        connectedAccounts.items?.filter((acc) => acc.status === "ACTIVE")
          .length || 0,
    });

    // Only fetch tools for toolkits that have active connections
    const activeToolkits =
      connectedAccounts.items
        ?.filter((acc) => acc.status === "ACTIVE")
        ?.map((acc) => acc.toolkit?.slug)
        ?.filter(Boolean) || [];

    if (activeToolkits.length === 0) {
      console.log("No active connections found for toolkits:", toolkitSlugs);
      // Cache empty result to avoid repeated failed calls
      toolsCache.set(cacheKey, { tools: {}, timestamp: Date.now() });
      return {};
    }

    console.log("Fetching tools for active toolkits:", activeToolkits);

    const tools = await composio.tools.get(userId, {
      toolkits: activeToolkits,
      limit: 5000, // Reduced limit to get only the most important tools
    });

    const result = tools || {};

    // Cache the result
    toolsCache.set(cacheKey, { tools: result, timestamp: Date.now() });

    console.log("Composio tools fetched successfully:", Object.keys(result));
    return result;
  } catch (error) {
    console.error("Failed to fetch Composio tools:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      userId,
      toolkitSlugs,
    });

    // Return cached result if available, even if expired
    if (cached) {
      console.log("Returning expired cached tools due to error");
      return cached.tools;
    }

    return {};
  }
}

// Function to clear cache when connections change
export function clearComposioToolsCache(userId?: string) {
  if (userId) {
    // Clear cache entries for specific user
    for (const key of toolsCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        toolsCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    toolsCache.clear();
  }
  console.log(
    "Composio tools cache cleared",
    userId ? `for user ${userId}` : "completely"
  );
}
