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
    const { toolkitSlug } = await request.json();

    if (!toolkitSlug) {
      return NextResponse.json(
        { error: "Toolkit slug is required" },
        { status: 400 }
      );
    }

    console.log(
      "Initiating connection for toolkit:",
      toolkitSlug,
      "user:",
      session.user.id
    );

    // Use the authorize method which handles auth config creation automatically
    const connectionRequest = await composio.toolkits.authorize(
      session.user.id,
      toolkitSlug
    );

    console.log("Connection request created:", {
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
    });

    return NextResponse.json({
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
    });
  } catch (error) {
    console.error("Failed to initiate connection:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
