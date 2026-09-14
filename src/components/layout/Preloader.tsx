"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const STORAGE_KEY = "hk-preloader-seen";
const HOLD = 0.24;
const COLLAPSE = 0.52;
const SETTLE = 0.08;
const FLY = 0.62;
const TOTAL_CAP_MS = 3200;

function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // private mode
  }

  document.documentElement.classList.add("preloader-done");
  document.documentElement.classList.remove("is-preloading");
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function visibleHeaderLogo() {
  const logos = document.querySelectorAll<HTMLImageElement>(".site-header__logo");

  for (const logo of logos) {
    const rect = logo.getBoundingClientRect();

    if (rect.width > 2 && rect.height > 2) {
      return logo;
    }
  }

  return null;
}

function waitForImages(images: HTMLImageElement[], timeoutMs: number) {
  return Promise.race([
    Promise.all(
      images.map((image) => {
        if (image.complete) {
          return image.decode().catch(() => undefined);
        }

        return new Promise<void>((resolve) => {
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        });
      }),
    ),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

export default function Preloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLImageElement>(null);
  const smallRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const overlay = rootRef.current;
    const veilEl = veilRef.current;
    const markEl = markRef.current;
    const clipEl = clipRef.current;
    const fullEl = fullRef.current;
    const smallEl = smallRef.current;

    if (!overlay || !veilEl || !markEl || !clipEl || !fullEl || !smallEl) {
      return;
    }

    let seen = false;

    try {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming | undefined;

      if (navigation?.type === "reload") {
        sessionStorage.removeItem(STORAGE_KEY);
        document.documentElement.classList.remove("preloader-done");
      } else {
        seen = sessionStorage.getItem(STORAGE_KEY) === "1";
      }
    } catch {
      seen = false;
    }

    if (seen || document.documentElement.classList.contains("preloader-done")) {
      markSeen();
      setVisible(false);
      return;
    }

    let cancelled = false;
    let timeline: gsap.core.Timeline | null = null;
    const headerEls: HTMLElement[] = [];

    const finish = () => {
      if (cancelled) {
        return;
      }

      cancelled = true;
      window.clearTimeout(failSafe);
      markSeen();
      gsap.set(headerEls, { clearProps: "opacity,visibility,pointerEvents,filter" });
      setVisible(false);
    };

    const failSafe = window.setTimeout(finish, TOTAL_CAP_MS);

    async function play(
      overlayEl: HTMLDivElement,
      veil: HTMLDivElement,
      mark: HTMLDivElement,
      clip: HTMLDivElement,
      full: HTMLImageElement,
      small: HTMLImageElement,
    ) {
      document.documentElement.classList.add("is-preloading");
      await waitForImages([full, small], 350);

      if (cancelled) {
        return;
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      if (cancelled) {
        return;
      }

      const desktop = document.querySelector<HTMLElement>(".site-header--desktop");
      const logoChip = document.querySelector<HTMLElement>(".site-header--logo");
      const burger = document.querySelector<HTMLElement>(".site-header--burger");
      const navs = Array.from(
        document.querySelectorAll<HTMLElement>(".site-header__desktop-nav"),
      );
      const logos = Array.from(
        document.querySelectorAll<HTMLElement>(".site-header__logo"),
      );
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      const glass = isDesktop ? desktop : logoChip;
      const laterItems = isDesktop ? navs : burger ? [burger] : [];

      headerEls.push(
        ...[desktop, logoChip, burger, ...navs, ...logos].filter(
          (el): el is HTMLElement => Boolean(el),
        ),
      );

      if (prefersReducedMotion()) {
        if (glass) {
          gsap.set(glass, { opacity: 1, pointerEvents: "auto" });
        }

        gsap.set(laterItems, { opacity: 1, pointerEvents: "auto" });
        gsap.set(logos, { opacity: 1 });
        timeline = gsap.timeline({ onComplete: finish });
        timeline.to(overlayEl, { autoAlpha: 0, duration: 0.18, ease: "none" });
        return;
      }

      const target = visibleHeaderLogo();
      const dest = target?.getBoundingClientRect();

      if (!target || !dest || dest.width < 2) {
        finish();
        return;
      }

      const fullWidth = mark.offsetWidth;
      const iconCenterLeft = "38.625%";
      const fly = { x: 0, y: 0, scale: 1 };
      const tMeet = HOLD;
      const tFly = HOLD + COLLAPSE + SETTLE;
      const tLand = tFly + FLY;

      gsap.set(full, { width: fullWidth, maxWidth: "none" });
      gsap.set(clip, { width: fullWidth * 0.7432, left: 0 });
      gsap.set(mark, { force3D: true });

      timeline = gsap.timeline({
        onComplete: finish,
        defaults: { ease: "power2.inOut" },
      });

      timeline.to(
        small,
        { left: iconCenterLeft, duration: COLLAPSE },
        tMeet,
      );

      timeline.to(
        clip,
        { width: 0, left: iconCenterLeft, duration: COLLAPSE },
        tMeet,
      );

      timeline.to(
        full,
        { x: fullWidth * 0.42, opacity: 0, duration: COLLAPSE },
        tMeet,
      );

      timeline.to(
        { p: 0 },
        {
          p: 1,
          duration: FLY,
          ease: "power2.inOut",
          onStart() {
            const mid = small.getBoundingClientRect();
            const next = target.getBoundingClientRect();
            const markBox = mark.getBoundingClientRect();
            const ox = mid.left + mid.width / 2;
            const oy = mid.top + mid.height / 2;

            if (mid.width < 2 || next.width < 2) {
              return;
            }

            fly.x = next.left + next.width / 2 - ox;
            fly.y = next.top + next.height / 2 - oy;
            fly.scale = next.width / mid.width;

            gsap.set(mark, {
              transformOrigin: `${ox - markBox.left}px ${oy - markBox.top}px`,
            });
          },
          onUpdate() {
            const p = (this.targets()[0] as { p: number }).p;
            gsap.set(mark, {
              x: fly.x * p,
              y: fly.y * p,
              scale: 1 + (fly.scale - 1) * p,
            });
          },
        },
        tFly,
      );

      timeline.to(
        veil,
        { opacity: 0, duration: 0.4 },
        tLand - 0.08,
      );

      const onHome = window.location.pathname === "/";

      if (!onHome) {
        timeline.to(
          small,
          { filter: "brightness(0) invert(1)", duration: 0.36 },
          tLand,
        );
      }

      if (glass) {
        timeline.fromTo(
          glass,
          { opacity: 0 },
          { opacity: 1, duration: 0.34, ease: "power2.out", pointerEvents: "auto" },
          tLand + 0.04,
        );
      }

      timeline.fromTo(
        logos,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: "none" },
        tLand + 0.16,
      );

      timeline.to(mark, { opacity: 0, duration: 0.2, ease: "none" }, tLand + 0.16);

      if (laterItems.length > 0) {
        timeline.fromTo(
          laterItems,
          { opacity: 0 },
          { opacity: 1, duration: 0.28, ease: "power2.out", pointerEvents: "auto" },
          tLand + 0.2,
        );
      }

      timeline.to(
        overlayEl,
        { autoAlpha: 0, duration: 0.22, ease: "power2.out" },
        tLand + 0.24,
      );
    }

    void play(overlay, veilEl, markEl, clipEl, fullEl, smallEl);

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
      timeline?.kill();
      gsap.killTweensOf(headerEls);
      document.documentElement.classList.remove("is-preloading");
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div ref={rootRef} className="site-preloader" aria-hidden="true">
      <div ref={veilRef} className="site-preloader__veil" />
      <div ref={markRef} className="site-preloader__mark">
        <div ref={clipRef} className="site-preloader__full-clip">
          <img
            ref={fullRef}
            className="site-preloader__full"
            src="/brand/full-logo.svg"
            alt=""
            width={311}
            height={31}
          />
        </div>
        <img
          ref={smallRef}
          className="site-preloader__small"
          src="/brand/small-black-logo.svg"
          alt=""
          width={71}
          height={29}
        />
      </div>
    </div>
  );
}
