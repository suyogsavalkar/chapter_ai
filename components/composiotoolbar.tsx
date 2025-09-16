"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Dialog imports removed; connect opens directly
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  Loader2,
  X,
  LucideWrench,
  Check,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Map of toolkit slugs to their auth config environment variables
const TOOLKIT_AUTH_CONFIG: Record<string, string> = {
  GMAIL: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_GMAIL || "",
  GOOGLECALENDAR: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_GOOGLECALENDAR || "",
  SLACK: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_SLACK || "",
  TODOIST: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_TODOIST || "",
  EXA: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_EXA || "",
};

const TOOLBAR_COOKIE_NAME = "toolbar:state";
const TOOLBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const TOOLBAR_WIDTH = "20rem";
const TOOLBAR_WIDTH_MOBILE = "18rem";
const TOOLBAR_KEYBOARD_SHORTCUT = "t";

// Define toolkit metadata type for our UI needs
type ToolkitMetadata = {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  categories?: Array<{
    name: string;
    slug: string;
  }>;
  isConnected?: boolean;
  connectionId?: string;
};

interface ToolCardProps {
  toolkit: ToolkitMetadata;
  userId?: string;
  onConnectionDeleted?: () => void;
}

function ToolCard({ toolkit, userId, onConnectionDeleted }: ToolCardProps) {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<
    "idle" | "connecting" | "checking" | "active" | "failed" | "expired"
  >("idle");
  const [activeConnectionId, setActiveConnectionId] = React.useState<
    string | null
  >(null);
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Reset connection status when toolkit connection changes
  React.useEffect(() => {
    if (toolkit.isConnected) {
      setConnectionStatus("idle");
      setActiveConnectionId(null);
    }
  }, [toolkit.isConnected]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      setConnectionStatus("idle");
      setActiveConnectionId(null);
      // Clear any pending polling timeouts
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const checkConnectionStatus = React.useCallback(
    async (connectionId: string) => {
      setConnectionStatus("checking");
      try {
        const response = await fetch(
          `/api/connections/status?connectionId=${connectionId}`
        );

        if (!response.ok) {
          throw new Error("Failed to check connection status");
        }

        const data = await response.json();

        switch (data.status) {
          case "ACTIVE":
            setConnectionStatus("active");
            toast({
              title: "Connection successful",
              description: `${toolkit.name} has been connected successfully.`,
            });
            // Refresh the toolkit list to update connection status
            onConnectionDeleted?.();
            break;
          case "FAILED":
            setConnectionStatus("failed");
            toast({
              title: "Connection failed",
              description: `Failed to connect ${toolkit.name}. Please try again.`,
              variant: "destructive",
            });
            break;
          case "EXPIRED":
            setConnectionStatus("expired");
            toast({
              title: "Connection expired",
              description: `The connection request has expired. Please try again.`,
              variant: "destructive",
            });
            break;
          case "INITIALIZING":
          case "INITIATED":
            // Still in progress, check again after delay
            pollingTimeoutRef.current = setTimeout(() => {
              checkConnectionStatus(connectionId);
            }, 2000);
            break;
        }
      } catch (error) {
        console.error("Failed to check connection status:", error);
        setConnectionStatus("failed");
      }
    },
    [toolkit.name, onConnectionDeleted, toast, pollingTimeoutRef]
  );

  const handleConnect = async () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect tools.",
        variant: "destructive",
      });
      return;
    }

    const authConfigId = TOOLKIT_AUTH_CONFIG[toolkit.slug.toUpperCase()];

    if (!authConfigId) {
      toast({
        title: "Configuration error",
        description: `Auth configuration not found for ${toolkit.name}.`,
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus("connecting");
    try {
      const response = await fetch("/api/connections/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ authConfigId }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate connection");
      }

      const data = await response.json();
      const { redirectUrl, connectionId } = data;

      if (redirectUrl && connectionId) {
        // Store the connection ID for status tracking
        setActiveConnectionId(connectionId);

        // Open OAuth window
        window.open(redirectUrl, "_blank");

        // Keep tracking status while user completes auth

        toast({
          title: "Authorization started",
          description: `Complete the authorization in the opened window for ${toolkit.name}.`,
        });

        // Start checking connection status after a short delay
        setTimeout(() => checkConnectionStatus(connectionId), 3000);
      } else {
        toast({
          title: "Connection issue",
          description: "No authorization URL received. Please try again.",
          variant: "destructive",
        });
        setConnectionStatus("failed");
      }
    } catch (error) {
      console.error("Failed to initiate connection:", error);
      toast({
        title: "Connection failed",
        description: `Failed to connect ${toolkit.name}. Please try again.`,
        variant: "destructive",
      });
      setConnectionStatus("failed");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDelete = async () => {
    if (!toolkit.connectionId) {
      toast({
        title: "Error",
        description: "No connection found to delete.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/connections?connectionId=${toolkit.connectionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete connection");
      }

      toast({
        title: "Connection deleted",
        description: `${toolkit.name} has been disconnected successfully.`,
      });

      // Notify parent to refresh the toolkit list
      onConnectionDeleted?.();
    } catch (error) {
      console.error("Failed to delete connection:", error);
      toast({
        title: "Deletion failed",
        description: `Failed to disconnect ${toolkit.name}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {toolkit.logo ? (
              <Image
                src={toolkit.logo}
                alt={`${toolkit.name} logo`}
                width={20}
                height={20}
                className="size-5 object-contain"
              />
            ) : (
              <div className="size-5 bg-muted rounded" />
            )}
            <CardTitle className="text-base">{toolkit.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <CardDescription className="text-xs">
          {toolkit.description || `Connect to ${toolkit.name}`}
        </CardDescription>
      </CardContent>
      <CardFooter className="pt-0">
        {/* Show different UI based on connection status */}
        {connectionStatus === "connecting" ||
        connectionStatus === "checking" ? (
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1" disabled>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {connectionStatus === "connecting"
                ? "Connecting..."
                : "Verifying connection..."}
            </Button>
          </div>
        ) : connectionStatus === "active" || toolkit.isConnected ? (
          <div className="flex gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 cursor-default"
              disabled
            >
              <Check className="mr-2 size-4 text-green-600" />
              <span className="text-green-600">Connected</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3"
              title="Disconnect"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        ) : connectionStatus === "failed" || connectionStatus === "expired" ? (
          <div className="w-full space-y-2">
            <div className="text-xs text-destructive text-center">
              {connectionStatus === "failed"
                ? "Connection failed"
                : "Connection expired"}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setConnectionStatus("idle");
                handleConnect();
              }}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 size-4" />
                Connect
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export type EnabledToolkit = {
  slug: string;
  isConnected: boolean;
};

type ToolbarContext = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleToolbar: () => void;
  enabledTools: Set<string>;
  setEnabledTools: React.Dispatch<React.SetStateAction<Set<string>>>;
  enabledToolkitsWithStatus: Map<string, boolean>; // slug -> isConnected
  setEnabledToolkitsWithStatus: React.Dispatch<
    React.SetStateAction<Map<string, boolean>>
  >;
  refreshToolkitStatus: () => Promise<void>;
};

const ToolbarContext = React.createContext<ToolbarContext | null>(null);

export function useToolbar() {
  const context = React.useContext(ToolbarContext);
  if (!context) {
    throw new Error("useToolbar must be used within a ToolbarProvider.");
  }
  return context;
}

export function useToolbarState() {
  const { enabledTools, setEnabledTools, enabledToolkitsWithStatus } =
    useToolbar();
  return {
    state: {
      enabledTools,
      enabledToolkitsWithStatus,
    },
    setState: (
      updater: React.SetStateAction<{ enabledTools: Set<string> }>
    ) => {
      if (typeof updater === "function") {
        const newState = updater({ enabledTools });
        setEnabledTools(newState.enabledTools);
      } else {
        setEnabledTools(updater.enabledTools);
      }
    },
  };
}

export function useToolbarVisibility() {
  const { open, setOpen } = useToolbar();
  return { isOpen: open, setIsOpen: setOpen };
}

export function ToolbarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [enabledTools, setEnabledTools] = React.useState<Set<string>>(
    new Set()
  );
  const [enabledToolkitsWithStatus, setEnabledToolkitsWithStatus] =
    React.useState<Map<string, boolean>>(new Map());
  const { data: session } = useSession();
  const [lastUserId, setLastUserId] = React.useState<string | null>(null);

  // Persist enabled toolkits across refreshes
  const ENABLED_TOOLS_KEY = "toolkits:enabled";
  const TOOLKIT_STATUS_KEY = "toolkits:status";

  // Detect user session changes and reload preferences
  React.useEffect(() => {
    const currentUserId = session?.user?.id || null;

    // If user changed (login/logout), reload preferences
    if (lastUserId !== currentUserId) {
      setLastUserId(currentUserId);

      if (currentUserId) {
        // User logged in or switched - reload from server
        (async () => {
          try {
            const res = await fetch("/api/user-toolkits", {
              cache: "no-store",
            });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.toolkits)) {
                const serverEnabledTools = new Set<string>(data.toolkits);
                setEnabledTools(serverEnabledTools);

                // Update localStorage to match server
                try {
                  localStorage.setItem(
                    ENABLED_TOOLS_KEY,
                    JSON.stringify(Array.from(serverEnabledTools))
                  );
                } catch {}
              }
            }
          } catch (error) {
            console.warn(
              "Failed to reload user toolkit preferences after session change"
            );
          }
        })();
      } else {
        // User logged out - clear preferences
        setEnabledTools(new Set());
        setEnabledToolkitsWithStatus(new Map());
        try {
          localStorage.removeItem(ENABLED_TOOLS_KEY);
          localStorage.removeItem(TOOLKIT_STATUS_KEY);
        } catch {}
      }
    }
  }, [session?.user?.id, lastUserId]);

  // Load from localStorage and server on first mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let localEnabledTools: Set<string> = new Set();
    let localToolkitStatus: Map<string, boolean> = new Map();

    // Load from localStorage first
    try {
      const raw = localStorage.getItem(ENABLED_TOOLS_KEY);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        localEnabledTools = new Set(arr);
      }
    } catch (e) {
      console.warn("Failed to load enabled toolkits from storage");
    }

    try {
      const rawStatus = localStorage.getItem(TOOLKIT_STATUS_KEY);
      if (rawStatus) {
        const obj = JSON.parse(rawStatus) as Record<string, boolean>;
        localToolkitStatus = new Map<string, boolean>();
        Object.entries(obj).forEach(([k, v]) => localToolkitStatus.set(k, !!v));
      }
    } catch (e) {
      console.warn("Failed to load toolkit status from storage");
    }

    // Set local data immediately for better UX
    setEnabledTools(localEnabledTools);
    setEnabledToolkitsWithStatus(localToolkitStatus);

    // Then hydrate from server preferences (this will override local if different)
    (async () => {
      try {
        const res = await fetch("/api/user-toolkits", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.toolkits)) {
            const serverEnabledTools = new Set<string>(data.toolkits);

            // Merge server data with local data, preferring server for consistency
            setEnabledTools(serverEnabledTools);

            // Update localStorage to match server
            try {
              localStorage.setItem(
                ENABLED_TOOLS_KEY,
                JSON.stringify(Array.from(serverEnabledTools))
              );
            } catch {}
          }
        }
      } catch (error) {
        console.warn(
          "Failed to load server toolkit preferences, using local data"
        );
      }
    })();
  }, []);

  // Function to refresh toolkit status from server
  const refreshToolkitStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/toolkits", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: Array<{ slug: string; isConnected?: boolean }> =
        data.toolkits || [];
      setEnabledToolkitsWithStatus((prev) => {
        const map = new Map(prev);
        for (const t of list) map.set(t.slug, !!t.isConnected);
        return map;
      });
      console.log("Toolbar status refreshed from server");
    } catch (error) {
      console.warn("Failed to refresh toolkit status:", error);
    }
  }, []);

  // Seed connection status from server on mount and when user changes
  React.useEffect(() => {
    let cancelled = false;
    async function seedStatus() {
      try {
        const res = await fetch("/api/toolkits", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list: Array<{ slug: string; isConnected?: boolean }> =
          data.toolkits || [];
        setEnabledToolkitsWithStatus((prev) => {
          const map = new Map(prev);
          for (const t of list) map.set(t.slug, !!t.isConnected);
          return map;
        });
      } catch (_) {
        // ignore; optional enrichment only
      }
    }
    seedStatus();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Save to localStorage on changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        ENABLED_TOOLS_KEY,
        JSON.stringify(Array.from(enabledTools))
      );
    } catch {}
    // Persist to server
    (async () => {
      try {
        await fetch("/api/user-toolkits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: Array.from(enabledTools) }),
        });
      } catch {}
    })();
  }, [enabledTools]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const obj: Record<string, boolean> = {};
      enabledToolkitsWithStatus.forEach((v, k) => (obj[k] = v));
      localStorage.setItem(TOOLKIT_STATUS_KEY, JSON.stringify(obj));
    } catch {}
  }, [enabledToolkitsWithStatus]);

  // Derive enabled tools from connected status: no manual toggles
  React.useEffect(() => {
    setEnabledTools(() => {
      const connected = new Set<string>();
      enabledToolkitsWithStatus.forEach((v, k) => {
        if (v) connected.add(k);
      });
      return connected;
    });
  }, [enabledToolkitsWithStatus, setEnabledTools]);

  // This is the internal state of the toolbar.
  // Read from cookie if available, otherwise default to open
  const getInitialState = () => {
    if (typeof window === "undefined") return true; // Default to open on server
    const match = document.cookie.match(
      new RegExp(`(^| )${TOOLBAR_COOKIE_NAME}=([^;]+)`)
    );
    return match ? match[2] === "true" : true; // Default to open if no cookie
  };

  const [_open, _setOpen] = React.useState(getInitialState);
  const open = _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      _setOpen(openState);

      // This sets the cookie to keep the toolbar state.
      document.cookie = `${TOOLBAR_COOKIE_NAME}=${openState}; path=/; max-age=${TOOLBAR_COOKIE_MAX_AGE}`;
    },
    [open]
  );

  // Helper to toggle the toolbar.
  const toggleToolbar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the toolbar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === TOOLBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleToolbar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleToolbar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<ToolbarContext>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleToolbar,
      enabledTools,
      setEnabledTools,
      enabledToolkitsWithStatus,
      setEnabledToolkitsWithStatus,
      refreshToolkitStatus,
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleToolbar,
      enabledTools,
      setEnabledTools,
      enabledToolkitsWithStatus,
      setEnabledToolkitsWithStatus,
      refreshToolkitStatus,
    ]
  );

  return (
    <ToolbarContext.Provider value={contextValue}>
      {children}
    </ToolbarContext.Provider>
  );
}

function ToolbarDesktop() {
  const { data: session } = useSession();
  const { state, enabledToolkitsWithStatus, setEnabledToolkitsWithStatus } =
    useToolbar();
  const [toolkits, setToolkits] = React.useState<ToolkitMetadata[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchToolkits = React.useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/toolkits");

      if (!response.ok) {
        throw new Error("Failed to fetch toolkits");
      }

      const { toolkits } = await response.json();
      setToolkits(toolkits);

      // Update connection status for all toolkits and auto-enable connected ones
      setEnabledToolkitsWithStatus((prev) => {
        const newMap = new Map(prev);
        toolkits.forEach((toolkit: ToolkitMetadata) => {
          newMap.set(toolkit.slug, toolkit.isConnected || false);
        });
        return newMap;
      });
      // No manual toggles: enabled tools equal connected toolkits
      // Persist handled by provider effect
    } catch (error) {
      console.error("Failed to fetch toolkits:", error);
      setFetchError("Failed to load tools. Please try again.");
      // Retry after 3 seconds
      setTimeout(() => setFetchError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [setEnabledToolkitsWithStatus]);

  React.useEffect(() => {
    fetchToolkits();
  }, [fetchToolkits]);

  // No handleToggle: tools are enabled when connected

  return (
    <div
      className="group peer hidden md:block text-sidebar-foreground"
      data-state={state}
      data-side="right"
    >
      {/* This is what handles the toolbar gap on desktop */}
      <div
        className={cn(
          "duration-200 relative h-svh bg-transparent transition-[width] ease-linear",
          state === "collapsed" && "w-0"
        )}
        style={
          {
            "--toolbar-width": TOOLBAR_WIDTH,
            width: state === "collapsed" ? "0" : TOOLBAR_WIDTH,
          } as React.CSSProperties
        }
      />
      <div
        className={cn(
          "duration-200 fixed inset-y-0 z-10 hidden h-svh transition-[right,width] ease-linear md:flex",
          "right-0",
          state === "collapsed"
            ? "right-[calc(var(--toolbar-width)*-1)] pointer-events-none"
            : "right-0",
          "border-l border-sidebar-border bg-sidebar"
        )}
        style={
          {
            "--toolbar-width": TOOLBAR_WIDTH,
            width: TOOLBAR_WIDTH,
          } as React.CSSProperties
        }
      >
        <div className="flex size-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <LucideWrench className="size-4" />
              <h2 className="text-base font-semibold">Apps</h2>
            </div>
            <ToolbarTrigger />
          </div>

          {/* Content - using overflow-hidden on parent and overflow-y-auto here */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto overscroll-contain p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : fetchError ? (
                <div className="text-center py-8">
                  <p className="text-sm text-destructive mb-2">{fetchError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Connect apps to enhance your chat capabilities
                    </p>
                  </div>
                  {toolkits.map((toolkit) => (
                    <ToolCard
                      key={toolkit.slug}
                      toolkit={toolkit}
                      userId={session?.user?.id}
                      onConnectionDeleted={fetchToolkits}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarMobile() {
  const { data: session } = useSession();
  const {
    openMobile,
    setOpenMobile,
    enabledToolkitsWithStatus,
    setEnabledToolkitsWithStatus,
  } = useToolbar();
  const [toolkits, setToolkits] = React.useState<ToolkitMetadata[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchToolkits = React.useCallback(async () => {
    if (!openMobile) return;

    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/toolkits");

      if (!response.ok) {
        throw new Error("Failed to fetch toolkits");
      }

      const { toolkits } = await response.json();
      setToolkits(toolkits);

      // Update connection status for all toolkits
      setEnabledToolkitsWithStatus((prev) => {
        const newMap = new Map(prev);
        toolkits.forEach((toolkit: ToolkitMetadata) => {
          newMap.set(toolkit.slug, toolkit.isConnected || false);
        });
        return newMap;
      });
    } catch (error) {
      console.error("Failed to fetch toolkits:", error);
      setFetchError("Failed to load tools. Please try again.");
      // Retry after 3 seconds
      setTimeout(() => setFetchError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [openMobile, setEnabledToolkitsWithStatus]);

  React.useEffect(() => {
    fetchToolkits();
  }, [fetchToolkits]);

  // No toggles in mobile toolbar

  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent
        className="w-[--toolbar-width] p-0"
        style={
          {
            "--toolbar-width": TOOLBAR_WIDTH_MOBILE,
          } as React.CSSProperties
        }
        side="right"
      >
        <div className="flex size-full flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              <LucideWrench className="size-4" />
              <SheetTitle className="text-base">Apps</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto overscroll-contain p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : fetchError ? (
                <div className="text-center py-8">
                  <p className="text-sm text-destructive mb-2">{fetchError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Connect apps to enhance your chat capabilities
                    </p>
                  </div>
                  {toolkits.map((toolkit) => (
                    <ToolCard
                      key={toolkit.slug}
                      toolkit={toolkit}
                      userId={session?.user?.id}
                      onConnectionDeleted={fetchToolkits}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ToolBar() {
  const { isMobile } = useToolbar();

  if (isMobile) {
    return <ToolbarMobile />;
  }

  return <ToolbarDesktop />;
}

export function ToolbarTrigger() {
  const { toggleToolbar } = useToolbar();

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleToolbar}
            className="size-7"
            aria-label="Toggle Tools"
          >
            <X className="size-4" />
            <span className="sr-only">Toggle apps</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" align="center">
          Close (⌘T)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ToolBarTrigger() {
  const { toggleToolbar, open, enabledToolkitsWithStatus } = useToolbar();
  const connectedCount = Array.from(enabledToolkitsWithStatus.values()).filter(
    Boolean
  ).length;
  const hasEnabledTools = connectedCount > 0;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={hasEnabledTools ? "default" : "outline"}
            onClick={toggleToolbar}
            className={cn(
              "h-10 px-4 order-5 md:ml-auto relative flex items-center gap-2",
              hasEnabledTools && "animate-pulse"
            )}
            aria-label="Toggle Toolkits"
          >
            {open ? (
              <X className="size-5" />
            ) : (
              <LucideWrench className="size-5" />
            )}
            <span className="font-medium">Toolkits</span>
            {hasEnabledTools && !open && (
              <span className="absolute -top-1 -right-1 size-3 bg-green-500 rounded-full" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" align="center">
          {open
            ? "Close"
            : hasEnabledTools
            ? `Open (${connectedCount} active)`
            : "Open"}{" "}
          (⌘T)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Rail component for easier opening when collapsed
export function ToolbarRail() {
  const { toggleToolbar, state } = useToolbar();

  if (state === "expanded") return null;

  return (
    <button
      type="button"
      aria-label="Toggle Toolbar"
      tabIndex={-1}
      onClick={toggleToolbar}
      title="Toggle Toolbar"
      className={cn(
        "absolute inset-y-0 right-0 z-20 hidden w-4 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex cursor-w-resize",
        "hover:bg-sidebar/20"
      )}
    />
  );
}

export function getEnabledToolkitSlugs(): string[] {
  // Get enabled toolkits from localStorage as fallback
  try {
    const saved = localStorage.getItem("toolkits:enabled");
    if (saved) {
      const slugs = JSON.parse(saved) as string[];
      return slugs;
    }
  } catch (e) {
    console.warn("Failed to get enabled toolkit slugs from storage");
  }
  return [];
}
