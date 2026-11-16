"use client";

import React from "react";
import { motion } from "framer-motion";
import { MobileFrame } from "./MobileFrame";
import {
  Home,
  MessageSquare,
  Bell,
  LayoutDashboard,
  User,
  Hospital,
  Stethoscope,
  Merge,
  ArrowUpNarrowWide,
  NotebookPen,
  UserPlus,
  FileText,
  Pill,
  Image as ImageIcon,
  RefreshCw,
  GalleryHorizontalEnd,
  Users,
  Send,
  Camera,
  Mic,
  Languages,
  SquarePen,
  Megaphone,
  ChevronLeft,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Screen = "dashboard" | "chart" | "messages";

type AnimationStep =
  | { type: "show"; screen: Screen; duration: number }
  | { type: "tap"; duration: number }
  | { type: "navigate"; to: Screen; duration: number };

// ─── Animation Sequence ─────────────────────────────────────────────────────

const SEQUENCE: AnimationStep[] = [
  { type: "show", screen: "dashboard", duration: 3000 },
  { type: "tap", duration: 600 },
  { type: "navigate", to: "chart", duration: 400 },
  { type: "show", screen: "chart", duration: 3000 },
  { type: "navigate", to: "dashboard", duration: 400 },
  { type: "show", screen: "dashboard", duration: 800 },
  { type: "navigate", to: "messages", duration: 400 },
  { type: "show", screen: "messages", duration: 3000 },
  { type: "navigate", to: "dashboard", duration: 400 },
];

// ─── Tab Bar ────────────────────────────────────────────────────────────────

const tabs = [
  { icon: Home, label: "Home", screen: "dashboard" as const },
  { icon: MessageSquare, label: "Messages", screen: "messages" as const },
  { icon: Bell, label: "Alerts", screen: null },
  { icon: LayoutDashboard, label: "Dashboard", screen: null },
  { icon: User, label: "Profile", screen: null },
];

function TabBar({ activeScreen }: { activeScreen: Screen }) {
  return (
    <div className="bg-card border-t border-border px-2 py-1.5 flex justify-around items-center">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.screen === activeScreen ||
          (tab.screen === "dashboard" && activeScreen === "dashboard");
        return (
          <div key={tab.label} className="flex flex-col items-center gap-0.5 w-12">
            <Icon
              className={`w-5 h-5 transition-colors duration-200 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Chart Bottom Bar ───────────────────────────────────────────────────────

function ChartBottomBar() {
  const icons = [RefreshCw, GalleryHorizontalEnd, Users, Send];
  return (
    <div className="bg-card border-t border-border px-4 py-2 flex justify-around items-center">
      {icons.map((Icon, i) => (
        <div key={i} className="w-10 h-8 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${i === 1 ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      ))}
    </div>
  );
}

// ─── Screen: Dashboard ──────────────────────────────────────────────────────

function DashboardScreen({ isTapping }: { isTapping: boolean }) {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="bg-card p-4 border-b border-border flex justify-between items-center shadow-sm z-10">
        <div className="font-bold text-lg font-aleo">Patients</div>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shadow-inner">
          JD
        </div>
      </div>
      <div className="p-3 space-y-3 overflow-hidden flex-1 bg-muted/30">
        {/* Patient Card 1 */}
        <motion.div
          className={`bg-card rounded-2xl p-3.5 shadow-sm border transition-colors ${
            isTapping ? "border-primary/50 ring-2 ring-primary/20" : "border-border/50"
          }`}
          animate={isTapping ? { scale: 0.97 } : { scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex justify-between items-start mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base shadow-inner">
                S
              </div>
              <div>
                <div className="font-bold font-aleo text-sm">Patient Smith</div>
                <div className="text-[11px] text-muted-foreground font-figtree">
                  45 years &bull; Amman
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium border border-orange-200">
                Pre-Op / Cleared
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium border border-red-200">
                Urgent
              </span>
            </div>
          </div>
          <div className="bg-primary/5 p-2 rounded-lg mb-2.5 border border-primary/10">
            <div className="text-[10px] font-semibold text-primary mb-0.5">
              Chief Complaint:
            </div>
            <div className="text-[10px] text-primary/80 leading-relaxed">
              Severe abdominal pain, suspected appendicitis.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <Hospital className="w-3 h-3" /> Al-Bashir
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <Stethoscope className="w-3 h-3" /> Orthopedic Trauma
            </div>
          </div>
          <div className="pt-2.5 border-t border-border/60">
            <div className="flex justify-between items-center gap-1">
              {[Merge, ArrowUpNarrowWide, NotebookPen, MessageSquare, Stethoscope].map(
                (Icon, i) => (
                  <div
                    key={i}
                    className="flex-1 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-700"
                  >
                    <Icon className={`w-3.5 h-3.5 ${i < 2 ? "rotate-90" : ""}`} />
                  </div>
                )
              )}
              <div className="flex-1 h-8 rounded-lg bg-orange-600 border border-orange-700 flex items-center justify-center text-white">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Patient Card 2 (dimmed) */}
        <div className="bg-card rounded-2xl p-3.5 shadow-sm border border-border/50 opacity-50">
          <div className="flex justify-between items-start mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-base shadow-inner">
                A
              </div>
              <div>
                <div className="font-bold font-aleo text-sm">Patient Ali</div>
                <div className="text-[11px] text-muted-foreground font-figtree">
                  32 years &bull; Irbid
                </div>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 font-medium border border-gray-200">
              Not Started
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Patient Chart ──────────────────────────────────────────────────

function ChartScreen() {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="bg-card p-4 border-b border-border flex items-center gap-2.5 shadow-sm z-10">
        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow-inner">
          S
        </div>
        <div>
          <div className="font-bold font-aleo text-sm leading-tight">Patient Smith</div>
          <div className="text-[10px] text-muted-foreground font-figtree">45y &bull; Male &bull; PAT-12345</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card shadow-sm z-0">
        {[
          { Icon: User, label: "Info", active: true },
          { Icon: FileText, label: "Notes", active: false },
          { Icon: Pill, label: "Meds", active: false },
          { Icon: ImageIcon, label: "Images", active: false },
        ].map(({ Icon, label, active }) => (
          <div
            key={label}
            className={`flex-1 px-2 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
              active
                ? "border-b-2 border-primary text-primary bg-primary/5"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3 space-y-2.5 overflow-hidden flex-1 bg-muted/30">
        {/* Patient Info */}
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border/50 space-y-2.5">
          {[
            { label: "DOB:", value: "Jan 15, 1979 (45y)" },
            { label: "Sex:", value: "Male" },
            { label: "Loc:", value: "Amman, Jordan" },
            { label: "Status:", value: "Pre-Op / Cleared" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-10 text-muted-foreground font-medium text-[10px]">{label}</div>
              <div className="font-semibold text-foreground text-[11px]">{value}</div>
            </div>
          ))}
        </div>

        {/* Care Team */}
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border/50">
          <div className="text-[11px] font-bold font-aleo mb-2 text-foreground">Care Team</div>
          <div className="flex items-center gap-2.5 bg-muted/50 p-2 rounded-lg border border-border/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shadow-inner">
              DR
            </div>
            <div>
              <div className="text-[11px] font-semibold text-foreground">Dr. Roberts</div>
              <div className="text-[10px] text-primary font-medium">Lead Surgeon</div>
            </div>
          </div>
        </div>

        {/* Chief Complaint */}
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border/50">
          <div className="text-[11px] font-bold font-aleo mb-1.5 text-foreground">Chief Complaint</div>
          <div className="bg-primary/5 p-2 rounded-lg border border-primary/10">
            <div className="text-[10px] text-primary/80 leading-relaxed">
              Severe abdominal pain, suspected appendicitis. Patient reports onset 6 hours ago with increasing intensity.
            </div>
          </div>
        </div>

        {/* Recent Notes */}
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border/50">
          <div className="text-[11px] font-bold font-aleo mb-1.5 text-foreground">Latest Note</div>
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            Pre-op assessment complete. Labs within normal limits. Cleared for surgery.
          </div>
          <div className="text-[9px] text-muted-foreground/60 mt-1">Dr. Roberts &bull; 2h ago</div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Staff Messages ─────────────────────────────────────────────────

const threads = [
  {
    name: "Orthopedic Team",
    lastMessage: "Surgery for Ahmad scheduled at 9 AM",
    badge: "Group",
    unread: 3,
    initials: "OT",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Dr. Sarah",
    lastMessage: "Can you review the post-op notes?",
    unread: 1,
    initials: "DS",
    color: "bg-teal-100 text-teal-700",
  },
  {
    name: "Triage Coordinators",
    lastMessage: "New batch of patients incoming from clinic B",
    badge: "Group",
    unread: 0,
    initials: "TC",
    color: "bg-purple-100 text-purple-700",
  },
];

function MessagesScreen() {
  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <div className="bg-card px-4 py-3.5 border-b border-border shadow-sm z-10">
        <div className="font-bold text-lg font-aleo">Messages</div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border bg-card">
        <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-b-2 border-primary">
          <span className="text-[12px] font-semibold text-primary">Staff</span>
          <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center px-1">
            4
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5">
          <span className="text-[12px] text-muted-foreground">Patient</span>
          <span className="min-w-[18px] h-[18px] rounded-full bg-muted-foreground/30 text-muted-foreground text-[9px] font-semibold flex items-center justify-center px-1">
            2
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-3 space-y-2.5 bg-muted/10">
        {/* New Message button */}
        <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-[12px]">
          <SquarePen className="w-3.5 h-3.5" />
          New Message
        </button>

        {/* Admin Notifications */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl border bg-amber-50 border-amber-200">
          <Megaphone className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold text-amber-700">Admin Notifications</div>
            <div className="text-[10px] text-muted-foreground">
              View system alerts and announcements
            </div>
          </div>
        </div>

        {/* Thread list */}
        {threads.map((thread, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl border transition-colors ${
              thread.unread > 0
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-full ${thread.color} flex items-center justify-center font-bold text-[10px] shrink-0 shadow-inner`}
              >
                {thread.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] font-bold text-foreground truncate">
                    {thread.name}
                  </span>
                  {thread.badge && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase">
                      {thread.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {thread.lastMessage}
                </p>
              </div>
              {thread.unread > 0 && (
                <span className="min-w-[20px] h-[20px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shrink-0">
                  {thread.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const SCREENS: Screen[] = ["dashboard", "chart", "messages"];

export function HeroPhoneMockup() {
  const [currentScreen, setCurrentScreen] = React.useState<Screen>("dashboard");
  const [isTapping, setIsTapping] = React.useState(false);
  const timeoutsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Run animation loop
  React.useEffect(() => {
    const clearAllTimeouts = () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };

    const runSequence = () => {
      clearAllTimeouts();
      let delay = 0;

      SEQUENCE.forEach((step, i) => {
        const t = setTimeout(() => {
          if (step.type === "tap") {
            setIsTapping(true);
            const untap = setTimeout(() => setIsTapping(false), 300);
            timeoutsRef.current.push(untap);
          } else if (step.type === "navigate") {
            setIsTapping(false);
            setCurrentScreen(step.to);
          }
        }, delay);
        timeoutsRef.current.push(t);
        delay += step.duration;
      });

      const loopTimeout = setTimeout(runSequence, delay);
      timeoutsRef.current.push(loopTimeout);
    };

    runSequence();
    return clearAllTimeouts;
  }, []);

  const showChartBar = currentScreen === "chart";

  return (
    <MobileFrame>
      {/* All screens rendered simultaneously, stacked with absolute positioning */}
      <div className="flex-1 overflow-hidden relative">
        {SCREENS.map((screen) => (
          <div
            key={screen}
            className="absolute inset-0 flex flex-col transition-opacity duration-300"
            style={{
              opacity: currentScreen === screen ? 1 : 0,
              pointerEvents: currentScreen === screen ? "auto" : "none",
            }}
          >
            {screen === "dashboard" && <DashboardScreen isTapping={isTapping} />}
            {screen === "chart" && <ChartScreen />}
            {screen === "messages" && <MessagesScreen />}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="relative">
        <div
          className="transition-opacity duration-200"
          style={{
            opacity: showChartBar ? 0 : 1,
            pointerEvents: showChartBar ? "none" : "auto",
          }}
        >
          <TabBar activeScreen={currentScreen} />
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: showChartBar ? 1 : 0,
            pointerEvents: showChartBar ? "auto" : "none",
          }}
        >
          <ChartBottomBar />
        </div>
      </div>
    </MobileFrame>
  );
}
