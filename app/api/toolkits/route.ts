import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import composio from "@/lib/services/composio";
import { ChatSDKError } from "@/lib/errors";

// Popular toolkits to display - these should have auth configs set up in your Composio dashboard
const SUPPORTED_TOOLKITS = [
  "gmail",
  "googlecalendar",
  "slack",
  "todoist",
  "github",
  "notion",
  "linear",
];

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    console.log("Fetching toolkits for user:", session.user.id);

    // Fetch connected accounts for the user
    const connectedToolkitMap = new Map<string, string>(); // slug -> connectionId

    try {
      const connectedAccounts = await composio.connectedAccounts.list({
        userIds: [session.user.id],
      });

      console.log("Connected accounts response:", {
        itemsCount: connectedAccounts.items?.length || 0,
        items: connectedAccounts.items?.map((acc) => ({
          id: acc.id,
          toolkit: acc.toolkit?.slug,
          status: acc.status,
        })),
      });

      // Extract toolkit slugs and connection IDs from connected accounts
      if (connectedAccounts.items) {
        connectedAccounts.items.forEach((account) => {
          if (
            account.toolkit?.slug &&
            account.id &&
            account.status === "ACTIVE"
          ) {
            const slug = account.toolkit.slug.toLowerCase();
            connectedToolkitMap.set(slug, account.id);
          }
        });
      }
    } catch (error) {
      console.error("Failed to fetch connected accounts:", error);
      // Continue without connection status if this fails
    }

    // Fetch toolkit information
    const toolkitPromises = SUPPORTED_TOOLKITS.map(async (slug) => {
      try {
        const toolkit = await composio.toolkits.get(slug);
        const connectionId = connectedToolkitMap.get(slug.toLowerCase());

        return {
          name: toolkit.name,
          slug: slug.toLowerCase(),
          description:
            toolkit.meta?.description || `Connect your ${toolkit.name} account`,
          logo: toolkit.meta?.logo,
          categories: toolkit.meta?.categories,
          isConnected: !!connectionId,
          connectionId: connectionId || undefined,
        };
      } catch (error) {
        console.error(`Failed to fetch toolkit ${slug}:`, error);
        // Return a basic toolkit info even if fetch fails
        return {
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          slug: slug.toLowerCase(),
          description: `Connect your ${slug} account`,
          logo: null,
          categories: [],
          isConnected: false,
          connectionId: undefined,
        };
      }
    });

    const toolkits = await Promise.all(toolkitPromises);

    console.log("Final toolkits response:", {
      count: toolkits.length,
      connected: toolkits.filter((t) => t.isConnected).length,
      toolkits: toolkits.map((t) => ({
        slug: t.slug,
        isConnected: t.isConnected,
      })),
    });

    return NextResponse.json({ toolkits });
  } catch (error) {
    console.error("Failed to fetch toolkits:", error);
    return NextResponse.json(
      { error: "Failed to fetch toolkits" },
      { status: 500 }
    );
  }
}
