import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { parsePublicBlocks } from "@/cms/blocks/parse";
import { populatedMedia, safeContentHref } from "@/cms/blocks/types";
import { analyticsPath, setAnalyticsCounter, trackGoal } from "@/cms/analytics/goals";
import { getMetrikaSummary } from "@/cms/analytics/metrika";
import MetrikaTracker from "@/cms/analytics/MetrikaTracker";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
  document.querySelectorAll('script[data-hk-metrika="true"]').forEach(script => script.remove());
  window.history.replaceState({}, "", "/"); navigation.pathname = "/";
  vi.unstubAllEnvs(); vi.unstubAllGlobals(); setAnalyticsCounter(undefined); delete window.ym;
});

describe("CMS public content boundary", () => {
  it("only emits registered visible blocks and excludes private Payload fields", () => {
    const blocks = parsePublicBlocks([
      { blockType: "text", text: "Опубликовано", updatedBy: { password: "private" }, id: "text-1" },
      { blockType: "text", text: "Скрыто", hidden: true },
      { blockType: "script", html: "<script>bad()</script>" },
    ]);
    expect(blocks).toEqual([{ blockType: "text", text: "Опубликовано", id: "text-1" }]);
    expect(parsePublicBlocks(null)).toEqual([]);
  });

  it.each(["javascript:alert(1)", "data:text/html,bad", "//evil.example", "/\\evil.example", "https://user:password@example.org", "/catalog\n", "http://example.org"])("rejects unsafe link %s", href => {
    expect(safeContentHref(href)).toBeUndefined();
    expect(parsePublicBlocks([{ blockType: "cta", heading: "Каталог", actions: [{ label: "Открыть", href }] }])).toEqual([]);
  });

  it("accepts internal routes and HTTPS links", () => {
    expect(safeContentHref("/catalog/pipelines?sort=name")).toBe("/catalog/pipelines?sort=name");
    expect(safeContentHref("https://heisskraft.ru/catalog/")).toBe("https://heisskraft.ru/catalog/");
  });

  it("limits model descriptions to existing element IDs in the chosen system", () => {
    const blocks = parsePublicBlocks([{ blockType: "modelDescriptions", model: "data-centers", camera: [1, 2, 3], items: [
      { element: "pipes", title: "ClimatFaser", text: "Трубы", position: [0, 0, 0] },
      { element: "pipes", title: "Дубликат", text: "Не выводится" },
      { element: "station", title: "Другая система", text: "Не выводится" },
    ] }]);
    expect(blocks).toEqual([{ blockType: "modelDescriptions", model: "data-centers", items: [{ element: "pipes", title: "ClimatFaser", text: "Трубы" }] }]);
  });

  it("does not turn an unresolved relation or failed media into a broken image", () => {
    expect(populatedMedia(17)).toBeUndefined();
    expect(populatedMedia({ url: "" })).toBeUndefined();
    expect(populatedMedia({ url: "data:image/svg+xml,bad" })).toBeUndefined();
    expect(populatedMedia({ url: "/api/media/file/product.webp", alt: "Труба" })?.alt).toBe("Труба");
  });

  it("strips uploader identity and private media metadata from DTOs", () => {
    const blocks = parsePublicBlocks([{ blockType: "hero", heading: "Каталог", image: { id: 2, url: "/media/pump.webp", alt: "Насос", filename: "private", uploadedBy: { email: "private" } } }]);
    expect(blocks).toEqual([{ blockType: "hero", heading: "Каталог", image: { id: 2, url: "/media/pump.webp", alt: "Насос" } }]);
  });
});

