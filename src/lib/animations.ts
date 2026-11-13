import { useEffect, useState, useRef, RefObject, useCallback } from 'react';

/**
 * Animation progress hook — animates 0 → 1 smoothly over `duration` ms
 * using requestAnimationFrame with ease-out cubic.
 */
export const useAnimProgress = (duration: number = 1200) => {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const startTime = performance.now();

    const animate = (now: number) => {
      const ratio = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3); // ease-out cubic
      setProgress(eased);

      if (ratio < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [duration]);

  return { progress };
};

/**
 * Mouse position hook - returns { x, y } coordinates relative to viewport.
 * Throttled via rAF to avoid excessive re-renders.
 */
export const useMousePosition = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let frame = 0;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return position;
};

/**
 * On-screen hook — IntersectionObserver-based viewport detection.
 * Returns [ref, isIntersecting]. Element stays "seen" once visible
 * (one-shot mode by default, so entrance animations don't reverse).
 */
export const useOnScreen = <T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
  oneShot: boolean = true
): [RefObject<T | null>, boolean] => {
  const ref = useRef<T | null>(null);
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIntersecting(true);
        if (oneShot) observer.unobserve(element);
      } else if (!oneShot) {
        setIntersecting(false);
      }
    }, options);

    observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, isIntersecting];
};

/**
 * Long press hook — fires callback after holding for `ms` milliseconds.
 */
export const useLongPress = (callback: () => void, ms: number = 600) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const start = useCallback(() => {
    setIsPressed(true);
    timerRef.current = setTimeout(() => {
      callback();
      setIsPressed(false);
    }, ms);
  }, [callback, ms]);

  const cancel = useCallback(() => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handlers = {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
  };

  return { handlers, isPressed };
};

/**
 * Animated number counter hook — smoothly counts from 0 to `target`
 * over `duration` ms when the component mounts (or target changes).
 */
export const useCountUp = (target: number, duration: number = 1200) => {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const startTime = performance.now();

    const animate = (now: number) => {
      const ratio = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      const current = from + (target - from) * eased;
      setValue(current);

      if (ratio < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
};
