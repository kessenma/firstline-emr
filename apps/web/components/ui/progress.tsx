import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/classNames";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
  animated?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      indicatorClassName,
      animated = true,
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const isComplete = percentage === 100;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={`${Math.round(percentage)}% complete`}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-secondary h-2.5",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-in-out relative",
            indicatorClassName,
          )}
          style={{
            width: `${percentage}%`,
            background: isComplete
              ? "#10b981"
              : "linear-gradient(90deg, #3b82f6, #60a5fa)",
          }}
        >
          {animated && percentage < 100 && percentage > 0 && (
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: "100%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
              }}
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
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
  },
);
Progress.displayName = "Progress";

export { Progress };
