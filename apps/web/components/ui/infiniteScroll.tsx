// apps/web/components/ui/InfiniteScroll.tsx

import React, { useEffect, useRef, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  isLoading?: boolean;
  next: () => void;
  dataLength: number;
  threshold?: number;
  className?: string;
  loader?: React.ReactNode;
  endMessage?: React.ReactNode;
  showGradient?: boolean;
  height?: string;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasMore,
  isLoading,
  next,
  threshold = 300,
  className = "",
  loader,
  endMessage,
  showGradient = false,
  height = "600px",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showBounceAnimation, setShowBounceAnimation] = useState(false);
  const lastScrollTop = useRef(0);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Only trigger if scrolling down
    if (scrollTop < lastScrollTop.current) {
      lastScrollTop.current = scrollTop;
      return;
    }
    lastScrollTop.current = scrollTop;

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Trigger load more when near bottom
    if (distanceFromBottom < threshold && hasMore && !isLoading) {
      next();
    }

    // Show bounce animation when reaching the bottom
    if (distanceFromBottom < 1 && !hasMore) {
      setShowBounceAnimation(true);
      setTimeout(() => setShowBounceAnimation(false), 500);
    }
  }, [hasMore, isLoading, next, threshold]);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.addEventListener("scroll", handleScroll, {
        passive: true,
      });

      // Check if content is already scrollable on mount
      const checkScrollable = () => {
        if (currentContainer) {
          const { scrollHeight, clientHeight } = currentContainer;
          if (scrollHeight <= clientHeight && hasMore && !isLoading) {
            // Content doesn't fill container, load more
            next();
          }
        }
      };

      // Check after a short delay to ensure content has rendered
      setTimeout(checkScrollable, 100);
    }

    return () => {
      if (currentContainer) {
        currentContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll, hasMore, isLoading, next]);

  return (
    <div className="relative w-full rounded-md">
      <div
        ref={containerRef}
        style={{ maxHeight: height }}
        className={`overflow-y-auto overflow-x-hidden ${className}`}
      >
        {children}

        {isLoading && loader ? (
          loader
        ) : isLoading ? (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {!hasMore && endMessage && endMessage}

        {showBounceAnimation && (
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-20, 0] }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="h-16"
          />
        )}
      </div>
      {showGradient && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none rounded-b-md" />
      )}
    </div>
  );
};

export default InfiniteScroll;
