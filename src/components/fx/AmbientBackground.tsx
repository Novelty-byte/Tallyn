import React, { useEffect, useRef } from "react";

type Variant = "hero" | "app" | "auth";

interface Props {
  variant?: Variant;
  /** Pin to the viewport (used behind the whole app). */
  fixed?: boolean;
}

const timeOfDay = (): "morning" | "noon" | "evening" => {
  const h = new Date().getHours();
  if (h < 11) return "morning";
  if (h < 17) return "noon";
  return "evening";
};

/**
 * Soft, light "aurora" background: four slow-drifting blurred tints, a faint dot
 * grid, and (hero only) a dot-grid spotlight that follows the cursor.
 * Pointer parallax is written straight to CSS variables on this element, so the
 * pointer never causes a React re-render. Motion is disabled through
 * `html[data-fx="off"]` (see FxProvider) and `prefers-reduced-motion`.
 */
export const AmbientBackground: React.FC<Props> = ({ variant = "hero", fixed = false }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || variant === "app") return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (document.documentElement.dataset.fx === "off") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        el.style.setProperty("--nx", String(((x / r.width) - 0.5) * 2));
        el.style.setProperty("--ny", String(((y / r.height) - 0.5) * 2));
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
        el.dataset.hover = "1";
      });
    };
    const onLeave = () => {
      el.dataset.hover = "0";
      el.style.setProperty("--nx", "0");
      el.style.setProperty("--ny", "0");
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [variant]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-tod={timeOfDay()}
      className={`fx-ambient${fixed ? " fx-ambient--fixed" : ""}`}
    >
      <div className="fx-blob fx-blob--a"><i /></div>
      {variant !== "app" && <div className="fx-blob fx-blob--b"><i /></div>}
      {variant === "hero" && <div className="fx-blob fx-blob--c"><i /></div>}
      {variant === "hero" && <div className="fx-blob fx-blob--d"><i /></div>}
      <div className="fx-grid" />
      {variant === "hero" && <div className="fx-grid fx-grid--spot" />}
    </div>
  );
};
