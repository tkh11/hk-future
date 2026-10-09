"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

const HOVER_MOTION = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function usePointerTilt({ trackSheen = false } = {}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const pointer = useRef({ x: 50, y: 50 });

  const stopFollowing = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (surfaceRef.current) surfaceRef.current.dataset.hovered = "false";
  }, []);

  useEffect(() => {
    const motion = window.matchMedia(HOVER_MOTION);
    motion.addEventListener("change", stopFollowing);
    window.addEventListener("blur", stopFollowing);
    return () => {
      cancelAnimationFrame(frame.current);
      motion.removeEventListener("change", stopFollowing);
      window.removeEventListener("blur", stopFollowing);
    };
  }, [stopFollowing]);

  function followPointer(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || !window.matchMedia(HOVER_MOTION).matches) return;
    // The pointer target stays still while its visual surface tilts.
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.current = {
      x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)),
      y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)),
    };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const surface = surfaceRef.current;
      if (!surface) return;
      if (trackSheen) {
        surface.style.setProperty("--sheen-x", `${pointer.current.x}%`);
        surface.style.setProperty("--sheen-y", `${pointer.current.y}%`);
      }
      surface.style.setProperty("--tilt-x", `${(50 - pointer.current.y) / 10}deg`);
      surface.style.setProperty("--tilt-y", `${(pointer.current.x - 50) / 16}deg`);
      surface.dataset.hovered = "true";
    });
  }

  return {
    surfaceRef,
    pointerHandlers: {
      onPointerEnter: followPointer,
      onPointerMove: followPointer,
      onPointerLeave: stopFollowing,
      onPointerCancel: stopFollowing,
    },
  };
}
