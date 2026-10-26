import "server-only";

export type MetrikaSummary =
  | { status: "unconfigured" }
  | { status: "unavailable" }
  | { status: "ready"; visits: number; visitors: number; pageViews: number; bounceRate: number; averageVisitSeconds: number };

/** Aggregate-only report: no dimensions, visitor identifiers, search terms or form contents. */
export async function getMetrikaSummary(): Promise<MetrikaSummary> {
  const counter = process.env.METRIKA_COUNTER_ID;
  const token = process.env.METRIKA_READ_TOKEN;
  if (!counter || !/^\d{1,16}$/u.test(counter) || !token) return { status: "unconfigured" };
  const url = new URL("https://api-metrika.yandex.net/stat/v1/data");
  url.search = new URLSearchParams({ ids: counter, date1: "7daysAgo", date2: "yesterday", metrics: "ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:avgVisitDurationSeconds", accuracy: "medium" }).toString();
  try {
    const response = await fetch(url, { cache: "no-store", headers: { Authorization: `OAuth ${token}` }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { status: "unavailable" };
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("totals" in body) || !Array.isArray(body.totals) || body.totals.length !== 5 || !body.totals.every(value => typeof value === "number" && Number.isFinite(value) && value >= 0)) return { status: "unavailable" };
    const [visits, visitors, pageViews, bounceRate, averageVisitSeconds] = body.totals as number[];
    return { status: "ready", visits, visitors, pageViews, bounceRate, averageVisitSeconds };
  } catch {
    // Provider messages may contain request details. Do not expose or log tokens or upstream bodies.
    return { status: "unavailable" };
  }
}
