"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useToolbar } from "@/components/composiotoolbar";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

type ToolkitMetadata = {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  categories?: Array<{ name: string; slug: string }>;
  isConnected?: boolean;
  connectionId?: string;
};

export function AppsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [toolkits, setToolkits] = React.useState<ToolkitMetadata[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const { data: session } = useSession();
  const { toast } = useToast();
  const { setEnabledToolkitsWithStatus } = useToolbar();
  const [connectingSlug, setConnectingSlug] = React.useState<string | null>(
    null
  );
  const [connectionPhase, setConnectionPhase] = React.useState<
    "connecting" | "checking" | null
  >(null);
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/toolkits", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch toolkits");
      const data = await res.json();
      const list: ToolkitMetadata[] = data.toolkits || [];
      setToolkits(list);
      // Update global toolbar status so chats see tools immediately
      setEnabledToolkitsWithStatus((prev) => {
        const map = new Map(prev);
        for (const t of list) {
          map.set(t.slug, !!t.isConnected);
        }
        return map;
      });
    } catch (err) {
      console.error(err);
      setFetchError("Failed to load tools. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // Refresh when session changes (user login/logout)
  React.useEffect(() => {
    if (open && session?.user?.id) {
      refresh();
    }
  }, [session?.user?.id, open, refresh]);

  const checkConnectionStatus = React.useCallback(
    async (connectionId: string, slug: string, name: string) => {
      setConnectionPhase("checking");
      try {
        const response = await fetch("/api/connections/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId }),
        });

        if (!response.ok) throw new Error("Failed to check connection status");
        const data = await response.json();

        switch (data.status) {
          case "ACTIVE":
            setConnectionPhase(null);
            setConnectingSlug(null);
            toast({
              title: "Connection successful",
              description: `${name} has been connected successfully.`,
            });
            refresh();
            break;
          case "FAILED":
            setConnectionPhase(null);
            setConnectingSlug(null);
            toast({
              title: "Connection failed",
              description: `Failed to connect ${name}. Please try again.`,
              variant: "destructive",
            });
            break;
          case "EXPIRED":
            setConnectionPhase(null);
            setConnectingSlug(null);
            toast({
              title: "Connection expired",
              description:
                "The connection request has expired. Please try again.",
              variant: "destructive",
            });
            break;
          case "INITIALIZING":
          case "INITIATED":
            pollingTimeoutRef.current = setTimeout(() => {
              checkConnectionStatus(connectionId, slug, name);
            }, 2000);
            break;
        }
      } catch (error) {
        console.error("Failed to check connection status:", error);
        setConnectionPhase(null);
        setConnectingSlug(null);
      }
    },
    [toast, refresh]
  );

  React.useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    };
  }, []);

  const handleConnect = async (toolkit: ToolkitMetadata) => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect tools.",
        variant: "destructive",
      });
      return;
    }

    try {
      setConnectingSlug(toolkit.slug);
      setConnectionPhase("connecting");

      console.log("Initiating connection for toolkit:", toolkit.slug);

      const res = await fetch("/api/connections/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkitSlug: toolkit.slug }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || "Failed to initiate connection");
      }

      const { redirectUrl, connectionId } = await res.json();

      console.log("Connection initiated:", { redirectUrl, connectionId });

      if (redirectUrl) {
        window.open(redirectUrl, "_blank");
        toast({
          title: "Authorization started",
          description: `Complete authorization for ${toolkit.name} in the opened window.`,
        });
        if (connectionId) {
          setTimeout(
            () =>
              checkConnectionStatus(connectionId, toolkit.slug, toolkit.name),
            3000
          );
        }
      } else {
        // For non-OAuth flows, the connection might be immediate
        toast({
          title: "Connection successful",
          description: `${toolkit.name} has been connected successfully.`,
        });
        setConnectionPhase(null);
        setConnectingSlug(null);
        refresh();
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Connection failed",
        description: `Failed to connect ${toolkit.name}.`,
        variant: "destructive",
      });
      setConnectingSlug(null);
      setConnectionPhase(null);
    }
  };

  const handleDisconnect = async (toolkit: ToolkitMetadata) => {
    if (!toolkit.connectionId) return;
    try {
      const res = await fetch(
        `/api/connections?connectionId=${toolkit.connectionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete connection");
      toast({
        title: "Disconnected",
        description: `${toolkit.name} has been disconnected.`,
      });
      refresh();
    } catch (e) {
      console.error(e);
      toast({
        title: "Deletion failed",
        description: `Failed to disconnect ${toolkit.name}.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Apps</DialogTitle>
          <DialogDescription>
            Connect toolkits for use in chat.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh] space-y-3 pr-2">
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 mr-2 animate-spin" /> Loading apps...
            </div>
          )}
          {fetchError && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive mb-2">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          )}
          {!loading &&
            !fetchError &&
            toolkits.map((t) => {
              return (
                <Card key={t.slug} className="w-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {t.logo ? (
                          <Image
                            src={t.logo}
                            alt={`${t.name} logo`}
                            width={20}
                            height={20}
                            className="size-5 object-contain flex-shrink-0"
                          />
                        ) : (
                          <div className="size-5 bg-muted rounded flex-shrink-0" />
                        )}
                        <CardTitle className="text-base truncate">
                          {t.name}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <CardDescription className="text-xs overflow-hidden text-ellipsis">
                      {t.description || `Connect to ${t.name}`}
                    </CardDescription>
                  </CardContent>
                  <CardFooter className="pt-0 gap-2 flex-wrap">
                    {connectingSlug === t.slug ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="w-full"
                      >
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {connectionPhase === "checking"
                          ? "Verifying connection..."
                          : "Connecting..."}
                      </Button>
                    ) : t.isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(t)}
                        className="w-full"
                      >
                        <Trash2 className="mr-2 size-4" /> Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleConnect(t)}
                        className="w-full"
                      >
                        <ExternalLink className="mr-2 size-4" /> Connect
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
