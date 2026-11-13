import React from 'react';
import { useOnScreen } from '@/lib/animations';

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
  threshold?: number;
}

/**
 * Scroll-triggered section animation wrapper.
 * Reveals children with a directional slide + fade when scrolled into view.
 * Honors prefers-reduced-motion via the global CSS override in index.css.
 */
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  delay = 0,
  direction = 'up',
  duration = 600,
  className,
  threshold = 0.1
}) => {
  const [ref, isVisible] = useOnScreen<HTMLDivElement>({ threshold });

  const getOffset = () => {
    const offset = 40;
    switch (direction) {
      case 'up': return `translateY(${offset}px)`;
      case 'down': return `translateY(-${offset}px)`;
      case 'left': return `translateX(${offset}px)`;
      case 'right': return `translateX(-${offset}px)`;
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : getOffset(),
        transition: `opacity ${duration}ms var(--ease-out) ${delay}ms, transform ${duration}ms var(--ease-out) ${delay}ms`,
        willChange: 'opacity, transform'
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
