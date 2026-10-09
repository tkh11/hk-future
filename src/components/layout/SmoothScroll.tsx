"use client";

import { useEffect } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import { PAGE_SCROLL_EVENT, type PageScrollEvent } from "@/lib/page-scroll";

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.2,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      autoRaf: false,
    });

    const raf = (time: number) => lenis.raf(time * 1000);
    const scrollTo = (event: Event) => {
      const { top } = (event as PageScrollEvent).detail;
      if (!Number.isFinite(top)) return;
      event.preventDefault();
      lenis.scrollTo(top, { duration: .7, lerp: 0 });
    };

    gsap.ticker.add(raf);
    window.addEventListener(PAGE_SCROLL_EVENT, scrollTo);
    gsap.ticker.lagSmoothing(0);

    // The preloader and the mobile menu lock the page with plain CSS overflow;
    // Lenis drives scrolling itself and has to be paused alongside them.
    const syncLock = () => {
      const locked =
        document.documentElement.classList.contains("is-preloading") ||
        document.body.style.overflow === "hidden";

      if (locked) {
        lenis.stop();
      } else {
        lenis.start();
      }
    };

    syncLock();

    const observer = new MutationObserver(syncLock);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => {
      observer.disconnect();
      window.removeEventListener(PAGE_SCROLL_EVENT, scrollTo);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  return null;
}
