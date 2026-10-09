"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { publicPath } from "@/lib/public-path";

const slides = [
  {
    title: "Инженерные системы будущего",
    description: "Комплексные инженерные решения для общественных пространств и объектов любого масштаба.",
    label: "Инженерные системы будущего",
  },
  {
    title: "Создаём среду для жизни",
    description: "Собственное производство и полный цикл поставки оборудования для инженерных систем.",
    label: "Среда для жизни",
  },
  {
    title: "Инженерия для городской среды",
    description: "Надёжные системы для парков, стадионов и общественных объектов.",
    note: "Оборудование HEISSKRAFT в парке Галицкого",
    label: "Городская среда",
  },
];

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function subscribeReducedMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

const fallbackDuration = [10000, 10000, 12000];

export default function ParkBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const progressRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const elapsedRef = useRef(0);
  const [selection, setSelection] = useState({ index: 0, cycle: 0 });
  const [inView, setInView] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [failed, setFailed] = useState<boolean[]>(() => slides.map(() => false));
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const activeSlide = selection.index;
  const running = inView && pageVisible && !reducedMotion;
  const slide = slides[activeSlide];

  const markFailed = useCallback((index: number) => {
    setFailed(previous => {
      if (previous[index]) return previous;
      const next = [...previous];
      next[index] = true;
      return next;
    });
  }, []);

  const selectSlide = useCallback((index: number) => {
    elapsedRef.current = 0;
    videoRefs.current.forEach(video => {
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    });
    progressRefs.current.forEach((fill, slideIndex) => {
      if (fill) fill.style.transform = `scaleX(${slideIndex < index ? 1 : 0})`;
    });
    setSelection(previous => ({ index, cycle: previous.cycle + 1 }));
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && entry.intersectionRatio >= 0.2);
      if (entry.isIntersecting) setLoadVideo(true);
    }, { threshold: 0.2 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let previousTime = performance.now();
    const timedSlide = failed[activeSlide];
    const duration = fallbackDuration[activeSlide];

    function updateProgress(now: number) {
      if (document.visibilityState === "hidden") {
        previousTime = now;
        frame = requestAnimationFrame(updateProgress);
        return;
      }
      elapsedRef.current += now - previousTime;
      previousTime = now;
      const video = videoRefs.current[activeSlide];
      const progress = timedSlide
        ? Math.min(1, elapsedRef.current / duration)
        : video && Number.isFinite(video.duration) && video.duration > 0
          ? Math.min(1, video.currentTime / video.duration)
          : 0;
      const fill = progressRefs.current[activeSlide];
      if (fill) fill.style.transform = `scaleX(${progress})`;
      if (timedSlide && progress >= 1) {
        selectSlide((activeSlide + 1) % slides.length);
        return;
      }
      frame = requestAnimationFrame(updateProgress);
    }

    frame = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(frame);
  }, [selection, activeSlide, running, failed, selectSlide]);

  useEffect(() => {
    let cancelled = false;
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      const active = index === activeSlide && running && !failed[index];
      if (!active) {
        video.pause();
        if (index !== activeSlide) video.currentTime = 0;
        return;
      }
      void video.play().catch(() => { if (!cancelled) markFailed(index); });
    });
    return () => { cancelled = true; };
  }, [selection, activeSlide, running, loadVideo, failed, markFailed]);

  return (
    <section ref={sectionRef} data-header-theme="light" className="park-banner" aria-label="Решения HEISSKRAFT" aria-roledescription="карусель">
      <div className="park-banner__scene" data-slide={activeSlide + 1} data-playing={running}>
        <div className={`park-banner__slide park-banner__slide--park${activeSlide === 0 ? " is-active" : ""}`} aria-hidden={activeSlide !== 0}>
          <video
            ref={element => { videoRefs.current[0] = element; }}
            className="park-banner__video"
            src={publicPath("/videos/home/hero-opening.mp4")}
            preload="auto"
            muted
            playsInline
            aria-label="Архитектурная анимация: изогнутый белый фасад"
            onEnded={() => selectSlide(1)}
            onError={() => markFailed(0)}
          />
        </div>
        <div className={`park-banner__slide park-banner__slide--video${activeSlide === 1 ? " is-active" : ""}`} aria-hidden={activeSlide !== 1}>
          <video
            ref={element => { videoRefs.current[1] = element; }}
            className="park-banner__video"
            src={loadVideo ? publicPath("/videos/home/gali.mp4") : undefined}
            poster={publicPath("/images/home/gali-poster.jpg")}
            preload="auto"
            muted
            playsInline
            aria-label="Стадион парка Галицкого за водной гладью"
            onEnded={() => selectSlide(2)}
            onError={() => markFailed(1)}
          />
        </div>
        <div className={`park-banner__slide park-banner__slide--video${activeSlide === 2 ? " is-active" : ""}`} aria-hidden={activeSlide !== 2}>
          <video
            ref={element => { videoRefs.current[2] = element; }}
            className="park-banner__video"
            src={loadVideo ? publicPath("/videos/home/galits.mp4") : undefined}
            poster={publicPath("/images/home/galits-poster.jpg")}
            preload="auto"
            muted
            playsInline
            aria-label="Аэросъёмка парка со стадионом и круговыми дорожками"
            onEnded={() => selectSlide(0)}
            onError={() => markFailed(2)}
          />
        </div>
        <div className="park-banner__copy">
          <h1 className="park-banner__title">{slide.title}</h1>
          <p className="park-banner__description">{slide.description}</p>
          {slide.note && <p className="park-banner__note">{slide.note}</p>}
          <div className="park-banner__actions">
            <Link href="/catalog" className="home-hero__link park-banner__button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              Смотреть каталог
            </Link>
          </div>
        </div>
        <div className="park-banner__controls" role="group" aria-label="Управление слайдами">
          {slides.map((item, index) => (
            <button key={item.label} type="button" className="park-banner__dot" aria-label={`Слайд ${index + 1}: ${item.label}`} aria-pressed={activeSlide === index} onClick={() => selectSlide(index)}>
              <span className="park-banner__track" aria-hidden="true">
                <span className="park-banner__progress" ref={element => { progressRefs.current[index] = element; }} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
