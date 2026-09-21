import React from "react";
import { CircleLoader } from "react-spinners";
import { motion, AnimatePresence } from "framer-motion";
import { getRoleShadeClasses } from "@/components/ui/RoleIcon";

interface StackedLoaderProps {
  /** Any account type; unknown or omitted falls back to the neutral palette. */
  accountType?: string | null;
  size?: number;
  show?: boolean;
}

const DEFAULT_LOADER_COLORS = [
  "text-destructive",
  "text-accent-foreground",
  "text-primary",
];

const StackedLoader: React.FC<StackedLoaderProps> = ({
  accountType,
  size = 150,
  show = true,
}) => {
  const loaderColors = getRoleShadeClasses(accountType) ?? DEFAULT_LOADER_COLORS;
  const containerSize = size * 2;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="relative"
          style={{ width: containerSize, height: containerSize }}
        >
          {loaderColors.map((colorClass, index) => {
            const rotation = index * 20; // 20 degrees rotation for each loader
            return (
              <motion.div
                key={index}
                className={`absolute inset-0 flex items-center justify-center ${colorClass}`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  zIndex: index + 1,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <CircleLoader color="currentColor" size={size} />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StackedLoader;
