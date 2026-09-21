"use client";

import React from "react";
import {
  Bot, Check, Bell, ClipboardList, ArrowLeft, Globe,
  Phone, Camera, Music, Search, Cog, User, MessageSquare,
  CalendarDays, Clock, Mail, CloudSun, MapPin, FileText, Image as ImageIcon,
  RotateCcw, ChevronLeft, ChevronRight,
} from "lucide-react";
import { MobileFrame } from "../MobileFrame";
import { TelegramIcon } from "@/components/icons/TelegramIcon";

export const intakeBotMeta = {
  id: "intake-bot",
  title: "Telegram Intake Bot",
  description:
    "Patients message the bot on Telegram, receive a secure registration link, and complete their intake form in their own language. Their chart is created automatically — ready for triage.",
};

type Phase =
  | "idle"
  | "home-screen"
  | "tap-telegram"
  | "telegram-chat-list"
  | "tap-search"
  | "typing-search"
  | "open-bot-chat"
  | "typing-hi"
  | "send-hi"
  | "bot-reply-1"
  | "bot-reply-2"
  | "tap-url"
  | "form-open"
  | "form-filling"
  | "form-submitted"
  | "confirmation";

type ScreenId = "home" | "chatlist" | "botchat" | "form" | "confirmation";
const SCREEN_ORDER: ScreenId[] = ["home", "chatlist", "botchat", "form", "confirmation"];

const MANUAL_SCREENS: { screen: ScreenId; phase: Phase; filledFields: number; typedText: string }[] = [
  { screen: "home", phase: "home-screen", filledFields: 0, typedText: "" },
  { screen: "chatlist", phase: "typing-search", filledFields: 0, typedText: "@fajr_mission_bot" },
  { screen: "botchat", phase: "bot-reply-2", filledFields: 0, typedText: "" },
  { screen: "form", phase: "form-submitted", filledFields: 6, typedText: "" },
  { screen: "confirmation", phase: "confirmation", filledFields: 6, typedText: "" },
];

function getScreenTransform(screenId: ScreenId, activeScreen: ScreenId) {
  const activeIdx = SCREEN_ORDER.indexOf(activeScreen);
  const thisIdx = SCREEN_ORDER.indexOf(screenId);
  if (thisIdx === activeIdx) return "translateX(0)";
  if (thisIdx < activeIdx) return "translateX(-100%)";
  return "translateX(100%)";
}

function getActiveScreen(phase: Phase): ScreenId {
  if (phase === "idle" || phase === "home-screen" || phase === "tap-telegram") return "home";
  if (phase === "telegram-chat-list" || phase === "tap-search" || phase === "typing-search") return "chatlist";
  if (phase === "open-bot-chat" || phase === "typing-hi" || phase === "send-hi" || phase === "bot-reply-1" || phase === "bot-reply-2" || phase === "tap-url") return "botchat";
  if (phase === "form-open" || phase === "form-filling" || phase === "form-submitted") return "form";
  return "confirmation";
}

// --- Inline helper components ---

function ControlTooltip({ children, text, show }: { children: React.ReactNode; text: string; show: boolean }) {
  return (
    <div className="relative">
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover text-popover-foreground text-[10px] rounded py-1 px-2 z-50 border border-border shadow-md whitespace-nowrap pointer-events-none">
          {text}
        </div>
      )}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-1.5 pb-1 text-[10px] font-semibold text-white">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <div className="flex gap-[2px] items-end">
          {[3, 5, 7, 9].map((h) => (
            <div key={h} className="w-[3px] bg-white rounded-sm" style={{ height: h }} />
          ))}
        </div>
        <span className="text-[8px] ml-0.5">5G</span>
        <div className="w-5 h-2.5 border border-white rounded-[2px] ml-1 relative">
          <div className="absolute inset-[1px] right-[3px] bg-white rounded-[1px]" />
        </div>
      </div>
    </div>
  );
}

function AppIcon({ icon: Icon, label, color, isTelegram, showRipple }: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  isTelegram?: boolean;
  showRipple?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 relative">
      <div className={`w-[50px] h-[50px] rounded-[12px] ${isTelegram ? "" : color} flex items-center justify-center relative overflow-hidden shadow-sm`}>
        {isTelegram ? (
          <TelegramIcon className="w-[50px] h-[50px] rounded-[12px]" />
        ) : (
          Icon && <Icon className="w-5 h-5 text-white" />
        )}
        {showRipple && (
          <>
            <div className="absolute inset-0 bg-white/30 animate-pulse rounded-[12px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/20 animate-ping z-10" />
          </>
        )}
      </div>
      <span className="text-[9px] text-white drop-shadow-sm">{label}</span>
    </div>
  );
}

