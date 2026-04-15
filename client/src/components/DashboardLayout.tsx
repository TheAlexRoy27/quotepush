import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { BarChart2, Bell, BookOpen, Building2, CreditCard, FileText, LogOut, MessageSquare, PanelLeft, Settings, Shield, Users, Webhook, Zap } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: Users, label: "Leads", path: "/" },
  { icon: FileText, label: "SMS Template", path: "/template" },
  { icon: BookOpen, label: "Template Library", path: "/library" },
  { icon: Zap, label: "Drip Sequences", path: "/drip" },
  { icon: Webhook, label: "CRM Webhook", path: "/webhook" },
  { icon: BarChart2, label: "Analytics", path: "/analytics" },
  { icon: Building2, label: "Organization", path: "/organization" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const adminMenuItems = [
  { icon: Shield, label: "Admin Panel", path: "/admin" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const orgQuery = trpc.org.me.useQuery(undefined, {
    enabled: !!user,
    retry: false,
    // Don't throw on error FORBIDDEN just means the user needs onboarding
    throwOnError: false,
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Redirect to onboarding if user has no org do this before rendering children
  const needsOnboarding = user && !orgQuery.isLoading && orgQuery.data === null;

  useEffect(() => {
    if (needsOnboarding) {
      setLocation("/onboarding");
    }
  }, [needsOnboarding, setLocation]);

  // Block rendering children until we know whether the user has an org.
  // This prevents child pages from firing org-scoped queries before the redirect.
  if (loading || (user && orgQuery.isLoading) || needsOnboarding) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-12">
        <div className="flex flex-col items-center gap-8 w-full max-w-md">
          {/* Logo + headline */}
          <div className="flex flex-col items-center gap-5">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-favicon-hsV6w9Xq6ruPjUPpEDFYpV.webp"
              alt="QuotePush.io"
              className="h-28 w-28 rounded-3xl shadow-xl"
            />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                QuotePush.io
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
                Sign in to manage your leads and automate SMS outreach.
              </p>
            </div>
          </div>

          {/* Sign in button */}
          <div className="w-full">
            <Button
              onClick={() => { window.location.href = "/auth"; }}
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-xl transition-all"
            >
              Sign in with Phone or Email
            </Button>
          </div>

          {/* SMS is the future callout */}
          <div className="w-full rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-5 space-y-4 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-3xl">📱</span>
              <h2 className="text-sm font-semibold text-indigo-300">They won't answer. But they will text back.</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The average American ignores <strong className="text-foreground">76% of unknown calls</strong> but reads <strong className="text-foreground">98% of text messages</strong> within 3 minutes. Your leads aren't ghosting you. They're just waiting for the right medium.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg bg-background/40 px-3 py-2 text-center">
                <p className="text-lg font-bold text-indigo-400">98%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">SMS open rate</p>
              </div>
              <div className="rounded-lg bg-background/40 px-3 py-2 text-center">
                <p className="text-lg font-bold text-violet-400">3 min</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">avg read time</p>
              </div>
              <div className="rounded-lg bg-background/40 px-3 py-2 text-center">
                <p className="text-lg font-bold text-sky-400">45%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">reply rate</p>
              </div>
            </div>
            <p className="text-[11px] text-indigo-300/70 italic">
              QuotePush.io turns fresh leads into booked calls automatically, one text at a time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-muted-foreground/60 space-x-4">
          <a href="/terms" className="hover:text-muted-foreground transition-colors underline underline-offset-2">Terms of Service</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-muted-foreground transition-colors underline underline-offset-2">Privacy Policy</a>
          <span>·</span>
          <span>© {new Date().getFullYear()} QuotePush.io</span>
        </footer>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  const EMOJI_KEY = "greeting-emoji";
  const [greetingEmoji, setGreetingEmoji] = useState<"wave" | "callme">(() => {
    return (localStorage.getItem(EMOJI_KEY) as "wave" | "callme") ?? "wave";
  });
  // animKey increments on each toggle so React remounts the element and the animation plays once
  const [animKey, setAnimKey] = useState(0);

  const toggleEmoji = () => {
    setGreetingEmoji(prev => {
      const next = prev === "wave" ? "callme" : "wave";
      localStorage.setItem(EMOJI_KEY, next);
      return next;
    });
    setAnimKey(k => k + 1);
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-20 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <button
                  onClick={() => setLocation("/")}
                  className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                  aria-label="Go to home"
                >
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-favicon-hsV6w9Xq6ruPjUPpEDFYpV.webp"
                    alt="QuotePush.io"
                    className="h-11 w-11 rounded-xl shrink-0 object-cover shadow-sm"
                  />
                  <span className="font-semibold tracking-tight truncate text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    QuotePush.io
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setLocation("/")}
                  className="flex items-center justify-center w-full hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                  aria-label="Go to home"
                >
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-favicon-hsV6w9Xq6ruPjUPpEDFYpV.webp"
                    alt="QuotePush.io"
                    className="h-11 w-11 rounded-xl object-cover shadow-sm"
                  />
                </button>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            {/* Admin-only section */}
            {(user as any)?.role === "admin" && (
              <>
                <div className="px-4 py-2">
                  <div className="h-px bg-border" />
                </div>
                <SidebarMenu className="px-2 pb-1">
                  {adminMenuItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-10 transition-all font-normal text-violet-400 hover:text-violet-300`}
                        >
                          <item.icon className={`h-4 w-4`} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Sticky top bar always visible on desktop, also on mobile */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 sm:px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 gap-2">
          <div className="flex items-center gap-2 shrink-0">
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background shrink-0" />
            )}
            {isMobile && (
              <span className="text-sm font-medium tracking-tight text-foreground truncate max-w-[120px]">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            )}
          </div>
          {/* Notification Bell + greeting pushed to right */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            <NotificationBellButton />
            {/* Wave greeting */}
            <div className="flex items-center gap-1.5">
              <button
                key={animKey}
                onClick={toggleEmoji}
                className="text-xl select-none leading-none focus:outline-none hover:scale-110 transition-transform active:scale-95"
                title={greetingEmoji === "wave" ? "Switch to call me" : "Switch to wave"}
                style={greetingEmoji === "wave"
                  ? { display: 'inline-block', animation: 'wave 1.2s ease-in-out 1 forwards', transformOrigin: '70% 70%' }
                  : { display: 'inline-block', animation: 'jiggle 0.7s ease-in-out 1 forwards', transformOrigin: '50% 50%' }
                }
              >
                {greetingEmoji === "wave" ? "👋" : "🤙"}
              </button>
              <span className="text-sm font-medium text-foreground/80 hidden sm:inline">
                Hi, {user?.name?.split(' ')[0] ?? 'there'}!
              </span>
            </div>
          </div>
        </div>
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden">{children}</main>
      </SidebarInset>
    </>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────

function NotificationBellButton() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data } = trpc.notifications.unreadReplies.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const markRead = trpc.notifications.markLeadRead.useMutation({
    onSuccess: () => utils.notifications.unreadReplies.invalidate(),
  });

  const count = data?.count ?? 0;
  const items = data?.items ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleItemClick(leadId: number) {
    markRead.mutate({ leadId });
    setOpen(false);
    setLocation(`/?lead=${leadId}`);
  }

  function formatTime(d: Date | string) {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Unread Replies</span>
            {count > 0 && (
              <span className="text-xs text-muted-foreground">{count} new</span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Bell className="h-7 w-7 opacity-30" />
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-border">
              {items.map(item => (
                <li key={item.messageId}>
                  <button
                    onClick={() => handleItemClick(item.leadId)}
                    className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                        <span className="text-sm font-medium text-foreground truncate">{item.leadName}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(item.sentAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-4 line-clamp-2">{item.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
