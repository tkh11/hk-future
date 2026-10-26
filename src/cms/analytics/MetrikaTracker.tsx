"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { analyticsPath, setAnalyticsCounter } from "./goals";

/** Only mount in the public layout after analytics has been explicitly configured/enabled. */
export default function MetrikaTracker({ counterId, enabled = false }: { counterId?: string; enabled?: boolean }) {
  const pathname = usePathname();
  const previous = useRef<string | undefined>(undefined);
  const validCounter = enabled && counterId && /^\d{1,16}$/u.test(counterId) ? Number(counterId) : undefined;
  useEffect(() => {
    if (!validCounter) return;
    window.ym ??= Object.assign((...args: unknown[]) => { window.ym?.a?.push(args); }, { a: [] as unknown[][], l: Date.now() });
    window.ym(validCounter, "init", { defer: true, clickmap: false, trackLinks: false, trackHash: false, webvisor: false, ecommerce: false, sendTitle: false, disableYtm: true });
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
    return () => { setAnalyticsCounter(undefined); window.ym?.(validCounter, "destruct"); previous.current = undefined; };
  }, [validCounter]);
  useEffect(() => {
    if (!validCounter || !pathname) return;
    const path = analyticsPath(pathname);
    if (!path || path === previous.current) return;
    window.ym?.(validCounter, "hit", path, { title: "", referer: previous.current ?? "" });
    previous.current = path;
  }, [pathname, validCounter]);
  return null;
}
