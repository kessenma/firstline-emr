"use client";

import { motion } from "framer-motion";
import { ArrowRightLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { getRoleCssVar } from "@fajr/shared/theme";

interface RotatingArrowsProps {
  isRotating?: boolean;
  size?: number;
  className?: string;
}

export function RotatingArrows({
  isRotating = false,
  size = 20,
  className = "",
}: RotatingArrowsProps) {
  const { data: session } = useSession();
  const accountType = session?.user?.accountType;

  return (
    <motion.div
      animate={{
        rotate: isRotating ? 360 : 0,
      }}
      transition={{
        duration: 2,
        repeat: isRotating ? Infinity : 0,
        ease: "linear",
      }}
      className={`text-foreground ${className}`}
      style={accountType ? { color: getRoleCssVar(accountType) } : undefined}
    >
      <ArrowRightLeft size={size} />
    </motion.div>
  );
}
