// apps/web/components/patient-chart/telegram-messages/view/MessageRenderer.tsx
import type React from "react";
import Image from "next/image";
import { Loader2, Languages, ArrowLeftRight } from "lucide-react";
import { CircleLoader } from "react-spinners";
import ReactMarkdown from "react-markdown";
import { AudioNotePlayer } from "@/components/messages/AudioNotePlayer";
import type { TelegramMessage } from "../view-model/types";

interface MessageRendererProps {
  message: TelegramMessage;
  decryptedImages: { [key: string]: string };
  onToggleTranslation?: (messageId: string) => void;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  decryptedImages,
  onToggleTranslation,
}) => {
  if (message.type === "image") {
    return renderImage(message, decryptedImages);
  } else if (message.type === "audio") {
    return renderAudioPlayer(message);
  } else {
    const showTranslated = message.showTranslated ?? false;
    const hasOriginal = !!message.originalMessage;
    const hasArabic =
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
        message.text,
      );

    // For self messages with originalMessage: toggle between Arabic (text) and English (originalMessage)
    // For received messages with translatedText: toggle between Arabic (text) and English (translatedText)
    let displayText = message.text;
    if (hasOriginal && showTranslated) {
      displayText = message.originalMessage!;
    } else if (!hasOriginal && showTranslated && message.translatedText) {
      displayText = message.translatedText;
    }

    const canToggle = hasOriginal || message.isTranslated;

    return (
      <div className="relative">
        {/* Translation indicators */}
        {canToggle && (
          <div className="absolute -top-1 -right-1 flex items-center gap-1">
            {hasOriginal ? (
              // Self message that was translated before sending
              showTranslated ? (
                <div className="bg-primary px-1.5 py-0.5 rounded-full text-xs text-primary-foreground flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  EN
                </div>
              ) : (
                <div className="bg-accent px-1.5 py-0.5 rounded-full text-xs text-accent-foreground flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  AR
                </div>
              )
            ) : message.isTranslated ? (
              // Received message with post-receive translation
              showTranslated ? (
                <div className="bg-primary px-1.5 py-0.5 rounded-full text-xs text-primary-foreground flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  EN
                </div>
              ) : hasArabic ? (
                <div className="bg-accent px-1.5 py-0.5 rounded-full text-xs text-accent-foreground flex items-center gap-1">
                  <Languages className="w-3 h-3" />
                  AR
                </div>
              ) : null
            ) : null}
          </div>
        )}

        {/* Toggle button */}
        {canToggle && onToggleTranslation && (
          <button
            onClick={() => onToggleTranslation(message._id)}
            className="absolute -bottom-1 -right-1 bg-muted hover:bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-full text-xs transition-colors flex items-center gap-1 opacity-75 hover:opacity-100"
            title={showTranslated ? "Show original" : "Show translation"}
          >
            <ArrowLeftRight className="w-3 h-3" />
          </button>
        )}

        {/* Text content */}
        <div className="text-sm prose prose-sm max-w-none pr-8 pb-1">
          {displayText || ""}
        </div>
      </div>
    );
  }
};

const renderAudioPlayer = (message: TelegramMessage) => {
  if (!message.signedUrl) {
    return (
      <p>
        Loading audio... <Loader2 className="h-4 w-4 animate-spin" />
      </p>
    );
  }

  return (
    <div className="w-full p-0">
      <AudioNotePlayer mediaUrl={message.signedUrl} />
    </div>
  );
};

const renderImage = (
  message: TelegramMessage,
  decryptedImages: { [key: string]: string },
) => {
  if (message.encryptedMedia && message.encryptionKey) {
    const decryptedImageUrl = decryptedImages[message._id];
    if (!decryptedImageUrl) {
      return (
        <p>
          Decrypting image... <Loader2 className="h-4 w-4 animate-spin" />
        </p>
      );
    }
    return (
      <Image
        src={decryptedImageUrl || "/placeholder.svg"}
        alt={message.text || "Decrypted Image"}
        width={300}
        height={200}
        className="rounded-lg max-w-full h-auto"
      />
    );
  } else if (message.signedUrl) {
    return (
      <Image
        src={message.signedUrl || "/placeholder.svg"}
        alt={message.text || "Image"}
        width={300}
        height={200}
        className="rounded-lg max-w-full h-auto"
      />
    );
  }
  return <CircleLoader color="hsl(var(--foreground))" />;
};
