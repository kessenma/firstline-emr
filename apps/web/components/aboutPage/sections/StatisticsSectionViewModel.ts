"use client";

import { useEffect, useRef, useCallback } from 'react';

export interface StatisticItem {
  id: string;
  targetValue: number;
  duration?: number;
}

/**
 * Statistics Section ViewModel
 * Handles the counter animation logic using IntersectionObserver
 */
export function useStatisticsSectionViewModel(statistics: StatisticItem[]) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedRef = useRef(false);

  /**
   * Animates a counter from 0 to target value
   */
  const animateCountUp = useCallback((elementId: string, target: number, duration: number = 2000) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const start = 0;
    const increment = Math.ceil(target / (duration / 50));
    let current = start;

    const updateCounter = () => {
      current += increment;
      if (current > target) current = target;
      element.innerText = current.toString();

      if (current < target) {
        setTimeout(updateCounter, 50);
      }
    };

    updateCounter();
  }, []);

  /**
   * Handle intersection observer callback
   */
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasAnimatedRef.current) {
        hasAnimatedRef.current = true;

        // Animate all statistics
        statistics.forEach(stat => {
          animateCountUp(stat.id, stat.targetValue, stat.duration);
        });

        // Disconnect observer after animation starts
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      }
    });
  }, [statistics, animateCountUp]);

  /**
   * Setup intersection observer
   */
  useEffect(() => {
    if (!targetRef.current) return;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.3,
    });

    observerRef.current.observe(targetRef.current);

    // Cleanup on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection]);

  return {
    targetRef,
  };
}
