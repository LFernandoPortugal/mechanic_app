"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Touch Ripple ────────────────────────────────────────
interface Ripple {
  id: number;
  x: number;
  y: number;
}

function TouchRippleLayer() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const id = counterRef.current++;
      const newRipple: Ripple = { id, x: touch.clientX, y: touch.clientY };
      setRipples((prev) => [...prev, newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 800);
    };

    window.addEventListener("touchstart", handleTouch, { passive: true });
    return () => window.removeEventListener("touchstart", handleTouch);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden">
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full animate-touch-ripple"
          style={{
            left: r.x - 40,
            top: r.y - 40,
            width: 80,
            height: 80,
            background:
              "radial-gradient(circle, rgba(52,211,153,0.35) 0%, rgba(52,211,153,0) 70%)",
            border: "1.5px solid rgba(52,211,153,0.5)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Desktop Effects ─────────────────────────────────────
function DesktopEffects() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: -200, y: -200 });
  const orbPos = useRef({ x: -200, y: -200 });
  const isClicking = useRef(false);
  const rafRef = useRef<number>(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [orbVisible, setOrbVisible] = useState(true);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    setOrbVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setOrbVisible(false), 3000);
  }, []);

  const handleMouseDown = useCallback(() => {
    isClicking.current = true;
    cursorRef.current?.classList.add("cursor-clicking");
  }, []);

  const handleMouseUp = useCallback(() => {
    isClicking.current = false;
    cursorRef.current?.classList.remove("cursor-clicking");
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      // Cursor: snap directly
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${mousePos.current.x - 12}px, ${mousePos.current.y - 12}px)`;
      }
      // Orb: smooth lerp follow
      orbPos.current.x = lerp(orbPos.current.x, mousePos.current.x, 0.07);
      orbPos.current.y = lerp(orbPos.current.y, mousePos.current.y, 0.07);
      if (orbRef.current) {
        orbRef.current.style.transform = `translate(${orbPos.current.x - 160}px, ${orbPos.current.y - 160}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp]);

  return (
    <>
      {/* Custom cursor — Wrench icon */}
      <div
        ref={cursorRef}
        className="sga-cursor pointer-events-none fixed top-0 left-0 z-[9999] will-change-transform"
        aria-hidden
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]"
        >
          <path
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(52,211,153,0.15)"
          />
        </svg>
      </div>

      {/* Glass Orb */}
      <div
        ref={orbRef}
        className="pointer-events-none fixed top-0 left-0 z-[9990] will-change-transform transition-opacity duration-700"
        style={{ opacity: orbVisible ? 1 : 0 }}
        aria-hidden
      >
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 40% 40%, rgba(52,211,153,0.07) 0%, rgba(16,185,129,0.04) 40%, rgba(0,0,0,0) 70%)",
            border: "1px solid rgba(52,211,153,0.18)",
            backdropFilter: "blur(0.5px)",
            boxShadow:
              "inset 0 0 40px rgba(52,211,153,0.05), 0 0 60px rgba(52,211,153,0.04)",
          }}
        />
      </div>
    </>
  );
}

// ─── Master Component ─────────────────────────────────────
export function MouseEffects() {
  const [hasPointer, setHasPointer] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect fine pointer (mouse) vs coarse (touch)
    setHasPointer(window.matchMedia("(pointer: fine)").matches);
  }, []);

  if (hasPointer === null) return null;

  return (
    <>
      {hasPointer ? <DesktopEffects /> : <TouchRippleLayer />}
    </>
  );
}
