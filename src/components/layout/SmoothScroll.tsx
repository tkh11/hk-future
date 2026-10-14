"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import Lenis from "lenis";
import { PAGE_SCROLL_EVENT, type PageScrollEvent } from "@/lib/page-scroll";

export default function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const traversal = useRef(false);
  const settledPath = useRef<string | null>(null);

  // Back / forward keeps the browser's own restored position; every other
  // visit to a page starts at the very top.
  useEffect(() => {
    const markTraversal = () => { traversal.current = true; };
    window.addEventListener("popstate", markTraversal);
    return () => window.removeEventListener("popstate", markTraversal);
  }, []);

  useLayoutEffect(() => {
    const first = settledPath.current === null;
    const previous = settledPath.current;
    settledPath.current = pathname;
    if (previous === pathname) return;

    const isTraversal = traversal.current;
    traversal.current = false;
    if (window.location.hash) return;

    if (first) {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      // Reloads and history entries are restored by the browser; a fresh load is not.
      if (navigation && navigation.type !== "navigate") return;
    } else if (isTraversal) {
      return;
    }

    // Lenis keeps its own target position and would drag the page back to the
    // previous page's offset on the next wheel tick, so reset it as well.
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

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
    lenisRef.current = lenis;

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
      lenisRef.current = null;
    };
  }, []);

  return null;
}