function ChatItem({ initials, name, message, time, color, unread }: {
  initials: string; name: string; message: string; time: string; color: string; unread?: number;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 border-b border-border/30">
      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-semibold text-foreground truncate">{name}</span>
          <span className="text-[9px] text-muted-foreground shrink-0 ml-2">{time}</span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{message}</p>
      </div>
      {unread && unread > 0 && (
        <span className="w-5 h-5 rounded-full bg-[#2AABEE] text-white text-[9px] flex items-center justify-center font-bold shrink-0">
          {unread}
        </span>
      )}
    </div>
  );
}

function VirtualKeyboard({ visible }: { visible: boolean }) {
  const rows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ];
  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-[#D1D4D9] dark:bg-neutral-700 pt-1.5 pb-1 px-0.5 transition-transform duration-300 z-20"
      style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
    >
      {rows.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-[3px] mb-[3px]">
          {ri === 2 && (
            <div className="w-[30px] h-[34px] bg-[#B1B5BC] dark:bg-neutral-600 rounded-md flex items-center justify-center text-[9px]">⇧</div>
          )}
          {row.map((key) => (
            <div key={key} className="w-[27px] h-[34px] bg-white dark:bg-neutral-500 rounded-md shadow-sm flex items-center justify-center text-[11px] font-light text-foreground">
              {key}
            </div>
          ))}
          {ri === 2 && (
            <div className="w-[30px] h-[34px] bg-[#B1B5BC] dark:bg-neutral-600 rounded-md flex items-center justify-center text-[9px]">⌫</div>
          )}
        </div>
      ))}
      <div className="flex justify-center gap-[3px]">
        <div className="w-[48px] h-[34px] bg-[#B1B5BC] dark:bg-neutral-600 rounded-md flex items-center justify-center text-[9px] text-foreground">123</div>
        <div className="flex-1 h-[34px] bg-white dark:bg-neutral-500 rounded-md shadow-sm flex items-center justify-center text-[11px] text-foreground">space</div>
        <div className="w-[60px] h-[34px] bg-[#B1B5BC] dark:bg-neutral-600 rounded-md flex items-center justify-center text-[9px] text-foreground">return</div>
      </div>
    </div>
  );
}

// --- Main component ---

