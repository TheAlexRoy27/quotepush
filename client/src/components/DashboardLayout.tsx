import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { BarChart2, Bell, BookOpen, Bot, Building2, CalendarDays, Gift, LogOut, MessageSquare, Moon, PanelLeft, Palette, PhoneCall, Settings, Shield, Sun, TrendingUp, Users, Zap } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: TrendingUp, label: "My Dashboard", path: "/my-dashboard" },
  { icon: Bot, label: "AI Bot", path: "/bot" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: CalendarDays, label: "Bookings", path: "/bookings" },
  { icon: BookOpen, label: "Template Library", path: "/library" },
  { icon: Zap, label: "Drip Sequences", path: "/drip" },
  { icon: Building2, label: "Organization", path: "/organization" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: PhoneCall, label: "Voice Calls", path: "/calls", badge: "Soon" },
  { icon: Gift, label: "Partner Referrals", path: "/referrals" },
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

  // Status indicator queries — lightweight, stale-while-revalidate
  const botConfigQuery = trpc.bot.getConfig.useQuery(undefined, { enabled: !!user, staleTime: 30_000 });
  const twilioConfigQuery = trpc.org.getTwilioConfig.useQuery(undefined, { enabled: !!user, staleTime: 30_000 });
  const dripListQuery = trpc.drip.listSequences.useQuery(undefined, { enabled: !!user, staleTime: 30_000 });

  const botStatus = useMemo(() => {
    if (!botConfigQuery.data) return "off";
    return botConfigQuery.data.enabled ? "on" : "off";
  }, [botConfigQuery.data]);

  const twilioStatus = useMemo(() => {
    if (!twilioConfigQuery.data) return "off";
    return twilioConfigQuery.data.accountSid ? "on" : "off";
  }, [twilioConfigQuery.data]);

  const dripStatus = useMemo(() => {
    if (!dripListQuery.data) return "off";
    return dripListQuery.data.some((d: any) => d.isActive) ? "on" : "off";
  }, [dripListQuery.data]);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-5 py-12 relative">
        {/* Floating Request a Demo button */}
        <button
          data-cal-namespace="demo"
          data-cal-link="quotepush/demo"
          data-cal-config='{"layout":"month_view"}'
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Request a Demo
        </button>
        <div className="flex flex-col items-center gap-8 w-full max-w-md">
          {/* Logo + headline */}
          <div className="flex flex-col items-center gap-5">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-logo-v3-dWJJLeWcheDRJYCh4pGcdC.webp"
              alt="QuotePush.io"
              className="h-36 w-36 drop-shadow-xl"
            />
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                QuotePush.io
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground max-w-xs">
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
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">📱</span>
              <h2 className="text-sm font-semibold leading-snug text-indigo-300">They won't answer. But they will text back.</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The average American ignores <strong className="text-foreground">76% of unknown calls</strong> but reads <strong className="text-foreground">98% of text messages</strong> within 3 minutes. Your leads aren't ghosting you, they just can't talk right now.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg bg-background/40 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-indigo-400">98%</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">SMS open rate</p>
              </div>
              <div className="rounded-lg bg-background/40 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-violet-400">3 min</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">avg read time</p>
              </div>
              <div className="rounded-lg bg-background/40 px-3 py-2.5 text-center">
                <p className="text-xl font-bold text-sky-400">45%</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">reply rate</p>
              </div>
            </div>
            <p className="text-xs text-indigo-300/70 italic leading-relaxed">
              QuotePush.io turns fresh leads into booked calls.<br />One text at a time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs leading-relaxed text-muted-foreground/60 space-x-3">
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
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} customLogoUrl={orgQuery.data?.org?.customLogoUrl ?? null} lightLogoUrl={orgQuery.data?.org?.lightLogoUrl ?? null} botStatus={botStatus} twilioStatus={twilioStatus} dripStatus={dripStatus}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  customLogoUrl: string | null;
  lightLogoUrl: string | null;
  botStatus: "on" | "off";
  twilioStatus: "on" | "off";
  dripStatus: "on" | "off";
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  customLogoUrl,
  lightLogoUrl,
  botStatus,
  twilioStatus,
  dripStatus,
}: DashboardLayoutContentProps) {
  const statusMap: Record<string, "on" | "off"> = {
    "/bot": botStatus,
    "/settings": twilioStatus,
    "/drip": dripStatus,
  };
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const ACCENT_COLORS = [
    { label: "Indigo", value: "#6366f1" },
    { label: "Violet", value: "#8b5cf6" },
    { label: "Rose", value: "#f43f5e" },
    { label: "Orange", value: "#f97316" },
    { label: "Amber", value: "#f59e0b" },
    { label: "Emerald", value: "#10b981" },
    { label: "Cyan", value: "#06b6d4" },
    { label: "Sky", value: "#0ea5e9" },
    { label: "Pink", value: "#ec4899" },
    { label: "Slate", value: "#64748b" },
  ];
  const userColor = (user as any)?.accentColor ?? "#6366f1";
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpenMobile, isMobile: sidebarIsMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    if (sidebarIsMobile) {
      setOpenMobile(false);
    }
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  const EMOJI_KEY = "greeting-emoji";
  const [greetingEmoji, setGreetingEmoji] = useState<"wave" | "callme">(() => {
    return (localStorage.getItem(EMOJI_KEY) as "wave" | "callme") ?? "callme";
  });
  // animKey increments on each toggle so React remounts the element and the animation plays once
  const [animKey, setAnimKey] = useState(0);

  // Auto-vibrate on mount
  useEffect(() => {
    setAnimKey(k => k + 1);
  }, []);

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
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-logo-v3-dWJJLeWcheDRJYCh4pGcdC.webp"
                    alt="QuotePush.io"
                    className="h-12 w-12 shrink-0 object-contain"
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
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-logo-v3-dWJJLeWcheDRJYCh4pGcdC.webp"
                    alt="QuotePush.io"
                    className="h-12 w-12 object-contain"
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
                      <span className="flex-1">{item.label}</span>
                      {(item as any).badge && (
                        <span className="text-[9px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded px-1 py-0.5 leading-none shrink-0">{(item as any).badge}</span>
                      )}
                      {statusMap[item.path] !== undefined && (
                        <span
                          title={statusMap[item.path] === "on" ? "Active" : "Not configured"}
                          className={`h-2 w-2 rounded-full shrink-0 transition-colors ${
                            statusMap[item.path] === "on"
                              ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]"
                              : "bg-zinc-500"
                          }`}
                        />
                      )}
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
                  <Avatar className="h-9 w-9 border-2 shrink-0" style={{ borderColor: userColor }}>
                    <AvatarFallback className="text-xs font-bold text-white" style={{ backgroundColor: userColor }}>
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setShowColorPicker(p => !p)}
                  className="cursor-pointer"
                >
                  <Palette className="mr-2 h-4 w-4" />
                  <span>My Color</span>
                  <span className="ml-auto h-4 w-4 rounded-full border" style={{ backgroundColor: userColor }} />
                </DropdownMenuItem>
                {showColorPicker && (
                  <div className="px-2 pb-2">
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {ACCENT_COLORS.map(c => (
                        <button
                          key={c.value}
                          title={c.label}
                          onClick={() => {
                            updateProfile.mutate({ accentColor: c.value });
                            setShowColorPicker(false);
                          }}
                          className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
                          style={{
                            backgroundColor: c.value,
                            borderColor: userColor === c.value ? "white" : "transparent",
                            boxShadow: userColor === c.value ? `0 0 0 2px ${c.value}` : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <DropdownMenuSeparator />
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
              <span className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[140px]">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            )}
          </div>
          {/* Custom org logo centered in top bar */}
          {customLogoUrl && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
              <img
                src={theme === "light" && lightLogoUrl ? lightLogoUrl : customLogoUrl}
                alt="Organization logo"
                className="h-12 max-w-[220px] object-contain"
              />
            </div>
          )}
          {/* Notification Bell + greeting pushed to right */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
            <ThemeToggleButton />
            <NotificationBellButton />
            {/* Greeting - always visible */}
            <div className="flex items-center gap-1.5">
              <button
                key={animKey}
                onClick={toggleEmoji}
                className="text-lg sm:text-xl select-none leading-none focus:outline-none hover:scale-110 transition-transform active:scale-95"
                title={greetingEmoji === "wave" ? "Switch to call me" : "Switch to wave"}
                style={greetingEmoji === "wave"
                  ? { display: 'inline-block', animation: 'wave 1.2s ease-in-out 1 forwards', transformOrigin: '70% 70%' }
                  : { display: 'inline-block', animation: 'vibrate 1s ease-in-out 1 forwards', transformOrigin: '50% 50%' }
                }
              >
                {greetingEmoji === "wave" ? "👋🏼" : "🤙🏼"}
              </button>
              <span className="text-sm font-semibold text-foreground">
                Hi, {user?.name?.split(' ')[0] ?? 'there'}!
              </span>
            </div>
          </div>
        </div>
        <main className="flex-1 p-4 sm:p-5 md:p-6 overflow-x-hidden">{children}</main>
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

// --- Theme Toggle Button ---
function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  if (!toggleTheme) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-lg"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
