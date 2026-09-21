'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/hooks/useToast';

interface CopyButtonProps {
  textToCopy: string;
  label: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const CopyButton: React.FC<CopyButtonProps> = ({ 
  textToCopy, 
  label, 
  className,
  variant = "outline",
  size = "icon"
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const { setToast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling if used inside other clickable elements
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setToast({
        title: "Copied!",
        description: `${label} has been copied to clipboard.`,
        variant: "success",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setToast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className={`relative overflow-hidden ${className || ''}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isCopied ? (
          <motion.div
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Check className="w-4 h-4 text-teal-500" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Copy className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};