export function IntakeBotVisual({ isActive }: { isActive?: boolean }) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [filledFields, setFilledFields] = React.useState(0);
  const [typedText, setTypedText] = React.useState("");
  const [hasUserScrolled, setHasUserScrolled] = React.useState(false);
  const [isSlowMode, setIsSlowMode] = React.useState(false);
  const [restartKey, setRestartKey] = React.useState(0);
  const [animationComplete, setAnimationComplete] = React.useState(false);
  const [manualMode, setManualMode] = React.useState(false);
  const [manualIndex, setManualIndex] = React.useState(4);

  // Tooltip hover states
  const [tipRestart, setTipRestart] = React.useState(false);
  const [tipSpeed, setTipSpeed] = React.useState(false);
  const [tipPrev, setTipPrev] = React.useState(false);
  const [tipNext, setTipNext] = React.useState(false);

  // Ref to guard timers when entering manual mode mid-animation
  const isManualRef = React.useRef(false);

  // Guard: don't animate until user has scrolled
  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setHasUserScrolled(true);
        window.removeEventListener("scroll", handleScroll);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    if (window.scrollY > 100) setHasUserScrolled(true);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const shouldAnimate = isActive && hasUserScrolled;

  // Main animation effect
  React.useEffect(() => {
    if (!shouldAnimate) {
      setPhase("idle");
      setFilledFields(0);
      setTypedText("");
      setAnimationComplete(false);
      setManualMode(false);
      isManualRef.current = false;
      return;
    }

    // In manual mode, just let the cleanup clear old timers
    if (manualMode) return;

    // Starting fresh animation
    isManualRef.current = false;
    setPhase("idle");
    setFilledFields(0);
    setTypedText("");
    setAnimationComplete(false);

    const s = isSlowMode ? 2 : 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const guard = () => !isManualRef.current;

    timers.push(setTimeout(() => { if (guard()) setPhase("home-screen"); }, 400 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("tap-telegram"); }, 2000 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("telegram-chat-list"); }, 2700 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("tap-search"); }, 4200 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("typing-search"); }, 4800 * s));

    const searchText = "@fajr_mission_bot";
    searchText.split("").forEach((_, i) => {
      timers.push(setTimeout(
        () => { if (guard()) setTypedText(searchText.slice(0, i + 1)); },
        (4800 + i * 80) * s
      ));
    });

    timers.push(setTimeout(() => { if (guard()) { setPhase("open-bot-chat"); setTypedText(""); } }, 6600 * s));
    timers.push(setTimeout(() => { if (guard()) { setPhase("typing-hi"); setTypedText("h"); } }, 7400 * s));
    timers.push(setTimeout(() => { if (guard()) setTypedText("hi"); }, 7650 * s));
    timers.push(setTimeout(() => { if (guard()) { setPhase("send-hi"); setTypedText(""); } }, 7900 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("bot-reply-1"); }, 8700 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("bot-reply-2"); }, 9900 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("tap-url"); }, 11400 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("form-open"); }, 12100 * s));
    timers.push(setTimeout(() => { if (guard()) setPhase("form-filling"); }, 12600 * s));

    for (let i = 0; i < 6; i++) {
      timers.push(setTimeout(() => { if (guard()) setFilledFields(i + 1); }, (12600 + i * 400) * s));
    }

    timers.push(setTimeout(() => { if (guard()) setPhase("form-submitted"); }, 15000 * s));
    timers.push(setTimeout(() => {
      if (guard()) {
        setPhase("confirmation");
        setAnimationComplete(true);
      }
    }, 15800 * s));

    return () => timers.forEach(clearTimeout);
  }, [shouldAnimate, isSlowMode, restartKey, manualMode]);

  // Handlers
  const handleRestart = () => {
    isManualRef.current = false;
    setManualMode(false);
    setAnimationComplete(false);
    setRestartKey((k) => k + 1);
  };

  const handleSpeedToggle = () => {
    isManualRef.current = false;
    setManualMode(false);
    setAnimationComplete(false);
    setIsSlowMode((v) => !v);
  };

  const handleManualNav = (direction: "prev" | "next") => {
    const currentIdx = manualMode ? manualIndex : MANUAL_SCREENS.length - 1;
    const newIdx = direction === "prev"
      ? Math.max(0, currentIdx - 1)
      : Math.min(MANUAL_SCREENS.length - 1, currentIdx + 1);

    isManualRef.current = true;
    setManualMode(true);
    setManualIndex(newIdx);
    setAnimationComplete(false);

    const target = MANUAL_SCREENS[newIdx];
    setPhase(target.phase);
    setFilledFields(target.filledFields);
    setTypedText(target.typedText);
  };

  const activeScreen = getActiveScreen(phase);
  const showSearchResult = phase === "typing-search" && typedText.length >= 12;
  const showControls = phase !== "idle" || manualMode;
  const showNav = animationComplete || manualMode;

  return (
    <div className="flex flex-col items-center gap-2">
      <MobileFrame>
        {/* ===== SCREEN 1: iPhone Home Screen ===== */}
        <div
          className="absolute inset-0 flex flex-col transition-all duration-500 ease-in-out"
          style={{
            transform: getScreenTransform("home", activeScreen),
            opacity: activeScreen === "home" ? 1 : 0,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-indigo-900 to-slate-900" />
          <div className="relative z-10">
            <StatusBar />
          </div>
          <div className="relative z-10 flex-1 px-5 pt-8">
            <div className="grid grid-cols-4 gap-x-4 gap-y-5 place-items-center">
              <AppIcon icon={CalendarDays} label="Calendar" color="bg-red-500" />
              <AppIcon icon={ImageIcon} label="Photos" color="bg-gradient-to-br from-pink-400 to-yellow-400" />
              <AppIcon icon={Camera} label="Camera" color="bg-gray-600" />
              <AppIcon icon={Clock} label="Clock" color="bg-black" />
              <AppIcon icon={MapPin} label="Maps" color="bg-green-500" />
              <AppIcon icon={FileText} label="Notes" color="bg-yellow-500" />
              <AppIcon icon={Mail} label="Mail" color="bg-blue-500" />
              <AppIcon label="Telegram" color="" isTelegram showRipple={phase === "tap-telegram"} />
              <AppIcon icon={Cog} label="Settings" color="bg-gray-500" />
              <AppIcon icon={CloudSun} label="Weather" color="bg-cyan-500" />
              <AppIcon icon={Music} label="Music" color="bg-gradient-to-br from-pink-500 to-red-500" />
              <AppIcon icon={Globe} label="Safari" color="bg-blue-400" />
            </div>
          </div>
          <div className="relative z-10 mx-4 mb-3 px-6 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md flex justify-between items-center">
            {[
              { icon: Phone, label: "Phone" },
              { icon: Globe, label: "Safari" },
              { icon: Camera, label: "Camera" },
              { icon: Music, label: "Music" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <item.icon className="w-6 h-6 text-white" />
              </div>
            ))}
          </div>
        </div>

        {/* ===== SCREEN 2: Telegram Chat List ===== */}
        <div
          className="absolute inset-0 flex flex-col transition-all duration-500 ease-in-out"
          style={{
            transform: getScreenTransform("chatlist", activeScreen),
            opacity: activeScreen === "chatlist" ? 1 : 0,
          }}
        >
          <div className="bg-[#2AABEE] px-4 pt-3 pb-2 shadow-sm z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-white/80">Edit</span>
              <span className="font-bold text-white text-base">Chats</span>
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </div>
            <div className={`h-8 rounded-lg flex items-center gap-2 px-2.5 transition-all duration-200 ${
              phase === "tap-search" || phase === "typing-search"
                ? "bg-white ring-2 ring-white/50"
                : "bg-white/20"
            }`}>
              <Search className={`w-3.5 h-3.5 ${phase === "tap-search" || phase === "typing-search" ? "text-muted-foreground" : "text-white/60"}`} />
              {(phase === "tap-search" || phase === "typing-search") && typedText ? (
                <span className="text-[11px] text-foreground">{typedText}<span className="inline-block w-0.5 h-3.5 bg-[#2AABEE] animate-pulse ml-px" /></span>
              ) : (
                <span className={`text-[11px] ${phase === "tap-search" || phase === "typing-search" ? "text-muted-foreground" : "text-white/60"}`}>
                  {phase === "tap-search" ? "" : "Search"}
                  {phase === "tap-search" && <span className="inline-block w-0.5 h-3.5 bg-[#2AABEE] animate-pulse" />}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-card">
            {showSearchResult && (
              <div className="absolute left-0 right-0 top-[88px] z-10 bg-card border-b border-border animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#2AABEE] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-foreground">Fajr Mission Bot</div>
                    <div className="text-[9px] text-muted-foreground">bot</div>
                  </div>
                </div>
              </div>
            )}
            <ChatItem initials="JD" name="John D." message="Sounds good, see you then!" time="3:45 PM" color="bg-blue-500" />
            <ChatItem initials="AB" name="Alice B." message="Thanks for the info" time="2:30 PM" color="bg-purple-500" />
            <ChatItem initials="FM" name="Fajr Mission" message="Welcome! Please complete..." time="12:15 PM" color="bg-orange-500" unread={1} />
            <ChatItem initials="SC" name="Sam C." message="The meeting went well" time="Yesterday" color="bg-teal-500" />
            <ChatItem initials="MK" name="Maria K." message="Can you send the files?" time="Mon" color="bg-pink-500" />
          </div>
          <div className="bg-card border-t border-border px-2 py-1.5 flex justify-around items-center z-10">
            {[
              { icon: User, label: "Contacts", active: false },
              { icon: Phone, label: "Calls", active: false },
              { icon: MessageSquare, label: "Chats", active: true },
              { icon: Cog, label: "Settings", active: false },
            ].map((tab) => (
              <div key={tab.label} className="flex flex-col items-center gap-0.5">
                <tab.icon className={`w-5 h-5 ${tab.active ? "text-[#2AABEE]" : "text-muted-foreground"}`} />
                <span className={`text-[8px] ${tab.active ? "text-[#2AABEE] font-semibold" : "text-muted-foreground"}`}>{tab.label}</span>
              </div>
            ))}
          </div>
          <VirtualKeyboard visible={phase === "tap-search" || phase === "typing-search"} />
        </div>

        {/* ===== SCREEN 3: Bot Conversation ===== */}
        <div
          className="absolute inset-0 flex flex-col transition-all duration-500 ease-in-out"
          style={{
            transform: getScreenTransform("botchat", activeScreen),
            opacity: activeScreen === "botchat" ? 1 : 0,
          }}
        >
          <div className="bg-[#2AABEE] p-3 flex items-center gap-3 shadow-sm z-10">
            <ArrowLeft className="w-5 h-5 text-white" />
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Fajr MedFlow Bot</div>
              <div className="text-[10px] text-white/70">bot</div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-3 space-y-2 bg-[#e5ddd5]/30 dark:bg-muted/20">
            {(phase === "send-hi" || phase === "bot-reply-1" || phase === "bot-reply-2" || phase === "tap-url") && (
              <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-[78%] px-3 py-1.5 rounded-2xl rounded-tr-sm bg-[#EEFFDE] dark:bg-green-900/40 text-foreground text-xs">
                  hi
                </div>
              </div>
            )}
            {(phase === "bot-reply-1" || phase === "bot-reply-2" || phase === "tap-url") && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-[88%] px-3 py-2 rounded-2xl rounded-tl-sm bg-card border border-border text-foreground text-xs leading-relaxed">
                  Welcome! Please complete your registration:
                </div>
              </div>
            )}
            {(phase === "bot-reply-2" || phase === "tap-url") && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-[92%] relative overflow-hidden">
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-card border border-border text-xs">
                    <div className="flex items-center gap-1.5 text-[#2AABEE] break-all leading-relaxed">
                      <Globe className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="underline">fajrmission.org/telegram-patient/37c3a826...</span>
                    </div>
                  </div>
                  {phase === "tap-url" && (
                    <>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-foreground/20 animate-ping z-10" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground/30 z-10" />
                      <div className="absolute inset-0 bg-primary/15 animate-pulse rounded-2xl" />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="bg-card border-t border-border px-3 py-2 flex items-center gap-2 z-10">
            <div className="flex-1 h-8 bg-muted rounded-full px-3 flex items-center">
              {phase === "typing-hi" && typedText ? (
                <span className="text-[11px] text-foreground">{typedText}<span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-px" /></span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Message...</span>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-[#2AABEE] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          </div>
          <VirtualKeyboard visible={phase === "typing-hi"} />
        </div>

        {/* ===== SCREEN 4: Intake Form ===== */}
        <div
          className="absolute inset-0 flex flex-col transition-all duration-500 ease-in-out"
          style={{
            transform: getScreenTransform("form", activeScreen),
            opacity: activeScreen === "form" ? 1 : 0,
          }}
        >
          <div className="bg-card p-3.5 border-b border-border shadow-sm z-10 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm font-aleo text-foreground">Patient Registration</div>
              <div className="text-[10px] text-muted-foreground">fajrmission.org</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-card border-b border-border">
            <Globe className="w-3 h-3 text-muted-foreground" />
            {["English", "العربية", "پښتو", "فارسی"].map((lang) => (
              <span
                key={lang}
                className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                  lang === "العربية"
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {lang}
              </span>
            ))}
          </div>
          <div className="flex-1 overflow-hidden p-3.5 space-y-2.5 bg-muted/30">
            {[
              { label: "First Name", value: "أحمد", arLabel: "الاسم الأول" },
              { label: "Last Name", value: "محمد", arLabel: "اسم العائلة" },
              { label: "Phone", value: "+962 7XX XXX XX", arLabel: "رقم الهاتف" },
              { label: "Date of Birth", value: "15 / 03 / 1985", arLabel: "تاريخ الميلاد" },
              { label: "Country / City", value: "Jordan — Amman", arLabel: "البلد / المدينة" },
              { label: "Chief Complaint", value: "ألم في الركبة اليمنى منذ ٣ أشهر", arLabel: "الشكوى الرئيسية", multiline: true },
            ].map((field, i) => {
              const isFilled = filledFields > i;
              return (
                <div key={field.label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">{field.label}</span>
                    <span className="text-[9px] text-muted-foreground/60" dir="rtl">{field.arLabel}</span>
                  </div>
                  <div
                    className={`bg-card border rounded-lg px-2.5 text-xs transition-all duration-300 ${
                      isFilled
                        ? "border-primary/30 text-foreground"
                        : "border-border text-muted-foreground/40"
                    } ${field.multiline ? "py-2 min-h-[40px]" : "py-2"}`}
                    style={{ direction: isFilled && i !== 2 && i !== 3 && i !== 4 ? "rtl" : "ltr" }}
                  >
                    {isFilled ? field.value : ""}
                    {!isFilled && i === filledFields && (
                      <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })}
            <button
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                phase === "form-submitted"
                  ? "bg-green-500 text-white scale-95"
                  : filledFields >= 6
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {phase === "form-submitted" ? "✓ Submitted!" : "Submit Registration"}
            </button>
          </div>
        </div>

        {/* ===== SCREEN 5: Confirmation ===== */}
        <div
          className="absolute inset-0 flex flex-col transition-all duration-500 ease-in-out"
          style={{
            transform: getScreenTransform("confirmation", activeScreen),
            opacity: activeScreen === "confirmation" ? 1 : 0,
          }}
        >
          <div className="bg-[#2AABEE] p-4 flex items-center gap-3 shadow-sm z-10">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Fajr MedFlow Bot</div>
              <div className="text-[11px] text-white/70">Patient Intake</div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-3 space-y-2.5 bg-[#e5ddd5]/30 dark:bg-muted/20">
            <div className="opacity-40 space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[78%] px-3 py-2 rounded-2xl rounded-tr-sm bg-[#EEFFDE] dark:bg-green-900/40 text-foreground text-xs">
                  hi
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[78%] px-3 py-1.5 rounded-2xl rounded-tl-sm bg-card border border-border text-xs text-muted-foreground">
                  Welcome! Please complete your registration:
                </div>
              </div>
            </div>
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="max-w-[88%] px-3 py-2.5 rounded-2xl rounded-tl-sm bg-card border border-border text-foreground text-xs leading-relaxed">
                Thank you, Ahmad! Your registration is complete. A member of our medical team will reach out to you soon.
              </div>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-3 mx-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-xs font-bold text-green-800 dark:text-green-400">Patient Chart Created</span>
                </div>
                <div className="space-y-1 ml-8">
                  <div className="flex items-center gap-1.5 text-[10px] text-green-700/70 dark:text-green-400/60">
                    <Bell className="w-3 h-3" />
                    <span>Triage team notified</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-green-700/70 dark:text-green-400/60">
                    <ClipboardList className="w-3 h-3" />
                    <span>Ready for review in patient dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-card border-t border-border px-3 py-2.5 flex items-center gap-2">
            <div className="flex-1 h-8 bg-muted rounded-full px-3 flex items-center">
              <span className="text-[11px] text-muted-foreground">Message...</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#2AABEE] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          </div>
        </div>
      </MobileFrame>

      {/* ===== Controls bar ===== */}
      {showControls && (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-300">
          {/* Prev */}
          {showNav && (
            <ControlTooltip text="Previous screen" show={tipPrev}>
              <button
                onClick={() => handleManualNav("prev")}
                disabled={manualMode && manualIndex === 0}
                onMouseEnter={() => setTipPrev(true)}
                onMouseLeave={() => setTipPrev(false)}
                className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </ControlTooltip>
          )}

          {/* Speed toggle */}
          <ControlTooltip text={isSlowMode ? "Normal speed" : "Half speed"} show={tipSpeed}>
            <button
              onClick={handleSpeedToggle}
              onMouseEnter={() => setTipSpeed(true)}
              onMouseLeave={() => setTipSpeed(false)}
              className={`w-8 h-7 rounded-full border flex items-center justify-center text-[9px] font-bold transition-colors ${
                isSlowMode
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              .5x
            </button>
          </ControlTooltip>

          {/* Restart */}
          <ControlTooltip text="Restart animation" show={tipRestart}>
            <button
              onClick={handleRestart}
              onMouseEnter={() => setTipRestart(true)}
              onMouseLeave={() => setTipRestart(false)}
              className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </ControlTooltip>

          {/* Next */}
          {showNav && (
            <ControlTooltip text="Next screen" show={tipNext}>
              <button
                onClick={() => handleManualNav("next")}
                disabled={manualMode && manualIndex === MANUAL_SCREENS.length - 1}
                onMouseEnter={() => setTipNext(true)}
                onMouseLeave={() => setTipNext(false)}
                className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </ControlTooltip>
          )}

          {/* Screen indicator dots */}
          {showNav && (
            <div className="flex items-center gap-1 ml-1">
              {MANUAL_SCREENS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    (manualMode ? manualIndex : MANUAL_SCREENS.length - 1) === i
                      ? "w-1.5 h-1.5 bg-primary"
                      : "w-1 h-1 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
