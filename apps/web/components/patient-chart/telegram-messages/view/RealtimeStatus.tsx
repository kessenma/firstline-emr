// apps/web/components/patient-chart/telegram-messages/view/RealtimeStatus.tsx

"use client";

import React from "react";
import { Activity, Wifi, WifiOff, RefreshCw } from "lucide-react";

interface RealtimeStatusProps {
  isConnected: boolean;
  useRealtime: boolean;
  onReconnect?: () => void;
  onToggleMode?: (enabled: boolean) => void;
  className?: string;
}

/**
 * Component to display real-time connection status for telegram messages
 *
 * Shows:
 * - Connection status (live/polling/disconnected)
 * - Manual reconnect button
 * - Toggle between real-time and polling modes
 */
export function RealtimeStatus({
  isConnected,
  useRealtime,
  onReconnect,
  onToggleMode,
  className = "",
}: RealtimeStatusProps) {
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  const handleReconnect = async () => {
    if (onReconnect) {
      setIsReconnecting(true);
      onReconnect();
      // Reset after 2 seconds
      setTimeout(() => setIsReconnecting(false), 2000);
    }
  };

  // Determine status
  const getStatus = () => {
    if (useRealtime && isConnected) {
      return {
        label: "Live",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        icon: Activity,
        description: "Real-time updates enabled",
      };
    }
    if (useRealtime && !isConnected) {
      return {
        label: "Connecting",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        icon: RefreshCw,
        description: "Attempting to connect...",
      };
    }
    return {
      label: "Polling",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      icon: WifiOff,
      description: "Using fallback mode",
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${status.bgColor} ${status.borderColor} ${className}`}
      title={status.description}
    >
      {/* Status Indicator */}
      <div className="flex items-center gap-1.5">
        <StatusIcon
          className={`h-3.5 w-3.5 ${status.color} ${
            isConnected && useRealtime ? "animate-pulse" : ""
          }`}
        />
        <span className={`text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Divider */}
      <div className={`h-4 w-px ${status.borderColor}`} />

      {/* Reconnect Button */}
      {useRealtime && !isConnected && onReconnect && (
        <button
          onClick={handleReconnect}
          disabled={isReconnecting}
          className={`
            text-xs font-medium transition-colors
            ${status.color}
            hover:opacity-70
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="Reconnect to real-time server"
        >
          {isReconnecting ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            "Reconnect"
          )}
        </button>
      )}

      {/* Mode Toggle */}
      {onToggleMode && (
        <button
          onClick={() => onToggleMode(!useRealtime)}
          className={`
            text-xs font-medium transition-colors
            ${status.color}
            hover:opacity-70
          `}
          title={
            useRealtime
              ? "Switch to polling mode"
              : "Switch to real-time mode"
          }
        >
          {useRealtime ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Compact version - just an indicator dot
 */
export function RealtimeStatusDot({
  isConnected,
  useRealtime,
  className = "",
}: {
  isConnected: boolean;
  useRealtime: boolean;
  className?: string;
}) {
  const getColor = () => {
    if (useRealtime && isConnected) return "bg-green-500";
    if (useRealtime && !isConnected) return "bg-yellow-500 animate-pulse";
    return "bg-blue-500";
  };

  const getLabel = () => {
    if (useRealtime && isConnected) return "Live";
    if (useRealtime && !isConnected) return "Connecting";
    return "Polling";
  };

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      title={getLabel()}
    >
      <div className={`h-2 w-2 rounded-full ${getColor()}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {getLabel()}
      </span>
    </div>
  );
}

/**
 * Banner version - shows at top of message list
 */
export function RealtimeStatusBanner({
  isConnected,
  useRealtime,
  onReconnect,
  onDismiss,
}: {
  isConnected: boolean;
  useRealtime: boolean;
  onReconnect?: () => void;
  onDismiss?: () => void;
}) {
  // Only show banner if using real-time but not connected
  if (!useRealtime || isConnected) return null;

  return (
    <div className="w-full bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">
            Reconnecting to live updates...
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="text-sm font-medium text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200"
            >
              Retry now
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
