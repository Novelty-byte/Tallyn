import React, { useLayoutEffect, useRef, useState } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  /** Small extra delay in ms; capped so scrolling never waits on empty space. */
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
  /** Kept for API compatibility; reveal now starts before the section enters the viewport. */
  threshold?: number;
}

/** Start revealing a full screen-height early, so even a fast flick never lands on blank space. */
const REVEAL_AHEAD = '0px 0px 100% 0px';
const MAX_DELAY_MS = 120;
const OFFSET_PX = 16;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll reveal that never leaves the reader looking at blank space:
 *  - sections already on screen at first paint render immediately (no fade);
 *  - sections below start revealing a full screen-height before they scroll into view;
 *  - short, subtle motion (16px, 450ms) with delays capped at 120ms;
 *  - fully visible without IntersectionObserver or with prefers-reduced-motion.
 */
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  delay = 0,
  direction = 'up',
  duration = 450,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  // 'static' = render visible with no transition (above the fold / reduced motion / no IO).
  const [state, setState] = useState<'pending' | 'hidden' | 'shown' | 'static'>('pending');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setState('static');
      return;
    }
    // Measured before paint: anything already within (or just below) the viewport is shown as-is.
    if (el.getBoundingClientRect().top < window.innerHeight * 1.5) {
      setState('static');
      return;
    }
    setState('hidden');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown');
          io.disconnect();
        }
      },
      { rootMargin: REVEAL_AHEAD, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const offset = {
    up: `translateY(${OFFSET_PX}px)`,
    down: `translateY(-${OFFSET_PX}px)`,
    left: `translateX(${OFFSET_PX}px)`,
    right: `translateX(-${OFFSET_PX}px)`,
  }[direction];

  const hidden = state === 'hidden';
  const style: React.CSSProperties =
    state === 'static' || state === 'pending'
      ? {}
      : {
          opacity: hidden ? 0 : 1,
          transform: hidden ? offset : 'none',
          transition: `opacity ${duration}ms var(--ease-out), transform ${duration}ms var(--ease-out)`,
          transitionDelay: `${Math.min(delay, MAX_DELAY_MS)}ms`,
          willChange: hidden ? 'opacity, transform' : undefined,
        };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
};

export default AnimatedSection;
