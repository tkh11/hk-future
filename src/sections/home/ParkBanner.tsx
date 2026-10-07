"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { publicPath } from "@/lib/public-path";

const slides = [
  {
    title: "Создаём среду для жизни",
    description: "Комплексные инженерные решения для общественных пространств и объектов любого масштаба.",
    label: "Парк Галицкого",
  },
  {
    title: "Системы для ваших проектов",
    description: "Трубы, фитинги и арматура для комплексных инженерных решений.",
    label: "Трубопроводные системы",
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

const fallbackDuration = [10000, 10000];

export default function ParkBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const progressRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const elapsedRef = useRef(0);
  const [selection, setSelection] = useState({ index: 0, cycle: 0 });
  const [inView, setInView] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [failed, setFailed] = useState<[boolean, boolean]>([false, false]);
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const activeSlide = selection.index;
  const running = inView && pageVisible && !reducedMotion;
  const slide = slides[activeSlide];

  const markFailed = useCallback((index: number) => {
    setFailed(previous => {
      if (previous[index]) return previous;
      const next: [boolean, boolean] = [...previous];
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
            aria-label="Панорама парка Галицкого со стадионом и бассейном"
            onEnded={() => selectSlide(0)}
            onError={() => markFailed(1)}
          />
        </div>
        <div className="park-banner__copy">
          <h1 className="park-banner__title">{slide.title}</h1>
          <p className="park-banner__description">{slide.description}</p>
          <div className="park-banner__actions">
            <Link href="/catalog" className="home-hero__link park-banner__button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              Смотреть каталог
            </Link>
          </div>
          <ul className="park-banner__benefits" aria-label="Преимущества HEISSKRAFT">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10" /></svg>
              <span>Комплексные<br />решения</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" aria-hidden="true"><path d="M12 2 20 5v6c0 5-4 9-8 11-4-2-8-6-8-11V5Z" /></svg>
              <span>Качество<br />и надёжность</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V10l6 3V8l6 4V3h5l1 18ZM7 17h2m3 0h2m3 0h2" /></svg>
              <span>Собственное<br />производство</span>
            </li>
          </ul>
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
