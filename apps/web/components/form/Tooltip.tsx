// apps/web/components/form/Tooltip.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/classNames';

interface TooltipProps {
  children: React.ReactNode;
  tooltipText?: string;
  content?: React.ReactNode;
  showTooltip: boolean;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, tooltipText, content, showTooltip, className }) => {
  return (
      <div className={cn("relative", className)}>
        {children}
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-popover text-popover-foreground text-sm rounded py-2 px-3 z-50 border border-border shadow-md"
            style={{ textTransform: 'none', maxWidth: 'min(400px, 90vw)' }}
          >
            {content ?? tooltipText}
          </motion.div>
        )}
      </div>
  );
};

export default Tooltip;
