import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import composio from "@/lib/services/composio";
import { ChatSDKError } from "@/lib/errors";

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

    console.log("Disconnecting connection:", connectionId);

    // Delete the connected account
    await composio.connectedAccounts.delete(connectionId);

    console.log("Connection disconnected successfully");

    return NextResponse.json({
      success: true,
      message: "Connection disconnected successfully",
    });
  } catch (error) {
    console.error("Failed to disconnect:", error);
    return NextResponse.json(
      {
        error: "Failed to disconnect",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
