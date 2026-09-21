// apps/web/components/ui/bottom-menu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useGlobalContext } from "@/components/globalContext/GlobalContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Bell,
  Grid3X3,
  ClipboardList,
  User,
  Home,
  Users,
  UserRound,
  UserPlus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BottomMenuProps {
  className?: string;
  isAdmin?: boolean;
  onOpenUserDrawer: () => void;
}

export function BottomMenu({
  className,
  isAdmin = false,
  onOpenUserDrawer,
}: BottomMenuProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, width: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { setIsNavigating, isNavigating, isBottomMenuLocked } = useGlobalContext();
  const [navigatingToPath, setNavigatingToPath] = useState<string | null>(null);
  const { unreadCount: unreadNotificationCount } = useUnreadNotificationCount();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [messagePopoverOpen, setMessagePopoverOpen] = useState(false);
  const messagePopoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dashboardPopoverOpen, setDashboardPopoverOpen] = useState(false);
  const dashboardPopoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll visibility logic
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show when scrolling up or at the top
      // Adding a small buffer to prevent jitter
      if (currentScrollY < lastScrollY.current - 5 || currentScrollY < 50) {
        setIsVisible(true);
      }
      // Hide when scrolling down
      else if (
        currentScrollY > lastScrollY.current + 5 &&
        currentScrollY > 50
      ) {
        setIsVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch unread messages count
  useEffect(() => {
    if (!session?.user?.id) return;

    let isFetching = false;

    const fetchUnreadMessageCount = async () => {
      if (isFetching) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      )
        return;
      isFetching = true;
      try {
        const res = await axios.get(
          `/api/messages/unread-count/${session.user.id}`,
        );
        setUnreadMessageCount(res.data.unreadCount || 0);
      } catch (error) {
        console.error("Error fetching unread message count:", error);
      } finally {
        isFetching = false;
      }
    };

    fetchUnreadMessageCount();

    const interval = setInterval(fetchUnreadMessageCount, 120000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadMessageCount();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session?.user?.id]);

  // Define menu items with their respective routes
  const menuItems = [
    {
      icon: Home,
      label: "Home",
      path: "/home",
    },
    {
      icon: MessageCircle,
      label: `Messages${unreadMessageCount > 0 ? ` (${unreadMessageCount})` : ""}`,
      path: "/messages",
      badge: unreadMessageCount > 0 ? unreadMessageCount : null,
    },
    {
      icon: Bell,
      label: `Notifications${unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ""}`,
      path: "/notifications",
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : null,
    },
    {
      icon: Grid3X3,
      label: "Patient Dashboard",
      path: "/patient-dashboard",
    },
    ...(isAdmin
      ? [
          {
            icon: ClipboardList,
            label: "Admin Dashboard",
            path: "/admin",
          },
        ]
      : []),
    {
      icon: User,
      label: "Profile",
      path: "/my-profile",
    },
  ];

  // Find the active index based on the current pathname
  const activeIndex = menuItems.findIndex(
    (item) => pathname === item.path || pathname.startsWith(item.path + "/"),
  );

  // Handle message popover hover
  const handleMessageMouseEnter = () => {
    if (messagePopoverTimeoutRef.current) {
      clearTimeout(messagePopoverTimeoutRef.current);
    }
    messagePopoverTimeoutRef.current = setTimeout(() => {
      setMessagePopoverOpen(true);
    }, 200);
  };

  const handleMessageMouseLeave = () => {
    if (messagePopoverTimeoutRef.current) {
      clearTimeout(messagePopoverTimeoutRef.current);
    }
    messagePopoverTimeoutRef.current = setTimeout(() => {
      setMessagePopoverOpen(false);
    }, 150);
  };

  const handleMessageNavigation = (tab: "staff" | "patient") => {
    setMessagePopoverOpen(false);
    setIsNavigating(true);
    setNavigatingToPath("/messages");
    router.push(`/messages?tab=${tab}`);
  };

  // Handle dashboard popover hover
  const handleDashboardMouseEnter = () => {
    if (dashboardPopoverTimeoutRef.current) {
      clearTimeout(dashboardPopoverTimeoutRef.current);
    }
    dashboardPopoverTimeoutRef.current = setTimeout(() => {
      setDashboardPopoverOpen(true);
    }, 200);
  };

  const handleDashboardMouseLeave = () => {
    if (dashboardPopoverTimeoutRef.current) {
      clearTimeout(dashboardPopoverTimeoutRef.current);
    }
    dashboardPopoverTimeoutRef.current = setTimeout(() => {
      setDashboardPopoverOpen(false);
    }, 150);
  };


  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (messagePopoverTimeoutRef.current) {
        clearTimeout(messagePopoverTimeoutRef.current);
      }
      if (dashboardPopoverTimeoutRef.current) {
        clearTimeout(dashboardPopoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hoverIndex !== null && menuRef.current && tooltipRef.current) {
      const menuItem = menuRef.current.children[hoverIndex] as HTMLElement;
      const menuRect = menuRef.current.getBoundingClientRect();
      const itemRect = menuItem.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const left =
        itemRect.left -
        menuRect.left +
        (itemRect.width - tooltipRect.width) / 2;

      setTooltipPosition({
        left: Math.max(0, Math.min(left, menuRect.width - tooltipRect.width)),
        width: tooltipRect.width,
      });
    }
  }, [hoverIndex]);

  // Check if the hovered item has a popover menu (Messages or Patient Dashboard)
  const messagesItemIndex = menuItems.findIndex(
    (item) => item.path === "/messages",
  );
  // Determine current tab for highlighting
  const currentMessageTab =
    pathname === "/messages" ? searchParams.get("tab") || "staff" : null;

  return (
    <div className="fixed bottom-12 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <motion.div
        className={`pointer-events-auto relative ${className}`}
        initial={{ y: 0 }}
        animate={{
          y: isVisible || isBottomMenuLocked ? 0 : 150,
          opacity: isVisible || isBottomMenuLocked ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <AnimatePresence>
          {hoverIndex !== null && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute right-0 left-0"
              style={{
                bottom: "-31px",
                pointerEvents: "none",
                zIndex: 50,
              }}
            >
              <motion.div
                ref={tooltipRef}
                className="inline-flex overflow-hidden justify-center items-center px-3 h-7 rounded-lg shadow-lg bg-primary"
                initial={{ x: tooltipPosition.left }}
                animate={{ x: tooltipPosition.left }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ width: "auto" }}
              >
                <p className="text-primary-foreground text-[13px] font-medium leading-tight whitespace-nowrap">
                  {hoverIndex !== null && menuItems[hoverIndex]?.label}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={menuRef}
          className="h-12 px-1.5 bg-card rounded-[99px] shadow-lg border border-border justify-center items-center gap-[3px] inline-flex overflow-hidden z-10"
        >
          {menuItems.map((item, index) => {
            const isActive = index === activeIndex;
            const isMessagesButton = item.path === "/messages";

            if (isMessagesButton) {
              return (
                <Popover
                  key={index}
                  open={messagePopoverOpen}
                  onOpenChange={setMessagePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      className={`w-10 h-10 px-3 py-1 rounded-[99px] justify-center items-center gap-2 flex transition-colors ${
                        isActive
                          ? "bg-background"
                          : "hover:bg-accent hover:text-accent-foreground"
                      } relative`}
                      onMouseEnter={() => {
                        setHoverIndex(index);
                      handleMessageMouseEnter();
                    }}
                    onMouseLeave={() => {
                      setHoverIndex(null);
                      handleMessageMouseLeave();
                    }}
                    onClick={() => {
                      setMessagePopoverOpen(false);
                      setIsNavigating(true);
                      setNavigatingToPath("/messages");
                      router.push("/messages");
                    }}
                  >
                    <div className="flex justify-center items-center">
                      <div className="w-[20px] h-[20px] flex justify-center items-center overflow-hidden relative">
                        {!(isNavigating && navigatingToPath === item.path) && (
                          <item.icon
                            className={`w-full h-full ${isActive ? "text-foreground" : "text-foreground"}`}
                          />
                        )}
                        {isNavigating && navigatingToPath === item.path && (
                          <div className="w-4 h-4 rounded-full border-b-2 border-current animate-spin"></div>
                        )}
                      </div>
                    </div>
                    {item.badge && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                        {item.badge > 9 ? "9+" : item.badge}
                      </div>
                    )}
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 w-1.5 h-1.5 bg-foreground rounded-full"
                        layoutId="activeIndicator"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    <span className="sr-only">{item.label}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="center"
                  sideOffset={8}
                  className="w-48 p-2"
                  onMouseEnter={() => {
                    if (messagePopoverTimeoutRef.current) {
                      clearTimeout(messagePopoverTimeoutRef.current);
                    }
                    setMessagePopoverOpen(true);
                  }}
                  onMouseLeave={handleMessageMouseLeave}
                  asChild
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{
                      duration: 0.15,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex flex-col gap-1"
                  >
                    <button
                      onClick={() => handleMessageNavigation("staff")}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left ${
                        currentMessageTab === "staff"
                          ? "border-2 border-primary bg-primary/10"
                          : ""
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">Staff</span>
                    </button>
                    <button
                      onClick={() => handleMessageNavigation("patient")}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left ${
                        currentMessageTab === "patient"
                          ? "border-2 border-primary bg-primary/10"
                          : ""
                      }`}
                    >
                      <UserRound className="w-4 h-4" />
                      <span className="text-sm font-medium">Patient</span>
                    </button>
                  </motion.div>
                </PopoverContent>
              </Popover>
            );
          }

          const isPatientDashboardButton = item.path === "/patient-dashboard";

          if (isPatientDashboardButton) {
            return (
              <Popover
                key={index}
                open={dashboardPopoverOpen}
                onOpenChange={setDashboardPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    className={`w-10 h-10 px-3 py-1 rounded-[99px] justify-center items-center gap-2 flex transition-colors ${
                      isActive
                        ? "bg-background"
                        : "hover:bg-accent hover:text-accent-foreground"
                    } relative`}
                    onMouseEnter={() => {
                      setHoverIndex(index);
                      handleDashboardMouseEnter();
                    }}
                    onMouseLeave={() => {
                      setHoverIndex(null);
                      handleDashboardMouseLeave();
                    }}
                    onClick={() => {
                      setDashboardPopoverOpen(false);
                      setIsNavigating(true);
                      setNavigatingToPath("/patient-dashboard");
                      router.push("/patient-dashboard");
                    }}
                  >
                    <div className="flex justify-center items-center">
                      <div className="w-[20px] h-[20px] flex justify-center items-center overflow-hidden relative">
                        {!(isNavigating && navigatingToPath === item.path) && (
                          <item.icon
                            className={`w-full h-full ${isActive ? "text-foreground" : "text-foreground"}`}
                          />
                        )}
                        {isNavigating && navigatingToPath === item.path && (
                          <div className="w-4 h-4 rounded-full border-b-2 border-current animate-spin"></div>
                        )}
                      </div>
                    </div>
                    {item.badge && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                        {item.badge > 9 ? "9+" : item.badge}
                      </div>
                    )}
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 w-1.5 h-1.5 bg-foreground rounded-full"
                        layoutId="activeIndicator"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    <span className="sr-only">{item.label}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="center"
                  sideOffset={8}
                  className="w-44 p-2"
                  onMouseEnter={() => {
                    if (dashboardPopoverTimeoutRef.current) {
                      clearTimeout(dashboardPopoverTimeoutRef.current);
                    }
                    setDashboardPopoverOpen(true);
                  }}
                  onMouseLeave={handleDashboardMouseLeave}
                  asChild
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{
                      duration: 0.15,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex flex-col gap-1"
                  >
                    <button
                      onClick={() => {
                        setDashboardPopoverOpen(false);
                        router.push("/create-patient");
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add Patient</span>
                    </button>
                  </motion.div>
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <button
              key={index}
              className={`w-10 h-10 px-3 py-1 rounded-[99px] justify-center items-center gap-2 flex transition-colors ${
                isActive
                  ? "bg-background"
                  : "hover:bg-accent hover:text-accent-foreground"
              } relative`}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={() => {
                setIsNavigating(true);
                setNavigatingToPath(item.path);
                router.push(item.path);
              }}
            >
              <div className="flex justify-center items-center">
                <div className="w-[20px] h-[20px] flex justify-center items-center overflow-hidden relative">
                  {!(isNavigating && navigatingToPath === item.path) && (
                    <item.icon
                      className={`w-full h-full ${isActive ? "text-foreground" : "text-foreground"}`}
                    />
                  )}
                  {isNavigating && navigatingToPath === item.path && (
                    <div className="w-4 h-4 rounded-full border-b-2 border-current animate-spin"></div>
                  )}
                </div>
              </div>
              {item.badge && (
                <div className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                  {item.badge > 9 ? "9+" : item.badge}
                </div>
              )}
              {isActive && (
                <motion.div
                  className="absolute bottom-0 w-1.5 h-1.5 bg-foreground rounded-full"
                  layoutId="activeIndicator"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
      </div>
      </motion.div>
    </div>
  );
}