describe("aggregate analytics", () => {
  it("makes no request without configured credentials", async () => {
    vi.stubEnv("METRIKA_COUNTER_ID", ""); vi.stubEnv("METRIKA_READ_TOKEN", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await getMetrikaSummary()).toEqual({ status: "unconfigured" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requests only fixed aggregates and keeps token out of URL/result", async () => {
    vi.stubEnv("METRIKA_COUNTER_ID", "12345"); vi.stubEnv("METRIKA_READ_TOKEN", "test-token");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ totals: [120, 100, 300, 15.2, 54] }) }); vi.stubGlobal("fetch", fetch);
    expect(await getMetrikaSummary()).toEqual({ status: "ready", visits: 120, visitors: 100, pageViews: 300, bounceRate: 15.2, averageVisitSeconds: 54 });
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).not.toContain("test-token"); expect(String(url)).not.toContain("dimensions");
    expect(options).toMatchObject({ cache: "no-store", headers: { Authorization: "OAuth test-token" } });
  });

  it("shows unavailable state for provider errors without leaking details", async () => {
    vi.stubEnv("METRIKA_COUNTER_ID", "12345"); vi.stubEnv("METRIKA_READ_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private token")));
    expect(await getMetrikaSummary()).toEqual({ status: "unavailable" });
  });

  it("does not send search terms, fragments, admin paths or form data", () => {
    expect(analyticsPath("/catalog?q=private@example.org#person")).toBe("/catalog");
    expect(analyticsPath("/admin/collections/users")).toBeUndefined();
    expect(analyticsPath("/api/preview")).toBeUndefined();
    const ym = vi.fn(); window.ym = ym;
    trackGoal("lead_demo_completed"); expect(ym).not.toHaveBeenCalled();
    setAnalyticsCounter(12345); trackGoal("lead_demo_completed");
    expect(ym).toHaveBeenCalledWith(12345, "reachGoal", "lead_demo_completed");
  });

  it.each(["/admin", "/api/preview", "/preview/page", "/%61dmin/users", "/person@example.org", "//outside.example", "/catalog/private%2Fidentifier", "/catalog\\private"])("does not initialize analytics on unsafe or non-public path %s", pathname => {
    navigation.pathname = pathname;
    const ym = vi.fn(); window.ym = ym;
    render(createElement(MetrikaTracker, { enabled: true, counterId: "12345" }));
    trackGoal("contact_click");
    expect(ym).not.toHaveBeenCalled();
    expect(document.querySelector('[data-hk-metrika]')).toBeNull();
  });

  it("stays off without explicit opt-in, including direct calls from form and model handlers", () => {
    const ym = vi.fn(); window.ym = ym;
    const view = render(createElement(MetrikaTracker, { counterId: "12345" }));
    trackGoal("lead_demo_completed"); trackGoal("model_interaction");
    view.rerender(createElement(MetrikaTracker, { enabled: false, counterId: "12345" }));
    expect(ym).not.toHaveBeenCalled();
    expect(document.querySelector('[data-hk-metrika]')).toBeNull();
  });

  it.each(["", "abc", "0", "9007199254740992"])("rejects invalid counter %s before loading a third-party script", counterId => {
    const ym = vi.fn(); window.ym = ym;
    render(createElement(MetrikaTracker, { enabled: true, counterId }));
    expect(ym).not.toHaveBeenCalled();
    expect(document.querySelector('[data-hk-metrika]')).toBeNull();
  });

  it("uses safe SDK defaults and emits one allowlisted event per click without URLs, text, or form values", () => {
    window.history.replaceState({}, "", "/catalog?q=private@example.org#phone");
    vi.spyOn(document, "referrer", "get").mockReturnValue("https://outside.example/?email=private@example.org");
    navigation.pathname = "/catalog";
    const ym = vi.fn(); window.ym = ym;
    render(createElement(MetrikaTracker, { enabled: true, counterId: "12345" }));
    expect(ym).toHaveBeenCalledWith(12345, "init", expect.objectContaining({ url: "/", referrer: "/", defer: true, sendTitle: false, webvisor: false, clickmap: false, trackLinks: false, trackHash: false, disableYtm: true }));
    expect(ym).toHaveBeenCalledWith(12345, "hit", "/catalog", { title: "", referer: "/" });
    expect(ym).toHaveBeenCalledWith(12345, "reachGoal", "catalog_view");
    const view = render(createElement("div", {},
      createElement("button", { "data-analytics-goal": "lead_open" }, createElement("span", {}, "private@example.org")),
      createElement("a", { href: "mailto:private@example.org?subject=private", onClick: (event: { preventDefault: () => void }) => event.preventDefault() }, "Contact"),
      createElement("a", { href: "/api/media/file/private.pdf?token=private", "data-analytics-goal": "file_download", onClick: (event: { preventDefault: () => void }) => event.preventDefault() }, "Private document"),
      createElement("button", { "data-analytics-goal": "not_allowlisted" }, "Unknown"),
      createElement("input", { defaultValue: "private@example.org" }),
    ));
    ym.mockClear();
    fireEvent.click(view.getByText("private@example.org"));
    fireEvent.click(view.getByText("Contact"));
    fireEvent.click(view.getByText("Private document"));
    fireEvent.click(view.getByText("Unknown"));
    fireEvent.change(view.getByRole("textbox"), { target: { value: "phone" } });
    expect(ym.mock.calls).toEqual([[12345, "reachGoal", "lead_open"], [12345, "reachGoal", "contact_click"], [12345, "reachGoal", "file_download"]]);
    expect(document.querySelectorAll('[data-hk-metrika]')).toHaveLength(1);
  });

  it("deduplicates route rerenders and stops all goals when disabled for preview", () => {
    navigation.pathname = "/catalog";
    const ym = vi.fn(); window.ym = ym;
    const view = render(createElement(MetrikaTracker, { enabled: true, counterId: "12345" }));
    ym.mockClear();
    view.rerender(createElement(MetrikaTracker, { enabled: true, counterId: "12345" }));
    expect(ym).not.toHaveBeenCalled();
    navigation.pathname = "/products/pump";
    view.rerender(createElement(MetrikaTracker, { enabled: true, counterId: "12345" }));
    expect(ym.mock.calls).toEqual([[12345, "hit", "/products/pump", { title: "", referer: "/catalog" }], [12345, "reachGoal", "product_view"]]);
    view.rerender(createElement(MetrikaTracker, { enabled: false, counterId: "12345" }));
    expect(ym).toHaveBeenCalledWith(12345, "destruct");
    ym.mockClear();
    trackGoal("lead_demo_completed"); trackGoal("model_interaction");
    expect(ym).not.toHaveBeenCalled();
  });

  it("does not let an analytics script failure break user actions", () => {
    window.ym = vi.fn(() => { throw new Error("SDK unavailable"); });
    expect(() => render(createElement(MetrikaTracker, { enabled: true, counterId: "12345" }))).not.toThrow();
    setAnalyticsCounter(12345);
    expect(() => trackGoal("lead_demo_completed")).not.toThrow();
  });
});
