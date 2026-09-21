"use client";

import React from "react";
import { motion } from "framer-motion";

interface TelegramProgressBarProps {
  progress: number;
}

export const TelegramProgressBar: React.FC<TelegramProgressBarProps> = ({
  progress,
}) => {
  return (
    <div className="w-full bg-muted rounded-full h-2.5 mb-4 relative overflow-hidden">
      <div
        className="h-2.5 rounded-full transition-all duration-300 ease-in-out relative"
        style={{
          width: `${progress}%`,
          background:
            progress === 100
              ? "hsl(177, 45%, 41%)" // teal-500
              : "linear-gradient(90deg, hsl(177, 45%, 41%), hsl(177, 46%, 76%))", // teal-500 to teal-200
        }}
      >
        {progress < 100 && (
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: "100%",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.2), rgba(255,255,255,0))",
              x: -100,
            }}
            animate={{
              x: 100,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </div>
    </div>
  );
};
