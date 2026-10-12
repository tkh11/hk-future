"use client";

import { useEffect, useRef, useState } from "react";
import { Alignment, Fit, Layout, Rive, RuntimeLoader } from "@rive-app/canvas";
import { publicPath } from "@/lib/public-path";

RuntimeLoader.setWasmUrl(publicPath("/rive.wasm"));
Rive.suppressDeprecationWarnings = ["animations-param", "animation-names", "scrub"];

// The supplied October export keeps the animated lockup in Mark / Build.
// Logo is a wrapper artboard; Reveal and the old 1200×420 crop no longer exist.
const ARTBOARD = "Mark";
const ANIMATION = "Build";
const LAST_FRAME_SECONDS = 128 / 60;
const START_DELAY_MS = 1500;
const ART_WIDTH = 1440;
const ART_HEIGHT = 320;
const LOCKUP = { x: 68, y: 92, width: 1304, height: 136 };

type LogoState = "loading" | "waiting" | "playing" | "complete" | "fallback";

export default function HeaderLogo() {
  const slotRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<LogoState>("loading");

  useEffect(() => {
    const slot = slotRef.current;
    const canvas = canvasRef.current;
    if (!slot || !canvas) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let loaded = false;
    let painted = false;
    let visible = false;
    let started = false;
    let complete = false;
    let remaining = START_DELAY_MS;
    let waitingSince = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let paintFrame = 0;
    let lastHeight = 0;
    let widthReadPending = false;
    // The canvas is small and read only during the short reveal. A CPU-backed
    // context avoids GPU readbacks when measuring the rendered, transparent mark.
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const syncVisibleWidth = () => {
      if (disposed || !loaded || !context || !canvas.width || !canvas.height) return;
      const scaleX = canvas.width / ART_WIDTH;
      const scaleY = canvas.height / ART_HEIGHT;
      const left = Math.floor(LOCKUP.x * scaleX);
      const top = Math.floor(LOCKUP.y * scaleY);
      const width = Math.min(canvas.width - left, Math.ceil(LOCKUP.width * scaleX));
      const height = Math.min(canvas.height - top, Math.ceil(LOCKUP.height * scaleY));
      const { data } = context.getImageData(left, top, width, height);

      // Follow the actual right edge, including the animation's own easing and
      // pauses. Keep the canvas fixed; only its clipping slot pushes the menu.
      for (let x = width - 1; x >= 0; x -= 1) {
        for (let y = 0; y < height; y += 1) {
          if (data[(y * width + x) * 4 + 3] > 8) {
            const extent = Math.min(LOCKUP.width, Math.max(312, (x + 1) / scaleX + 3));
            slot.style.setProperty("--logo-width", extent.toFixed(2));
            return;
          }
        }
      }
    };

    const queueWidthSync = () => {
      if (disposed || !loaded || widthReadPending) return;
      widthReadPending = true;
      // Rive fires onAdvance before drawing. Read after its synchronous draw /
      // flush, in the same browser frame, so the menu and logo move together.
      queueMicrotask(() => {
        widthReadPending = false;
        syncVisibleWidth();
      });
    };

    const showFallback = () => {
      if (disposed) return;
      slot.style.setProperty("--logo-width", String(LOCKUP.width));
      setState("fallback");
    };

    const cancelDelay = () => {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (performance.now() - waitingSince));
    };

    const layoutSurface = () => {
      const height = slot.getBoundingClientRect().height;
      if (!height || height === lastHeight) return;
      lastHeight = height;
      const scale = height / LOCKUP.height;
      canvas.style.width = `${ART_WIDTH * scale}px`;
      canvas.style.height = `${ART_HEIGHT * scale}px`;
      canvas.style.left = `${-LOCKUP.x * scale}px`;
      canvas.style.top = `${-LOCKUP.y * scale}px`;
      if (loaded) {
        rive.resizeDrawingSurfaceToCanvas();
        queueWidthSync();
      }
    };

    const updatePlayback = () => {
      if (disposed || !painted || complete) return;
      if (motion.matches) {
        cancelDelay();
        started = true;
        complete = true;
        rive.pause();
        rive.scrub(ANIMATION, LAST_FRAME_SECONDS);
        setState("complete");
        return;
      }
      const onScreen = visible && !document.hidden;
      if (started) {
        if (!onScreen && rive.isPlaying) rive.pause(ANIMATION);
        else if (onScreen && rive.isPaused) rive.play(ANIMATION);
        return;
      }
      if (!onScreen) {
        cancelDelay();
        return;
      }
      if (timer !== undefined) return;
      waitingSince = performance.now();
      timer = setTimeout(() => {
        timer = undefined;
        if (disposed) return;
        started = true;
        setState("playing");
        rive.play(ANIMATION);
      }, remaining);
    };

    const rive = new Rive({
      src: publicPath("/brand/header-logo.riv"),
      canvas,
      artboard: ARTBOARD,
      animations: ANIMATION,
      autoplay: false,
      shouldDisableRiveListeners: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        if (disposed) return;
        if (rive.activeArtboard !== ARTBOARD || !rive.animationNames.includes(ANIMATION)) {
          showFallback();
          return;
        }
        loaded = true;
        rive.resizeDrawingSurfaceToCanvas();
        rive.scrub(ANIMATION, motion.matches ? LAST_FRAME_SECONDS : 0);
        // Let Rive draw and the browser present the initial frame before timing.
        paintFrame = requestAnimationFrame(() => {
          paintFrame = requestAnimationFrame(() => {
            if (disposed) return;
            syncVisibleWidth();
            painted = true;
            setState(motion.matches ? "complete" : "waiting");
            updatePlayback();
          });
        });
      },
      onAdvance: queueWidthSync,
      onStop: () => {
        if (!disposed && started) {
          complete = true;
          setState("complete");
        }
      },
      onLoadError: showFallback,
    });

    layoutSurface();
    const resize = new ResizeObserver(layoutSurface);
    resize.observe(slot);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      updatePlayback();
    }, { threshold: [0, 0.5] });
    intersection.observe(slot);
    document.addEventListener("visibilitychange", updatePlayback);
    motion.addEventListener("change", updatePlayback);

    return () => {
      disposed = true;
      cancelDelay();
      cancelAnimationFrame(paintFrame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", updatePlayback);
      motion.removeEventListener("change", updatePlayback);
      rive.cleanup();
    };
  }, []);

  return <span ref={slotRef} className="site-header__logo" data-logo-state={state}>
    {state === "fallback" && <img className="site-header__logo-fallback" src={publicPath("/brand/full-logo.svg")} alt="" aria-hidden="true" />}
    <canvas ref={canvasRef} className="site-header__logo-canvas" aria-hidden="true" />
  </span>;
}
