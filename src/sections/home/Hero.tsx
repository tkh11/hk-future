"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { publicPath } from "@/lib/public-path";

// Keeps the beats in sync before the browser reports the real metadata.
const VIDEO_DURATION = 19.2;
const IDLE_UNTIL = 0.012;
const REWIND_RATE = 10;

type HeroMode = "idle" | "rewind" | "scroll";

type Beat = {
  id: string;
  at: number;
  side: "left" | "right";
  title: string;
  caps?: boolean;
  text?: string;
  cta: {
    label: string;
    href: string;
    accent?: boolean;
  };
};

const BEATS: Beat[] = [
  {
    id: "systems",
    at: 5,
    side: "right",
    caps: true,
    title: "Инженерные системы будущего",
    text: "Полностью закрываем объекты продукцией от HEISSKRAFT",
    cta: { label: "Каталоги HEISSKRAFT", href: "/catalog" },
  },
  {
    id: "quality",
    at: 10,
    side: "left",
    title: "Качество в деталях",
    text: "Мы ответственно подходим к производству нашей продукции, в особенности к подбору материалов, чтобы инженерные системы служили многие годы",
    cta: { label: "Гарантия и качество", href: "/warranty" },
  },
  {
    id: "experience",
    at: 13,
    side: "right",
    caps: true,
    title: "Более 25 лет на рынке",
    cta: { label: "Проекты HEISSKRAFT", href: "/projects" },
  },
  {
    id: "request",
    at: 16,
    side: "left",
    title: "Решения HEISSKRAFT для ваших проектов",
    cta: { label: "Оставить заявку", href: "/catalog", accent: true },
  },
];

function beatIndexAt(time: number) {
  let index = -1;

  for (let i = 0; i < BEATS.length; i += 1) {
    if (time >= BEATS[i].at) {
      index = i;
    }
  }

  return index;
}

function prepareVideo(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
}

