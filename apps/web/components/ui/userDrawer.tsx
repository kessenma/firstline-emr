// apps/web/components/ui/userDrawer.tsx
"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  LogOut,
  Settings,
  ClipboardList,
  Grid3X3,
  Bell,
  MessageCircle,
  Home,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Label } from "@radix-ui/react-label";
import { RoleIcon, getRoleButtonVariant } from "@/components/ui/RoleIcon";
import { getRoleCssVar } from "@fajr/shared/theme";
import { useGlobalContext } from "../globalContext/GlobalContext";

interface UserDrawerProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  user: {
    name?: string | null;
    email?: string | null;
    googleEmail?: string | null;
    accountType?: string | null;
    languages?: string[] | null;
    countries?: string[] | null;
    image?: string | null;
    firstName?: string;
    lastName?: string;
    isAdmin?: boolean;
  };
}

export function UserDrawer({ isOpen, setIsOpen, user }: UserDrawerProps) {
  const router = useRouter();
  const { isBottomMenuLocked, toggleBottomMenuLock } = useGlobalContext();
  const { update } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const roleClass =
    user.accountType === "Doctor"
      ? "role-doctor"
      : user.accountType === "Triage"
        ? "role-triage"
        : "";
  const brandClass =
    user.accountType === "Doctor"
      ? "brand-scientific"
      : user.accountType === "Triage"
        ? "brand-global"
        : "";

  // Determine accent color class based on whether user has a brand
  const accentColorClass = brandClass ? "text-accent" : "text-foreground";

  // Determine the button variant for brand styling
  const brandVariant = getRoleButtonVariant(user.accountType) as
    | "doctorBackground"
    | "triageBackground"
    | "default";

  // Icon color using brand primary colors for better contrast
  const iconColorStyle = user.accountType
    ? { color: getRoleCssVar(user.accountType) }
    : undefined;

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      await update();
    } catch (error) {
      console.error("Error refreshing session:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleItemClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const menuItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/patient-dashboard", icon: Grid3X3, label: "Patient Dashboard" },
    { href: "/my-profile", icon: Settings, label: "My Profile" },
    ...(user.isAdmin
      ? [{ href: "/admin", icon: ClipboardList, label: "Admin Dashboard" }]
      : []),
    { href: "/notifications", icon: Bell, label: "Notifications" },
    { href: "/messages", icon: MessageCircle, label: "Messages" },
  ];

  const formatName = (firstName: string = "", lastName: string = "") => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName.length <= 20) return fullName;
    return (
      <>
        {firstName}
        {lastName && (
          <>
            <wbr />-<br />
            {lastName}
          </>
        )}
      </>
    );
  };

  return (
    <div className={`${roleClass} ${brandClass}`}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-md bg-card text-card-foreground border-border">
          <SheetTitle className="sr-only">User Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Access your profile, settings, and other actions
          </SheetDescription>
          <ScrollArea className="h-full pr-4">
            <Card className="w-full max-w-3xl mx-auto text-foreground border border-border shadow-lg bg-accent/10">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar
                    user={user}
                    className="w-12 h-12 ring-2 ring-accent"
                  />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={brandVariant}
                        size="sm"
                        className="h-6 px-3 text-xs font-semibold pointer-events-none"
                      >
                        <RoleIcon
                          accountType={user.accountType}
                          colored={false}
                          className="mr-1 h-3 w-3 shrink-0"
                        />
                        {user.accountType}
                      </Button>
                      <button
                        onClick={handleRefreshSession}
                        disabled={isRefreshing}
                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title="Refresh session data"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-foreground truncate">
                      {formatName(user.firstName, user.lastName)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.googleEmail}
                    </p>
                  </div>
                </div>
                <Accordion type="single" collapsible className="w-full pb-2">
                  <AccordionItem value="languages">
                    <AccordionTrigger className="text-foreground hover:text-foreground">
                      Languages
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-2">
                        {user.languages && user.languages.length > 0 ? (
                          user.languages.map((language, index) => (
                            <span
                              key={index}
                              className="bg-muted text-muted-foreground border border-border px-2 py-1 rounded-full text-xs"
                            >
                              {language}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No languages set. Update your profile to add
                            languages.
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="countries">
                    <AccordionTrigger className="text-foreground hover:text-foreground">
                      Countries
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-2">
                        {user.countries && user.countries.length > 0 ? (
                          user.countries.map((country, index) => (
                            <span
                              key={index}
                              className="bg-muted text-muted-foreground border border-border px-2 py-1 rounded-full text-xs"
                            >
                              {country}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No countries set. Update your profile to add
                            countries.
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <nav className="space-y-2 mb-4 mt-4">
              {menuItems.map((item) => (
                <Button
                  key={item.href}
                  onClick={() => handleItemClick(item.href)}
                  className="w-full flex items-center justify-start p-2 text-sm rounded-md text-foreground transition-colors border border-border hover:bg-accent hover:text-accent-foreground border-l-2 border-accent"
                  variant="ghost"
                >
                  <item.icon
                    className="mr-2 h-5 w-5 shrink-0 text-foreground"
                    style={iconColorStyle}
                  />
                  <span className="grow text-center">{item.label}</span>
                </Button>
              ))}
            </nav>

            <div className="mb-4 space-y-1">
              <Button
                onClick={toggleBottomMenuLock}
                className="w-full flex items-center justify-start p-2 text-sm rounded-md text-foreground transition-colors border border-border hover:bg-accent hover:text-accent-foreground border-l-2 border-accent"
                variant="ghost"
              >
                {isBottomMenuLocked ? (
                  <Lock
                    className="mr-2 h-5 w-5 shrink-0 text-foreground"
                    style={iconColorStyle}
                  />
                ) : (
                  <Unlock
                    className="mr-2 h-5 w-5 shrink-0 text-foreground"
                    style={iconColorStyle}
                  />
                )}
                <span className="grow text-center">
                  {isBottomMenuLocked ? "Unlock Menu" : "Lock Menu"}
                </span>
              </Button>
              <p className="text-[10px] text-muted-foreground text-center px-2">
                {isBottomMenuLocked
                  ? "Menu is locked and will always be visible"
                  : "Menu will hide when scrolling down"}
              </p>
            </div>

            <Button
              variant={brandVariant}
              size="sm"
              className="w-full justify-start text-sm"
              onClick={async () => {
                await signOut({ callbackUrl: "/auth/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4 text-primary-foreground" />
              Sign Out
            </Button>

            {/* Footer Link */}
            <div className="mt-12 text-center">
              <Link
                href="/new-patient"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => handleItemClick("/new-patient")}
              >
                New Patient
              </Link>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
