"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: server HTML and the no-JS page remain visible. */
export default function RevealBlock({ kind, children }: { kind: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveal = () => { element.dataset.reveal = "visible"; observer.disconnect(); };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) reveal();
    }, { threshold: 0 });
    // Only hide content that is still below the viewport. Hydration never
    // removes an already visible section or a deep-linked heading.
    if (!reduced.matches && element.getBoundingClientRect().top >= window.innerHeight) {
      element.dataset.reveal = "pending";
      observer.observe(element);
    }
    const motionChanged = () => { if (reduced.matches) reveal(); };
    element.addEventListener("focusin", reveal);
    reduced.addEventListener("change", motionChanged);
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", reveal);
      reduced.removeEventListener("change", motionChanged);
    };
  }, []);
  return <div ref={ref} className={`deferred-block deferred-block--${kind} section-reveal`} data-header-theme="light">{children}</div>;
}
