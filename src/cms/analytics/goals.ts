"use client";

export const analyticsGoals = ["catalog_view", "product_view", "model_interaction", "lead_open", "lead_demo_completed", "contact_click", "file_download"] as const;
export type AnalyticsGoal = typeof analyticsGoals[number];
type MetrikaFunction = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global { interface Window { ym?: MetrikaFunction } }
let activeCounter: number | undefined;

export function setAnalyticsCounter(counter: number | undefined) {
  activeCounter = counter !== undefined && Number.isSafeInteger(counter) && counter > 0 ? counter : undefined;
}

/** Deliberately has no arbitrary params argument: form values/searches cannot enter a goal. */
export function trackGoal(goal: AnalyticsGoal): void {
  if (typeof window === "undefined" || !activeCounter || !analyticsGoals.includes(goal)) return;
  // A blocked or failed third-party script must not interrupt the editor or form.
  try { window.ym?.(activeCounter, "reachGoal", goal); } catch { /* Analytics are optional. */ }
}

export function analyticsPath(path: string): string | undefined {
  const clean = path.split(/[?#]/u, 1)[0];
  // Public routes use CMS slugs. Reject encoded identifiers, emails, arbitrary
  // URLs and unknown path syntax instead of forwarding visitor-controlled text.
  if (!/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*$/u.test(clean) || /^\/(admin|api|preview)(\/|$)/u.test(clean)) return undefined;
  return clean;
}
