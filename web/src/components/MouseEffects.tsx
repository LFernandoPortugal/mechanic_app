"use client";

import { useEffect, useState } from "react";

/**
 * A highly optimized, lightweight background component.
 * Removes heavy window mouse listeners, custom SVG cursor tracking,
 * and requestAnimationFrame cycles to completely eliminate input/mouse lag
 * and restore 100% snappy OS-native mouse rendering.
 */
export function MouseEffects() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden select-none">
      {/* Static beautiful dark theme background without costly CPU/GPU translate adjustments */}
      <div className="absolute inset-0 bg-[url('/bg-mechanic.png')] bg-cover bg-center opacity-15 grayscale scale-100" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
    </div>
  );
}
