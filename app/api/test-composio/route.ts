import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import composio from "@/lib/services/composio";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Testing Composio API connection...");
    console.log("API Key present:", !!process.env.COMPOSIO_API_KEY);
    console.log("API Key length:", process.env.COMPOSIO_API_KEY?.length || 0);

    // Test basic API connectivity by fetching a simple toolkit
    const toolkit = await composio.toolkits.get("gmail");

    console.log("Gmail toolkit fetched successfully:", {
      name: toolkit.name,
      slug: toolkit.slug,
    });

    // Test connected accounts listing
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [session.user.id],
    });

    console.log("Connected accounts fetched:", {
      count: connectedAccounts.items?.length || 0,
    });

    return NextResponse.json({
      success: true,
      apiKeyPresent: !!process.env.COMPOSIO_API_KEY,
      apiKeyLength: process.env.COMPOSIO_API_KEY?.length || 0,
      userId: session.user.id,
      toolkit: {
        name: toolkit.name,
        slug: toolkit.slug,
      },
      connectedAccounts: {
        count: connectedAccounts.items?.length || 0,
        items:
          connectedAccounts.items?.map((acc) => ({
            id: acc.id,
            toolkit: acc.toolkit?.slug,
            status: acc.status,
          })) || [],
      },
    });
  } catch (error) {
    console.error("Composio API test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        apiKeyPresent: !!process.env.COMPOSIO_API_KEY,
        apiKeyLength: process.env.COMPOSIO_API_KEY?.length || 0,
      },
      { status: 500 }
    );
  }
}
