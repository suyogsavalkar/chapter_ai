import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import composio from "@/lib/services/composio";
import { ChatSDKError } from "@/lib/errors";
import { clearComposioToolsCache } from "@/lib/ai/tools/composio";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    console.log("Checking connection status for:", connectionId);

    // Get the connected account details
    const connectedAccount = await composio.connectedAccounts.get(connectionId);

    console.log("Connection status:", {
      id: connectedAccount.id,
      status: connectedAccount.status,
      toolkit: connectedAccount.toolkit?.slug,
    });

    // Clear cache when connection becomes active to ensure fresh tools
    if (connectedAccount.status === "ACTIVE") {
      clearComposioToolsCache(session.user.id);
    }

    return NextResponse.json({
      id: connectedAccount.id,
      status: connectedAccount.status,
      isActive: connectedAccount.status === "ACTIVE",
      toolkit: connectedAccount.toolkit,
    });
  } catch (error) {
    console.error("Failed to check connection status:", error);
    return NextResponse.json(
      {
        error: "Failed to check connection status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
