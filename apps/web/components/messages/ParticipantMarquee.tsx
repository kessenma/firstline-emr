// apps/web/components/messages/ParticipantMarquee.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";

interface Participant {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface ParticipantMarqueeProps {
  participants: Participant[];
  speed?: number;
  pauseOnHover?: boolean;
  className?: string;
}

const ANIMATION_CONFIG = {
  SMOOTH_TAU: 0.25,
  MIN_COPIES: 2,
  COPY_HEADROOM: 2,
};

const getParticipantId = (participant: Participant, index: number): string => {
  return participant._id || participant.id || participant.email || `participant-${index}`;
};

const getParticipantInitials = (participant: Participant): string => {
  const firstName = participant.firstName || "";
  const lastName = participant.lastName || "";

  if (firstName && lastName) {
    return `${firstName[0].toUpperCase()}${lastName[0].toUpperCase()}`;
  } else if (firstName) {
    return firstName[0].toUpperCase();
  } else if (participant.email) {
    return participant.email[0].toUpperCase();
  }
  return "?";
};

const getParticipantName = (participant: Participant): string => {
  const fullName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
  return fullName || participant.email || "Unknown";
};

export const ParticipantMarquee = memo(({
  participants,
  speed = 40,
  pauseOnHover = true,
  className,
}: ParticipantMarqueeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<HTMLDivElement>(null);

  const [seqWidth, setSeqWidth] = useState(0);
  const [copyCount, setCopyCount] = useState(ANIMATION_CONFIG.MIN_COPIES);
  const [isHovered, setIsHovered] = useState(false);

  const targetVelocity = speed;
  const effectiveHoverSpeed = pauseOnHover ? 0 : speed;

  // Measure and update dimensions
  const updateDimensions = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const sequenceWidth = seqRef.current?.getBoundingClientRect?.()?.width ?? 0;

    if (sequenceWidth > 0) {
      setSeqWidth(Math.ceil(sequenceWidth));
      const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
      setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
    }
  }, []);

  // Resize observer
  useEffect(() => {
    if (!window.ResizeObserver) {
      const handleResize = () => updateDimensions();
      window.addEventListener("resize", handleResize);
      updateDimensions();
      return () => window.removeEventListener("resize", handleResize);
    }

    const observers: ResizeObserver[] = [];

    if (containerRef.current) {
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(containerRef.current);
      observers.push(observer);
    }

    if (seqRef.current) {
      const observer = new ResizeObserver(updateDimensions);
      observer.observe(seqRef.current);
      observers.push(observer);
    }

    updateDimensions();

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [updateDimensions, participants]);

  // Animation loop
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafRef: number | null = null;
    let lastTimestamp: number | null = null;
    let offset = 0;
    let velocity = 0;

    if (seqWidth > 0) {
      offset = ((offset % seqWidth) + seqWidth) % seqWidth;
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }

    if (prefersReduced) {
      track.style.transform = "translate3d(0, 0, 0)";
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaTime = Math.max(0, timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      const target = isHovered ? effectiveHoverSpeed : targetVelocity;

      const easingFactor = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
      velocity += (target - velocity) * easingFactor;

      if (seqWidth > 0) {
        let nextOffset = offset + velocity * deltaTime;
        nextOffset = ((nextOffset % seqWidth) + seqWidth) % seqWidth;
        offset = nextOffset;

        track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      }

      rafRef = requestAnimationFrame(animate);
    };

    rafRef = requestAnimationFrame(animate);

    return () => {
      if (rafRef !== null) {
        cancelAnimationFrame(rafRef);
      }
    };
  }, [targetVelocity, seqWidth, isHovered, effectiveHoverSpeed]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Render participant items
  const renderParticipant = useCallback((participant: Participant, index: number, copyIndex: number) => (
    <div
      key={`${copyIndex}-${getParticipantId(participant, index)}`}
      className="flex items-center gap-1.5 px-2 flex-shrink-0"
      title={getParticipantName(participant)}
    >
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
        {getParticipantInitials(participant)}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {getParticipantName(participant)}
      </span>
    </div>
  ), []);

  const trackContent = useMemo(() => (
    Array.from({ length: copyCount }, (_, copyIndex) => (
      <div
        key={`copy-${copyIndex}`}
        ref={copyIndex === 0 ? seqRef : undefined}
        className="flex items-center"
        aria-hidden={copyIndex > 0}
      >
        {participants.map((participant, index) => renderParticipant(participant, index, copyIndex))}
      </div>
    ))
  ), [copyCount, participants, renderParticipant]);

  if (participants.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden flex-1 mx-2 ${className || ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Fade edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-background to-transparent"
      />

      {/* Scrolling track */}
      <div
        ref={trackRef}
        className="flex will-change-transform select-none"
      >
        {trackContent}
      </div>
    </div>
  );
});

ParticipantMarquee.displayName = "ParticipantMarquee";
