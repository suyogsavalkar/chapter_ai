"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { guestRegex } from "@/lib/constants";

/**
 * Component to monitor user session changes and provide feedback about data persistence
 */
export function UserDataStatus() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [lastUserId, setLastUserId] = React.useState<string | null>(null);
  const [hasShownWelcomeBack, setHasShownWelcomeBack] = React.useState(false);

  React.useEffect(() => {
    if (status === "loading") return;

    const currentUserId = session?.user?.id || null;
    const isGuest = guestRegex.test(session?.user?.email ?? "");

    // User session changed
    if (lastUserId !== currentUserId) {
      setLastUserId(currentUserId);

      if (currentUserId && !isGuest && lastUserId && !hasShownWelcomeBack) {
        // User logged back in (not first load)
        toast({
          title: "Welcome back!",
          description:
            "Your chat history and app connections have been restored.",
        });
        setHasShownWelcomeBack(true);
      } else if (!currentUserId && lastUserId) {
        // User logged out
        toast({
          title: "Signed out",
          description:
            "Your data is safely stored and will be restored when you sign back in.",
        });
      } else if (currentUserId && isGuest) {
        // Guest user
        toast({
          title: "Guest mode",
          description:
            "Sign in with Google to save your chat history and app connections.",
          variant: "default",
        });
      }
    }
  }, [
    session?.user?.id,
    session?.user?.email,
    status,
    lastUserId,
    hasShownWelcomeBack,
    toast,
  ]);

  // Reset welcome back flag when user changes
  React.useEffect(() => {
    if (session?.user?.id !== lastUserId) {
      setHasShownWelcomeBack(false);
    }
  }, [session?.user?.id, lastUserId]);

  return null; // This component doesn't render anything
}
