// apps/web/hooks/useInfiniteScroll.ts
"use client";

import { useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Custom hook for implementing infinite scroll using Intersection Observer API
 *
 * @param options - Configuration options for infinite scroll behavior
 * @returns Ref to attach to the sentinel element at the bottom of the list
 *
 * @example
 * ```tsx
 * const observerTarget = useInfiniteScroll({
 *   hasNextPage,
 *   isFetchingNextPage,
 *   fetchNextPage,
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={observerTarget} />
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = "100px",
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleObserver: IntersectionObserverCallback = (entries) => {
      const [entry] = entries;

      // Trigger fetch when the sentinel element is visible
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        console.log("[useInfiniteScroll] Triggering fetchNextPage");
        fetchNextPage();
      }
    };

    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null, // viewport
      rootMargin,
      threshold,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin, threshold]);

  return observerTarget;
}
