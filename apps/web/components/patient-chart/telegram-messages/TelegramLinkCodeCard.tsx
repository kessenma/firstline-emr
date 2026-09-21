// apps/web/components/patient-chart/telegram-messages/TelegramLinkCodeCard.tsx
// Card shown when patient has no Telegram connection — generates a link code
// Supports QR codes, multi-language patient instructions, and language override

"use client";

import { useState, useCallback } from "react";
import { Link2, Copy, Check, RefreshCw, Loader2, Globe } from "lucide-react";
import QRCode from "qrcode";
import { getLinkCodeMessages, normalizeLanguage } from "@/utils/telegram/linkCodeMessages";
import {
  Languages,
  LanguagesList,
  isRtlLanguage,
} from "@fajr/shared/constants/languages";

// Native language labels for the selector
const nativeLabels: Record<Languages, string> = {
  [Languages.ENGLISH]: "English",
  [Languages.ARABIC]: "العربية",
  [Languages.FARSI]: "فارسی",
  [Languages.PASHTO]: "پښتو",
  [Languages.TURKISH]: "Türkçe",
  [Languages.URDU]: "اردو",
  [Languages.SPANISH]: "Español",
  [Languages.FRENCH]: "Français",
};


interface TelegramLinkCodeCardProps {
  patientId: string;
  patientName: string;
  patientLanguage?: string | null;
}

export default function TelegramLinkCodeCard({
  patientId,
  patientName,
  patientLanguage,
}: TelegramLinkCodeCardProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInstructions, setCopiedInstructions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Languages>(
    normalizeLanguage(patientLanguage),
  );
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "fajr_mission_bot";
  const isRtl = isRtlLanguage(selectedLanguage);

  const generateCode = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/patient/${patientId}/generate-telegram-link-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: selectedLanguage }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Failed to generate code");
        return;
      }

      const data = await response.json();
      setCode(data.code);
      setExpiresAt(data.expiresAt);

      // Generate QR code for Telegram deep link
      const deepLink = `https://t.me/${botUsername}?start=${data.code}`;
      const qr = await QRCode.toDataURL(deepLink, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 200,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(qr);
    } catch (err: any) {
      console.error("[TelegramLinkCodeCard] Error:", err);
      setError(err.message || "Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  }, [patientId, botUsername, selectedLanguage]);

  const copyCode = useCallback(() => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const copyInstructions = useCallback(() => {
    if (!code) return;
    const msgs = getLinkCodeMessages(selectedLanguage);
    navigator.clipboard.writeText(msgs.patientInstructions(code, botUsername));
    setCopiedInstructions(true);
    setTimeout(() => setCopiedInstructions(false), 2000);
  }, [code, selectedLanguage, botUsername]);

  const formatExpiry = (iso: string) => {
    const date = new Date(iso);
    const days = Math.ceil(
      (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days <= 0) return "Expired";
    if (days === 1) return "Expires tomorrow";
    return `Expires in ${days} days`;
  };

  const msgs = getLinkCodeMessages(selectedLanguage);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-4 overflow-y-auto">
      <Link2 className="w-10 h-10 text-muted-foreground" />

      <h3 className="text-lg font-semibold text-foreground">
        Connect to Telegram
      </h3>

      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Generate a code for {patientName} to send to the Telegram bot.
      </p>

      {!code ? (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={generateCode}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Generate Link Code
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          {/* Code display */}
          <div className="px-8 py-4 bg-card border-2 border-border rounded-2xl">
            <span className="text-4xl font-extrabold tracking-[0.4em] font-mono text-foreground">
              {code}
            </span>
          </div>

          {/* Copy button */}
          <button
            onClick={copyCode}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              copied ? "bg-green-500" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </button>

          {/* Expiry */}
          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              {formatExpiry(expiresAt)}
            </p>
          )}

          {/* QR Code */}
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Or scan this QR code to open Telegram:
              </p>
              <img
                src={qrDataUrl}
                alt="Telegram link QR code"
                className="w-48 h-48 rounded-lg border border-border"
              />
            </div>
          )}

          {/* Language override selector */}
          <div className="w-full relative">
            <button
              onClick={() => setShowLanguagePicker(!showLanguagePicker)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-left">
                Patient instructions: {nativeLabels[selectedLanguage]}
              </span>
              <svg
                className={`w-4 h-4 text-muted-foreground transition-transform ${showLanguagePicker ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLanguagePicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                {LanguagesList.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang as Languages);
                      setShowLanguagePicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                      selectedLanguage === lang
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground"
                    }`}
                  >
                    {nativeLabels[lang as Languages]} ({lang})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Patient instructions in selected language */}
          <div className="w-full p-4 bg-card border border-border rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">
                Patient Instructions ({nativeLabels[selectedLanguage]})
              </p>
              <button
                onClick={copyInstructions}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedInstructions ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedInstructions ? "Copied" : "Copy"}
              </button>
            </div>
            <p
              className="text-sm text-muted-foreground whitespace-pre-line"
              dir={isRtl ? "rtl" : "ltr"}
              style={{ textAlign: isRtl ? "right" : "left" }}
            >
              {msgs.patientInstructions(code, botUsername)}
            </p>
          </div>

          {/* Regenerate */}
          <button
            onClick={() => {
              setCode(null);
              setExpiresAt(null);
              setQrDataUrl(null);
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Generate new code
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