function useScrollVideo(
  sectionRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  idleRef: RefObject<HTMLVideoElement | null>,
) {
  const [beat, setBeat] = useState(-1);
  const [mode, setMode] = useState<HeroMode>("idle");

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    const idle = idleRef.current;

    if (!section || !video || !idle) {
      return;
    }

    let frame = 0;
    let duration = 0;
    let unlocked = false;
    let running = true;
    let phase: HeroMode = "idle";
    let rewindFrom = 0;
    let rewindStartedAt = 0;
    let rewindMs = 180;
    let playhead = 0;
    let catchingUp = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

    const progress = () => {
      const scrollable = section.offsetHeight - window.innerHeight;

      if (scrollable <= 0) {
        return 0;
      }

      return clamp01(-section.getBoundingClientRect().top / scrollable);
    };

    const applyMode = (next: HeroMode) => {
      if (phase === next) {
        return;
      }

      phase = next;
      setMode((current) => (current === next ? current : next));
    };

    const playIdle = () => {
      if (reduced) {
        idle.pause();
        return;
      }

      const attempt = idle.play();

      if (attempt) {
        attempt.catch(() => {
          unlocked = false;
        });
      }
    };

    const tick = (now: number) => {
      if (!running) {
        return;
      }

      frame = requestAnimationFrame(tick);

      const scrolled = progress();
      const wantsIdle = scrolled < IDLE_UNTIL;
      const nextBeat = beatIndexAt(scrolled * (duration || VIDEO_DURATION));

      setBeat((current) => (current === nextBeat ? current : nextBeat));

      if (reduced) {
        applyMode(wantsIdle ? "idle" : "scroll");
        idle.pause();
      } else if (phase === "idle") {
        if (!wantsIdle) {
          rewindFrom = Number.isFinite(idle.currentTime) ? idle.currentTime : 0;
          rewindMs = Math.min(520, Math.max(140, (rewindFrom / REWIND_RATE) * 1000));
          rewindStartedAt = now;
          idle.pause();
          applyMode("rewind");
        } else if (idle.paused && idle.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          playIdle();
        }
      } else if (phase === "rewind") {
        const t = Math.min(1, (now - rewindStartedAt) / rewindMs);
        const nextTime = rewindFrom * (1 - (1 - t) ** 3);

        if (idle.readyState >= HTMLMediaElement.HAVE_METADATA && !idle.seeking) {
          if (Math.abs(idle.currentTime - nextTime) >= 0.001) {
            idle.currentTime = nextTime;
          }
        }

        if (t >= 1) {
          idle.currentTime = 0;
          playhead = 0;
          catchingUp = true;
          applyMode("scroll");
        }
      } else if (wantsIdle) {
        idle.currentTime = 0;
        catchingUp = false;
        playhead = 0;
        applyMode("idle");
        playIdle();
      }

      if (!duration || video.readyState < HTMLMediaElement.HAVE_METADATA || video.seeking) {
        return;
      }

      const scrolledTime = Math.min(scrolled * duration, Math.max(0, duration - 0.001));
      let nextTime = 0;

      if (phase === "scroll") {
        if (catchingUp) {
          playhead += (scrolledTime - playhead) * 0.22;

          if (Math.abs(scrolledTime - playhead) < 0.05) {
            playhead = scrolledTime;
            catchingUp = false;
          }

          nextTime = playhead;
        } else {
          nextTime = scrolledTime;
        }
      }

      if (Math.abs(video.currentTime - nextTime) < 0.001) {
        return;
      }

      video.pause();
      video.currentTime = nextTime;
    };

    const rememberDuration = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.pause();
    };

    const unlock = () => {
      if (unlocked) {
        return;
      }

      unlocked = true;

      const attempt = video.play();

      if (attempt) {
        attempt
          .then(() => {
            video.pause();
          })
          .catch(() => {
            unlocked = false;
          });
      }

      if (phase === "idle") {
        playIdle();
      }
    };

    prepareVideo(video);
    prepareVideo(idle);
    idle.loop = true;
    video.pause();

    video.addEventListener("loadedmetadata", rememberDuration);
    video.addEventListener("durationchange", rememberDuration);
    video.addEventListener("loadeddata", unlock);
    idle.addEventListener("loadeddata", unlock);
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("wheel", unlock, { passive: true });

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      rememberDuration();
    }

    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ||
      idle.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      unlock();
    }

    frame = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      video.removeEventListener("loadedmetadata", rememberDuration);
      video.removeEventListener("durationchange", rememberDuration);
      video.removeEventListener("loadeddata", unlock);
      idle.removeEventListener("loadeddata", unlock);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("wheel", unlock);
    };
  }, [sectionRef, videoRef, idleRef]);

  return { beat, mode };
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const idleRef = useRef<HTMLVideoElement>(null);
  const { beat: active, mode } = useScrollVideo(sectionRef, videoRef, idleRef);

  return (
    <section
      ref={sectionRef}
      data-header-theme="light"
      className={`hero is-${mode}`}
    >
      <div className="hero__sticky">
        <div className="hero__viewport">
          <video
            ref={videoRef}
            className="hero__media"
            src={publicPath("/videos/hero-fittings.mp4")}
            poster={publicPath("/videos/hero-fittings-poster.jpg")}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden="true"
          />
          <video
            ref={idleRef}
            className="hero__media hero__idle"
            src={publicPath("/videos/hero-idle.mp4")}
            poster={publicPath("/videos/hero-fittings-poster.jpg")}
            muted
            playsInline
            loop
            autoPlay
            preload="auto"
            disablePictureInPicture
            aria-hidden="true"
          />
        </div>

        <div className="hero__stage">
          {BEATS.map((beat, index) => {
            const isActive = index === active;

            return (
              <article
                key={beat.id}
                className={`hero__beat hero__beat--${beat.side}${isActive ? " is-active" : ""}`}
                aria-hidden={!isActive}
                inert={!isActive}
              >
                <div className="hero__panel">
                  <h2 className={`hero__title${beat.caps ? " hero__title--caps" : ""}`}>
                    {beat.title}
                  </h2>

                  {beat.text ? <p className="hero__text">{beat.text}</p> : null}

                  {beat.cta.href.startsWith("#") ? (
                    <a
                      href={beat.cta.href}
                      className={`hero__cta${beat.cta.accent ? " hero__cta--accent" : ""}`}
                    >
                      {beat.cta.label}
                      <span aria-hidden="true">→</span>
                    </a>
                  ) : (
                    <Link
                      href={beat.cta.href}
                      className={`hero__cta${beat.cta.accent ? " hero__cta--accent" : ""}`}
                    >
                      {beat.cta.label}
                      <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="hero__hint" aria-hidden="true">
          <span className="hero__hint-arrow">
            <span />
          </span>
          <span className="hero__hint-label">Листайте</span>
          <span className="hero__hint-arrow">
            <span />
          </span>
        </div>
      </div>
    </section>
  );
}
