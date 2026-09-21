"use client";

import React from "react";
import { Camera, Mic, Languages, Wifi } from "lucide-react";
import { MobileFrame } from "../MobileFrame";

export const messagingMeta = {
  id: "messaging",
  title: "Secure Patient Messaging",
  description:
    "Message patients directly through Telegram — send text, photos, voice notes, and videos without sharing personal numbers. Built-in Arabic↔English translation keeps communication clear.",
};

const messages = [
  {
    from: "patient",
    text: "السلام عليكم دكتور، ركبتي ما زالت تؤلمني بعد العملية",
    translation: "Peace be upon you doctor, my knee still hurts after the surgery",
    time: "10:32 AM",
  },
  {
    from: "patient",
    text: "هل هذا طبيعي؟",
    translation: "Is this normal?",
    time: "10:32 AM",
  },
  {
    from: "doctor",
    text: "Some swelling is expected for the first 2 weeks. Are you keeping it elevated and using ice?",
    time: "10:45 AM",
  },
  {
    from: "patient",
    text: "نعم أفعل ذلك. شكراً دكتور",
    translation: "Yes I am doing that. Thank you doctor",
    time: "10:47 AM",
  },
  {
    from: "doctor",
    text: "Great. Send me a photo of the incision site so I can check it.",
    time: "10:48 AM",
  },
];

export function MessagingVisual({ isActive }: { isActive?: boolean }) {
  const [showTranslation, setShowTranslation] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isActive) {
      setShowTranslation(null);
      return;
    }

    // Auto-show translation on the first patient message after a delay
    const timer = setTimeout(() => setShowTranslation(0), 1500);
    return () => clearTimeout(timer);
  }, [isActive]);

  return (
    <MobileFrame>
      {/* Header */}
      <div className="bg-card p-3.5 border-b border-border flex items-center gap-3 shadow-sm z-10">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shadow-inner">
          A
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm font-aleo">Ahmad Mohammad</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-muted-foreground">Connected via Telegram</span>
          </div>
        </div>
        <button
          className={`p-1.5 rounded-lg transition-colors ${
            showTranslation !== null ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setShowTranslation(showTranslation !== null ? null : 0)}
        >
          <Languages className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden p-3 space-y-2.5 bg-muted/20">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "doctor" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[82%]">
              <div
                className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  msg.from === "doctor"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border text-foreground rounded-tl-sm"
                }`}
                style={{ direction: msg.from === "patient" ? "rtl" : "ltr" }}
              >
                {msg.text}
              </div>
              {/* Translation tooltip */}
              {msg.from === "patient" && "translation" in msg && showTranslation !== null && (
                <div className="mt-1 px-2.5 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-[10px] text-primary leading-snug">
                  <span className="font-medium">EN:</span> {msg.translation}
                </div>
              )}
              <div className={`text-[9px] text-muted-foreground mt-0.5 ${msg.from === "doctor" ? "text-right" : "text-left"}`}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="bg-card border-t border-border px-2.5 py-2 flex items-center gap-2">
        <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
          <Camera className="w-5 h-5" />
        </button>
        <div className="flex-1 h-9 bg-muted rounded-full px-3 flex items-center">
          <span className="text-[11px] text-muted-foreground">Type a message...</span>
        </div>
        <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
          <Mic className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
      </div>
    </MobileFrame>
  );
}
