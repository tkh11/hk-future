"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { analyticsPath, setAnalyticsCounter, trackGoal, analyticsGoals, type AnalyticsGoal } from "./goals";

/** Only mount in the public layout after analytics has been explicitly configured/enabled. */
export default function MetrikaTracker({ counterId, enabled = false }: { counterId?: string; enabled?: boolean }) {
  const pathname = usePathname();
  const path = pathname ? analyticsPath(pathname) : undefined;
  const previous = useRef<string | undefined>(undefined);
  const parsedCounter = counterId && /^\d{1,16}$/u.test(counterId) ? Number(counterId) : undefined;
  const validCounter = enabled && path && parsedCounter !== undefined && Number.isSafeInteger(parsedCounter) && parsedCounter > 0 ? parsedCounter : undefined;
  useEffect(() => {
    if (!validCounter) return;
    window.ym ??= Object.assign((...args: unknown[]) => { window.ym?.a?.push(args); }, { a: [] as unknown[][], l: Date.now() });
    // defer suppresses a page view, but the SDK's initial settings request still
    // uses location.href unless url/referrer are supplied. Empty referrers also
    // fall back to document.referrer. Use nonempty safe paths for both defaults.
    try {
      window.ym(validCounter, "init", { url: "/", referrer: "/", defer: true, clickmap: false, trackLinks: false, trackHash: false, webvisor: false, ecommerce: false, sendTitle: false, disableYtm: true });
    } catch { return; }
    setAnalyticsCounter(validCounter);
    const existing = document.querySelector('script[data-hk-metrika="true"]');
    const script = existing ? undefined : document.createElement("script");
    if (script) {
      script.src = "https://mc.yandex.ru/metrika/tag.js";
      script.async = true;
      script.dataset.hkMetrika = "true";
      script.referrerPolicy = "origin";
      document.head.append(script);
    }
    return () => {
      setAnalyticsCounter(undefined);
      try { window.ym?.(validCounter, "destruct"); } catch { /* Analytics are optional. */ }
      previous.current = undefined;
    };
  }, [validCounter]);
  useEffect(() => {
    if (!validCounter || !path || path === previous.current) return;
    try { window.ym?.(validCounter, "hit", path, { title: "", referer: previous.current ?? "/" }); }
    catch { return; }
    previous.current = path;
    if (path === '/catalog' || path.startsWith('/catalog/')) trackGoal('catalog_view');
    if (path.startsWith('/products/')) trackGoal('product_view');
  }, [path, validCounter]);
  useEffect(() => {
    if (!validCounter) return;
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>('[data-analytics-goal], a[href^="tel:"], a[href^="mailto:"]');
      if (!target) return;
      const goal = target.dataset.analyticsGoal ?? 'contact_click';
      if (analyticsGoals.includes(goal as AnalyticsGoal)) trackGoal(goal as AnalyticsGoal);
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, [validCounter]);
  return null;
}
