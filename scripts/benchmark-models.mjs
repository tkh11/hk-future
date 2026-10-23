/** Cold, sequential model measurements; never treats software WebGL as an FPS benchmark. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "@playwright/test");
const baseURL = process.env.BENCHMARK_URL || "http://localhost:3100";
const label = process.env.BENCHMARK_LABEL || "current";
const runs = Number(process.env.BENCHMARK_RUNS || 5);
const timeout = Number(process.env.BENCHMARK_MODEL_TIMEOUT || 150_000);
const profiles = process.env.BENCHMARK_PROFILES?.split(",") || ["desktop", "mobile"];
const output = resolve(".ecc/benchmarks", `models-${label}.json`);
const captures = resolve("test-results", `models-${label}`);
const routes = [
  { route: "/solutions/data-centers", wrapper: ".deferred-block--dc-system", section: "#cooling-system", asset: "chilling.glb", button: "#cooling-toggle-pipes", detail: "#cooling-detail-pipes h3" },
  { route: "/solutions/fire-suppression", wrapper: ".deferred-block--fire-system", section: "#fireoff-system", asset: "parking-sprinkler.glb", button: "#fireoff-toggle-station", detail: "#fireoff-detail-station h3" },
  { route: "/designers", wrapper: ".pipeline", section: ".pipeline", asset: "facade.glb" },
].filter(item => !process.env.BENCHMARK_ROUTES || process.env.BENCHMARK_ROUTES.split(",").includes(item.route));

function instrument() {
  const contexts = new Map();
  const marker = Symbol("benchmark-wrapped");
  const state = { ready: {}, visible: {}, contexts, clicks: {} };
  window.__modelBenchmark = state;
  function stats(context) {
    if (!contexts.has(context)) contexts.set(context, { calls: 0, totalCalls: 0, colorClears: 0, liveBuffers: 0, liveTextures: 0 });
    return contexts.get(context);
  }
  for (const constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!constructor) continue;
    for (const name of ["clear", "drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "createBuffer", "deleteBuffer", "createTexture", "deleteTexture"]) {
      const original = constructor.prototype[name];
      if (!original || original[marker]) continue;
      const wrapped = function (...args) {
        const result = original.apply(this, args), entry = stats(this);
        if (name === "clear" && (args[0] & this.COLOR_BUFFER_BIT)) { entry.calls = 0; entry.colorClears++; }
        if (name.startsWith("draw")) { entry.calls++; entry.totalCalls++; }
        if (name === "createBuffer" && result) entry.liveBuffers++;
        if (name === "deleteBuffer" && args[0]) entry.liveBuffers--;
        if (name === "createTexture" && result) entry.liveTextures++;
        if (name === "deleteTexture" && args[0]) entry.liveTextures--;
        return result;
      };
      wrapped[marker] = true;
      constructor.prototype[name] = wrapped;
    }
  }
  const observed = new WeakSet();
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      const selector = entry.target.closest(".pipeline") ? ".pipeline" : entry.target.closest("#cooling-system") ? "#cooling-system" : "#fireoff-system";
      state.visible[selector] ??= performance.now();
    }
  });
  const check = () => {
    for (const selector of ["#cooling-system", "#fireoff-system", ".pipeline"]) {
      const section = document.querySelector(selector);
      const media = section?.querySelector('[class*="visual"], .pipeline__stage');
      if (media && !observed.has(media)) { observed.add(media); visibility.observe(media); }
      const canvas = section?.querySelector("canvas");
      const viewer = canvas?.closest('[data-model-status]') ?? canvas?.parentElement?.parentElement;
      const ready = selector === ".pipeline"
        ? section?.querySelector('.pipeline__veil[aria-hidden="true"]')
        : canvas && viewer && !viewer.querySelector('[role="status"], [role="alert"]');
      const key = selector === ".pipeline"
        ? `${selector}:${section?.querySelector("h1")?.textContent.includes("Разводка") ? "floor" : "facade"}`
        : selector;
      if (ready && !state.ready[key]) state.ready[key] = performance.now();
    }
  };
  new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-hidden", "data-model-status"] });
  document.addEventListener("click", event => {
    const button = event.target.closest?.("button");
    if (button) state.lastClick = performance.now();
  }, true);
}

async function waitReady(page, section) {
  await page.waitForFunction(selector => {
    const root = document.querySelector(selector);
    // R3F also places its fallback inside <canvas>; that fallback is not rendered
    // in a browser with canvas support and must not be mistaken for an error.
    if ([...(root?.querySelectorAll('[role="alert"]') ?? [])].some(node => !node.closest("canvas"))) throw new Error("Model entered an error state");
    if (!root?.querySelector("canvas")) return false;
    const canvas = root.querySelector("canvas");
    const viewer = canvas.closest('[data-model-status]') ?? canvas.parentElement?.parentElement;
    return selector === ".pipeline"
      ? root.querySelector('.pipeline__veil[aria-hidden="true"]')
      : viewer && !viewer.querySelector('[role="status"], [role="alert"]');
  }, section, { timeout });
}

async function snapshot(page, cdp, section, asset, started, transfers) {
  const data = await page.evaluate(({ selector, asset, started }) => {
    const canvas = document.querySelector(`${selector} canvas`);
    const state = window.__modelBenchmark;
    const pair = [...state.contexts].find(([context]) => context.canvas === canvas);
    const resource = performance.getEntriesByType("resource").filter(entry => new URL(entry.name).pathname.endsWith(`/${asset}`)).at(-1);
    const key = selector === ".pipeline" ? `${selector}:${asset === "facade.glb" ? "facade" : "floor"}` : selector;
    const readyAt = state.ready[key] ?? performance.now();
    let renderer = null;
    if (pair) {
      const info = pair[0].getExtension("WEBGL_debug_renderer_info");
      renderer = info ? pair[0].getParameter(info.UNMASKED_RENDERER_WEBGL) : pair[0].getParameter(pair[0].RENDERER);
    }
    return {
      asset, startMs: started, readyAtMs: readyAt, actionToReadyMs: readyAt - started,
      viewportEnteredAtMs: state.visible[selector] ?? null,
      viewportToReadyMs: state.visible[selector] == null ? null : Math.max(0, readyAt - state.visible[selector]),
      resource: resource ? { durationMs: resource.duration, startMs: resource.startTime, responseEndMs: resource.responseEnd, transferSize: resource.transferSize, encodedBodySize: resource.encodedBodySize, decodedBodySize: resource.decodedBodySize } : null,
      responseEndToReadyMs: resource ? readyAt - resource.responseEnd : null,
      webgl: pair ? { renderer, ...pair[1], note: "Actual draw calls since last color clear; includes transparent passes. Not source mesh count or FPS." } : null,
      jsHeapBytes: performance.memory?.usedJSHeapSize ?? null,
    };
  }, { selector: section, asset, started });
  const metrics = await cdp.send("Performance.getMetrics");
  const usedHeap = metrics.metrics.find(metric => metric.name === "JSHeapUsedSize")?.value;
  data.jsHeapBytes = usedHeap ?? data.jsHeapBytes;
  data.cdpEncodedTransferBytes = transfers.filter(entry => new URL(entry.url).pathname.endsWith(`/${asset}`)).reduce((sum, entry) => sum + entry.bytes, 0);
  return data;
}

async function reveal(page, locator) {
  await locator.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const top = Math.max(0, scrollY + bounds.top - Math.max(80, (innerHeight - bounds.height) / 2));
    const request = new CustomEvent("heisskraft:scroll-to", { detail: { top }, cancelable: true });
    if (window.dispatchEvent(request)) window.scrollTo({ top, behavior: "instant" });
  });
  // Use the site's scroll controller, then settle its 700ms transition. Native
  // scrollIntoView before hydration can be undone by Lenis route restoration.
  await page.waitForTimeout(850);
}

async function interaction(page, button, detail) {
  await reveal(page, button);
  await page.evaluate(selector => {
    window.__modelBenchmark.lastClick = null;
    window.__modelBenchmark.detailReadyAt = null;
    function inspect() {
      const node = document.querySelector(selector), start = window.__modelBenchmark.lastClick;
      if (start && node) {
        const bounds = node.getBoundingClientRect();
        const region = node.closest('[role="region"]');
        let visible = (!region || region.getAttribute("aria-hidden") !== "true") && bounds.width > 0 && bounds.height > 0 && !node.closest("[inert]") && bounds.top >= 0 && bounds.bottom <= innerHeight;
        for (let parent = node.parentElement; parent && visible; parent = parent.parentElement) {
          const style = getComputedStyle(parent), clip = parent.getBoundingClientRect();
          if (Number(style.opacity) < 0.5 || style.visibility === "hidden") visible = false;
          if (["hidden", "clip", "scroll", "auto"].includes(style.overflowY) && (bounds.top < clip.top || bounds.bottom > clip.bottom + 1)) visible = false;
        }
        if (visible) { window.__modelBenchmark.detailReadyAt = performance.now(); return; }
      }
      window.__modelBenchmark.interactionFrame = requestAnimationFrame(inspect);
    }
    inspect();
  }, detail);
  try {
    await button.click({ timeout: 15_000 });
    await page.waitForFunction(() => window.__modelBenchmark.detailReadyAt !== null, undefined, { timeout: 15_000 });
    return await page.evaluate(() => ({ clickToDescriptionMs: window.__modelBenchmark.detailReadyAt - window.__modelBenchmark.lastClick }));
  } catch (error) {
    return { failure: error.message, visibility: await page.evaluate(selector => {
      const node = document.querySelector(selector), parents = [];
      for (let parent = node; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
        parents.push({ tag: parent.tagName, className: parent.className, top: bounds.top, bottom: bounds.bottom, height: bounds.height, opacity: style.opacity, visibility: style.visibility, overflowY: style.overflowY, inert: parent.inert });
      }
      return { viewportHeight: innerHeight, parents };
    }, detail) };
  } finally {
    await page.evaluate(() => cancelAnimationFrame(window.__modelBenchmark.interactionFrame));
  }
}

await mkdir(resolve(".ecc/benchmarks"), { recursive: true });
await mkdir(captures, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader", "--enable-precise-memory-info"], ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
const samples = [], began = Date.now();
async function save() {
  await writeFile(output, JSON.stringify({ label, baseURL, browser: browser.version(), elapsedMs: Date.now() - began, protocol: {
    runs, cache: "fresh context + disabled HTTP cache", reducedMotion: "no-preference", softwareWebGL: "May be used; no FPS measured",
    desktop: { viewport: "1440x900", cpuRate: 1, network: "local unthrottled" },
    mobile: { viewport: "390x844", cpuRate: 4, downloadBytesPerSecond: 500000, latencyMs: 150 },
    timings: "ready = model canvas exists and viewer loading/error state is gone, or designers veil aria-hidden=true. actionToReady starts after DOMContentLoaded and includes hydration/viewport scroll; viewportToReady uses first model-wrapper intersection. responseEndToReady also includes DOM scheduling. Interaction = click event to expanded description heading inside viewport/clip bounds with ancestor opacity >= 0.5. Not field INP.",
    memory: "CDP JSHeapUsedSize; actual GPU allocation size unavailable. WebGL live resource counters are diagnostic only.",
  }, samples }, null, 2));
}
try {
  for (const profile of profiles) for (const item of routes) for (let run = 0; run < runs; run++) {
    const mobile = profile === "mobile";
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, reducedMotion: "no-preference" });
    const page = await context.newPage(), cdp = await context.newCDPSession(page);
    const transfers = [], requests = new Map(), errors = [];
    await cdp.send("Network.enable"); await cdp.send("Performance.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: mobile ? 4 : 1 });
    if (mobile) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 500000, uploadThroughput: 500000 });
    cdp.on("Network.responseReceived", event => requests.set(event.requestId, event.response.url));
    cdp.on("Network.loadingFinished", event => { if (requests.has(event.requestId)) transfers.push({ url: requests.get(event.requestId), bytes: event.encodedDataLength }); });
    page.on("pageerror", error => errors.push(error.message));
    const sample = { profile, route: item.route, run: run + 1, errors };
    try {
      await page.addInitScript(instrument);
      await page.goto(`${baseURL}${item.route}`, { waitUntil: "domcontentloaded", timeout });
      const started = await page.evaluate(() => performance.now());
      await page.waitForFunction(() => document.documentElement.classList.contains("lenis"), undefined, { timeout });
      await reveal(page, page.locator(item.wrapper));
      // Use the persistent media wrapper: the canvas itself is mounted only in view.
      await page.locator(item.section).waitFor({ timeout });
      await reveal(page, page.locator(item.section).locator('[class*="visual"], .pipeline__stage').first());
      await waitReady(page, item.section);
      sample.initial = await snapshot(page, cdp, item.section, item.asset, started, transfers);
      if (process.env.BENCHMARK_GC === "1") {
        // Diagnostic only: outside the loading window, distinguish retained
        // objects from transient parser/decoder garbage in raw heap snapshots.
        await cdp.send("HeapProfiler.collectGarbage");
        const retained = await cdp.send("Performance.getMetrics");
        sample.initial.retainedJSHeapBytes = retained.metrics.find(metric => metric.name === "JSHeapUsedSize")?.value ?? null;
      }
      const capture = profile === "desktop" && run === 0 && item.button;
      const captureName = item.route.split("/").at(-1);
      if (capture) await page.screenshot({ path: resolve(captures, `${captureName}-ready.png`) });
      if (item.button) sample.interaction = await interaction(page, page.locator(item.button), item.detail);
      else {
        const floorStarted = await page.evaluate(() => performance.now());
        await page.getByRole("complementary", { name: "Блоки здания" }).getByRole("button", { name: /Типовой этаж/ }).click();
        await page.getByRole("heading", { level: 1, name: "Разводка ХВС и ГВС" }).waitFor();
        await waitReady(page, ".pipeline");
        sample.floor = await snapshot(page, cdp, ".pipeline", "communications.glb", floorStarted, transfers);
        // The baseline mobile UI hides the title without aria-label. Match its
        // existing DOM text so the same product can be measured on both builds.
        sample.interaction = await interaction(page, page.locator('.pipeline__panel[aria-label="Элементы трубопровода"] button').filter({ hasText: "Труба KraftPipePlus SDR 7.4" }), ".pipeline__detail--product h2");
      }
      if (capture) {
        // Captures follow the metric windows; bring the selected model back into view.
        await reveal(page, page.locator(item.section).locator('[class*="visual"]').first());
        await page.waitForTimeout(1000);
        await page.screenshot({ path: resolve(captures, `${captureName}-selected.png`) });
      }
    } catch (error) { sample.failure = error.message; }
    samples.push(sample); await save(); await context.close();
    console.log(`${label} ${profile} ${item.route} ${run + 1}/${runs}: ${sample.failure ?? `${Math.round(sample.initial.actionToReadyMs)}ms ready, ${sample.initial.webgl?.calls ?? "?"} draws`}`);
  }
} finally { await save(); await browser.close(); }
if (samples.some(sample => sample.failure || sample.interaction?.failure)) process.exitCode = 1;
