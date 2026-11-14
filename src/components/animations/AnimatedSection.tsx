import React, { useLayoutEffect, useRef, useState } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  /** Extra delay before the entrance, in ms (capped at 150 so scrolling never waits). */
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Entrance length in ms. */
  duration?: number;
  className?: string;
  /** Kept for API compatibility; the entrance starts as soon as the section's top edge is on screen. */
  threshold?: number;
}

/**
 * Sections that have already played their entrance during this page load. Remembered at
 * module level, so leaving the homepage and coming back (client-side navigation) keeps
 * them static; only a full reload replays the entrances.
 */
const played = new Set<string>();

/** Start once the section's top edge is ~8% inside the viewport, so the entrance is seen. */
const ENTRANCE_TRIGGER = '0px 0px -8% 0px';
const MAX_DELAY_MS = 150;
/** Last staggered card: 120ms + 7 × 70ms delay + 600ms animation (see .tn-reveal-in in index.css). */
const CASCADE_MS = 1210;

const FROM: Record<NonNullable<AnimatedSectionProps['direction']>, string> = {
  up: 'translateY(28px) scale(0.985)',
  down: 'translateY(-28px) scale(0.985)',
  left: 'translateX(28px) scale(0.985)',
  right: 'translateX(-28px) scale(0.985)',
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll-driven entrance: each section "launches" (rises, fades in, its card grid cascades)
 * the moment you scroll it into view — then stays static for the rest of the visit.
 * Plays immediately with no long delay; fully visible without IntersectionObserver or
 * with prefers-reduced-motion.
 */
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  delay = 0,
  direction = 'up',
  duration = 700,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'static' | 'waiting' | 'entering'>('waiting');

  // Runs before the browser paints, so a section that already played is never shown hidden.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Stable identity across remounts: page path + this section's position on the page.
    const index = [...document.querySelectorAll('[data-tn-reveal]')].indexOf(el);
    const key = `${window.location.pathname}#${index}`;
    if (played.has(key) || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      played.add(key);
      setState('static');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        played.add(key);
        setState('entering');
        io.disconnect();
      },
      { rootMargin: ENTRANCE_TRIGGER, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After the whole cascade (section + staggered cards) has finished, drop the animation
  // classes so the section is plain static content again. This matters: an element holding
  // a transform animation becomes the containing block for position:fixed children, which
  // would mis-place any modal rendered inside the section.
  useLayoutEffect(() => {
    if (state !== 'entering') return;
    const t = window.setTimeout(() => setState('static'), Math.min(delay, MAX_DELAY_MS) + Math.max(duration, CASCADE_MS) + 50);
    return () => window.clearTimeout(t);
  }, [state, delay, duration]);

  const cls =
    state === 'waiting' ? 'tn-reveal-waiting' : state === 'entering' ? 'tn-reveal-in' : '';

  return (
    <div
      ref={ref}
      data-tn-reveal=""
      className={[className, cls].filter(Boolean).join(' ') || undefined}
      style={
        {
          '--tn-from': FROM[direction],
          '--tn-dur': `${duration}ms`,
          '--tn-delay': `${Math.min(delay, MAX_DELAY_MS)}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
