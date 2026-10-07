"use client";

import { useEffect, useRef, useState } from "react";
import { Alignment, Fit, Layout, Rive, RuntimeLoader } from "@rive-app/canvas";
import { publicPath } from "@/lib/public-path";

RuntimeLoader.setWasmUrl(publicPath("/rive.wasm"));
Rive.suppressDeprecationWarnings = ["animations-param", "scrub"];

const ART_W = 1200;
const ART_H = 420;
const FINAL_TOP = 170;
const FINAL_HEIGHT = 80;
const FPS = 60;

// Lockup geometry from the Rive file. K and ® sit inside the mark and must not
// push the nav: the slot starts at the full mark width and grows only while the
// mark slides right and uncovers the word.
const LOCKUP_X = 195.895;
const LOCKUP_SCALE = 2.6;
const SYMBOL_START = -236;
const SLIDE_START = 56;
const SLIDE_END = 104;
const MARK_LEFT = 231.03;
const MARK_RIGHT = 310.85;
const WORD_LEFT = LOCKUP_X;

type Bounds = { minX: number; maxX: number };

function slideEase(t: number) {
  const x1 = 0.22;
  const y1 = 0.4;
  const x2 = 0.2;
  const y2 = 1;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const sampleDX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;

  let u = t;

  for (let i = 0; i < 8; i += 1) {
    const slope = sampleDX(u);

    if (Math.abs(slope) < 1e-6) {
      break;
    }

    u -= (sampleX(u) - t) / slope;
  }

  return sampleY(Math.min(1, Math.max(0, u)));
}

function boundsAt(frame: number): Bounds {
  let symbolX = SYMBOL_START;

  if (frame >= SLIDE_END) {
    symbolX = 0;
  } else if (frame > SLIDE_START) {
    const t = (frame - SLIDE_START) / (SLIDE_END - SLIDE_START);
    symbolX = SYMBOL_START * (1 - slideEase(t));
  }

  const origin = LOCKUP_X + symbolX * LOCKUP_SCALE;

  return {
    minX: Math.min(origin + MARK_LEFT * LOCKUP_SCALE, WORD_LEFT),
    maxX: origin + MARK_RIGHT * LOCKUP_SCALE,
  };
}

export default function HeaderLogo() {
  const slotRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    const canvas = canvasRef.current;

    if (!slot || !canvas) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bounds: Bounds = boundsAt(0);
    let settled = false;
    let ready = false;
    let lastHeight = -1;

    const scale = () => {
      const height = slot.getBoundingClientRect().height;
      return height > 0 ? height / FINAL_HEIGHT : 18 / FINAL_HEIGHT;
    };

    const applyBounds = (nextScale: number) => {
      const width = Math.max(1, (bounds.maxX - bounds.minX) * nextScale);
      slot.style.width = `${width}px`;
      canvas.style.left = `${-bounds.minX * nextScale}px`;
      canvas.style.top = `${-FINAL_TOP * nextScale}px`;
    };

    const layoutSurface = (rive: Rive | null) => {
      const nextScale = scale();
      canvas.style.width = `${ART_W * nextScale}px`;
      canvas.style.height = `${ART_H * nextScale}px`;
      applyBounds(nextScale);

      if (ready && rive) {
        rive.resizeDrawingSurfaceToCanvas();
      }

      return nextScale;
    };

    const place = (frame: number) => {
      const next = boundsAt(frame);
      bounds.minX = next.minX;
      bounds.maxX = next.maxX;
      applyBounds(scale());
    };

    const initialScale = layoutSurface(null);
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(ART_W * initialScale * pixelRatio);
    canvas.height = Math.round(ART_H * initialScale * pixelRatio);

    const rive = new Rive({
      src: publicPath("/brand/header-logo.riv"),
      canvas,
      artboard: "Artboard",
      autoplay: false,
      animations: "Reveal",
      layout: new Layout({
        fit: Fit.Contain,
        alignment: Alignment.Center,
      }),
      onLoad: () => {
        ready = true;
        rive.resizeDrawingSurfaceToCanvas();
        const end = 200 / 60 - 1 / 60;

        if (reduced) {
          rive.scrub("Reveal", end);
          place(SLIDE_END);
          return;
        }

        const play = () => {
          let started = 0;
          const watch = () => {
            if (settled) {
              return;
            }

            if (!started) {
              started = performance.now();
            }

            const time = Math.min(end, (performance.now() - started) / 1000);
            place(time * FPS);
            rive.scrub("Reveal", time);

            if (time < end) {
              requestAnimationFrame(watch);
              return;
            }

            settled = true;
          };

          requestAnimationFrame(watch);
        };

        play();
      },
      onLoadError: () => {
        setFailed(true);
      },
    });

    const observer = new ResizeObserver(() => {
      const height = slot.getBoundingClientRect().height;

      if (Math.abs(height - lastHeight) < 0.5) {
        return;
      }

      lastHeight = height;
      layoutSurface(rive);
    });

    observer.observe(slot);

    return () => {
      observer.disconnect();
      rive.cleanup();
    };
  }, []);

  if (failed) {
    return (
      <span className="site-header__logo site-header__logo--still">
        <img src={publicPath("/brand/full-logo.svg")} alt="" />
      </span>
    );
  }

  return (
    <span ref={slotRef} className="site-header__logo">
      <canvas ref={canvasRef} className="site-header__logo-canvas" aria-hidden="true" />
    </span>
  );
}
