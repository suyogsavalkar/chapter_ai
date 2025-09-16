import { auth } from "@/app/(auth)/auth";
import { getComposioTools } from "@/lib/ai/tools/composio";
import composio from "@/lib/services/composio";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const testToolkits = ["gmail", "googlecalendar", "slack", "googletasks", "exa"];

    // Check connected accounts first
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
    });

    // Test tools fetching
    const tools = await getComposioTools(userId, testToolkits);

    return NextResponse.json({
      userId,
      testedToolkits: testToolkits,
      connectedAccounts: {
        total: connectedAccounts.items?.length || 0,
        active:
          connectedAccounts.items?.filter((acc) => acc.status === "ACTIVE")
            .length || 0,
        accounts:
          connectedAccounts.items?.map((acc) => ({
            id: acc.id,
            toolkit: acc.toolkit?.slug,
            status: acc.status,
          })) || [],
      },
      tools: {
        found: Object.keys(tools || {}),
        count: Object.keys(tools || {}).length,
        sample: Object.keys(tools || {}).slice(0, 5),
      },
      composioApiKey: process.env.COMPOSIO_API_KEY ? "Present" : "Missing",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to debug tools",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
