"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";

// Keeps the beats in sync before the browser reports the real metadata.
const VIDEO_DURATION = 19.2;

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
    cta: { label: "Оставить заявку", href: "#project-form", accent: true },
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

function useScrollVideo(
  sectionRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
) {
  const [beat, setBeat] = useState(-1);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;

    if (!section || !video) {
      return;
    }

    let frame = 0;
    let duration = 0;
    let unlocked = false;
    let running = true;

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

    const progress = () => {
      const scrollable = section.offsetHeight - window.innerHeight;

      if (scrollable <= 0) {
        return 0;
      }

      return clamp01(-section.getBoundingClientRect().top / scrollable);
    };

    const tick = () => {
      if (!running) {
        return;
      }

      frame = requestAnimationFrame(tick);

      const scrolled = progress();
      const nextBeat = beatIndexAt(scrolled * (duration || VIDEO_DURATION));

      setBeat((current) => (current === nextBeat ? current : nextBeat));

      if (!duration || video.readyState < HTMLMediaElement.HAVE_METADATA || video.seeking) {
        return;
      }

      const nextTime = Math.min(scrolled * duration, Math.max(0, duration - 0.001));

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
    };

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.pause();

    video.addEventListener("loadedmetadata", rememberDuration);
    video.addEventListener("durationchange", rememberDuration);
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("wheel", unlock, { passive: true });

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      rememberDuration();
    }

    frame = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      video.removeEventListener("loadedmetadata", rememberDuration);
      video.removeEventListener("durationchange", rememberDuration);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("wheel", unlock);
    };
  }, [sectionRef, videoRef]);

  return beat;
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = useScrollVideo(sectionRef, videoRef);

  return (
    <section ref={sectionRef} data-header-theme="light" className="hero">
      <div className="hero__sticky">
        <video
          ref={videoRef}
          className="hero__media"
          src="/videos/hero-fittings.mp4"
          poster="/videos/hero-fittings-poster.jpg"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
        />

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
      </div>
    </section>
  );
}
