"use client";
import { useEffect, useRef, useState } from "react";
import { scrollPageTo } from "./page-scroll";

function measureExpandedCard(cards: HTMLDivElement) {
  const menuBounds = cards.getBoundingClientRect();
  const measurement = cards.cloneNode(true) as HTMLDivElement;
  measurement.setAttribute("aria-hidden", "true");
  measurement.inert = true;
  Object.assign(measurement.style, {
    position: "absolute",
    inset: "0 auto auto 0",
    width: `${menuBounds.width}px`,
    visibility: "hidden",
    pointerEvents: "none",
  });
  // Measure the final layout without changing or waiting for the visible morph.
  measurement.querySelectorAll<HTMLElement>("*").forEach(element => {
    element.removeAttribute("id");
    element.style.transition = "none";
    element.style.animation = "none";
  });
  cards.after(measurement);
  try {
    const card = measurement.querySelector<HTMLElement>('[data-expanded="true"]');
    if (!card) return null;
    const bounds = card.getBoundingClientRect();
    const top = menuBounds.top + bounds.top - measurement.getBoundingClientRect().top;
    return { top, bottom: top + bounds.height, height: bounds.height };
  } finally {
    measurement.remove();
  }
}

export function useModelDescription<T extends string>() {
  const [selection, setSelection] = useState<T | null>(null);
  const [revealRequest, setRevealRequest] = useState<{ id: T } | null>(null);
  const menu = useRef<HTMLDivElement>(null);

  function selectFromModel(next: T | null) {
    if (!next) return;
    setSelection(next);
    // A new request also reveals an already-selected item after scrolling back to the model.
    setRevealRequest({ id: next });
  }

  useEffect(() => {
    if (!revealRequest || selection !== revealRequest.id || !menu.current) return;
    const cards = menu.current;
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      const bounds = measureExpandedCard(cards);
      if (!bounds) return;
      const headerBottom = document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().bottom ?? 0;
      const visibleTop = Math.max(0, headerBottom) + 24;
      const visibleBottom = window.innerHeight - 24;
      if (bounds.top >= visibleTop && bounds.bottom <= visibleBottom) return;

      // Move only as far as needed; taller cards begin immediately below the header.
      const offset = bounds.height > visibleBottom - visibleTop || bounds.top < visibleTop
        ? bounds.top - visibleTop
        : bounds.bottom - visibleBottom;
      scrollPageTo(Math.max(0, window.scrollY + offset));
    });
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
    };
  }, [revealRequest, selection]);

  return {
    selection, menu, selectFromModel,
    clear() { setSelection(null); setRevealRequest(null); },
    toggle(id: T) { setRevealRequest(null); setSelection(current => current === id ? null : id); },
  };
}
