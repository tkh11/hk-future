"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { preload } from "react-dom";
import { publicPath } from "@/lib/public-path";

const slides = [
  {
    title: "Инженерные системы будущего",
    description: "Комплексные инженерные решения для общественных пространств и объектов любого масштаба.",
    label: "Инженерные системы будущего",
    video: "hero-opening",
    alt: "Архитектурная анимация: изогнутый белый фасад",
  },
  {
    title: "Создаём среду для жизни",
    description: "Собственное производство и полный цикл поставки оборудования для инженерных систем.",
    label: "Среда для жизни",
    video: "gali",
    alt: "Стадион парка Галицкого за водной гладью",
  },
  {
    title: "Инженерия для городской среды",
    description: "Надёжные системы для парков, стадионов и общественных объектов.",
    note: "Оборудование HEISSKRAFT в парке Галицкого",
    label: "Городская среда",
    video: "galits",
    alt: "Аэросъёмка парка со стадионом и круговыми дорожками",
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
  preload(publicPath("/images/home/hero-opening-poster.jpg"), { as: "image", fetchPriority: "high" });
  const sectionRef = useRef<HTMLElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const progressRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const elapsedRef = useRef(0);
  const [selection, setSelection] = useState({ index: 0, cycle: 0 });
  // Updated synchronously on selection so queued events cannot select an old slide.
  const selectionRef = useRef(selection);
  const [ready, setReady] = useState(() => slides.map(() => false));
  const [inView, setInView] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [requested, setRequested] = useState([true, false, false]);
  const [failed, setFailed] = useState<boolean[]>(() => slides.map(() => false));
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const activeSlide = selection.index;
  const activeRequested = requested[activeSlide];
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
    setRequested(current => current[index] ? current : current.map((value, i) => value || i === index));
    elapsedRef.current = 0;
    const next = { index, cycle: selectionRef.current.cycle + 1 };
    selectionRef.current = next;
    setReady(current => current.map((value, i) => i === index ? false : value));
    videoRefs.current.forEach((video, slideIndex) => {
      if (!video) return;
      video.pause();
      // Keep the outgoing frame throughout the fade. Rewind only the incoming video.
      if (slideIndex === index) {
        if (video.readyState > 0) video.currentTime = 0;
        if (video.error) video.load();
      }
    });
    setFailed(current => current.map((value, i) => i === index ? false : value));
    progressRefs.current.forEach((fill, slideIndex) => {
      if (fill) fill.style.transform = `scaleX(${slideIndex < index ? 1 : 0})`;
    });
    setSelection(next);
  }, []);

  const finishSlide = useCallback((index: number, video: HTMLVideoElement) => {
    if (selectionRef.current.index !== index || !video.ended || !running || document.hidden) return;
    selectSlide((index + 1) % slides.length);
  }, [running, selectSlide]);

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
    let preparedNext = false;

    function updateProgress(now: number) {
      if (selectionRef.current !== selection) return;
      if (document.visibilityState === "hidden") {
        previousTime = now;
        frame = requestAnimationFrame(updateProgress);
        return;
      }
      elapsedRef.current += Math.min(now - previousTime, 250);
      previousTime = now;
      const video = videoRefs.current[activeSlide];
      const progress = timedSlide
        ? Math.min(1, elapsedRef.current / duration)
        : video && Number.isFinite(video.duration) && video.duration > 0
          ? Math.min(1, video.currentTime / video.duration)
          : 0;
      // Prepare only the next slide near the end, instead of fetching every video on entry.
      if (!preparedNext && (timedSlide ? duration - elapsedRef.current <= 3000 : video && Number.isFinite(video.duration) && video.duration - video.currentTime <= 3)) {
        preparedNext = true;
        const next = (activeSlide + 1) % slides.length;
        setRequested(current => current[next] ? current : current.map((value, i) => value || i === next));
      }
      progressRefs.current.forEach((fill, index) => {
        if (fill) fill.style.transform = `scaleX(${index < activeSlide ? 1 : index === activeSlide ? progress : 0})`;
      });
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
    const video = videoRefs.current[activeSlide];
    if (!video || !running || !loadVideo || !activeRequested) return;
    let cancelled = false;
    if (video.ended) {
      // The browser may finish a clip just as the tab becomes hidden.
      finishSlide(activeSlide, video);
    } else if (!video.error) {
      void video.play().catch((error: unknown) => {
        if (cancelled || selectionRef.current !== selection || document.hidden) return;
        // pause(), a source change and backgrounding can all interrupt play().
        // These are not broken media and must not permanently disable playback.
        if (error instanceof DOMException && error.name === "AbortError") return;
        markFailed(activeSlide);
      });
    }
    return () => { cancelled = true; video.pause(); };
  }, [selection, activeSlide, running, loadVideo, activeRequested, markFailed, finishSlide]);

  return (
    <section ref={sectionRef} data-header-theme="light" className="park-banner" aria-label="Решения HEISSKRAFT" aria-roledescription="карусель">
      <div className="park-banner__scene" data-slide={activeSlide + 1} data-playing={running}>
        {slides.map((item, index) => (
          <div key={item.video} className={`park-banner__slide park-banner__slide--${index === 0 ? "park" : "video"}${activeSlide === index ? " is-active" : ""}`} aria-hidden={activeSlide !== index}>
            {requested[index] && <Image
              className="park-banner__video park-banner__poster"
              src={publicPath(`/images/home/${item.video}-poster.jpg`)}
              alt=""
              width={1920}
              height={1080}
              unoptimized
              loading="eager"
              aria-hidden="true"
            />}
            <video
              ref={element => { videoRefs.current[index] = element; }}
              className="park-banner__video"
              data-ready={ready[index] && (activeSlide !== index || running) && !failed[index]}
              src={loadVideo && !reducedMotion && requested[index] ? publicPath(`/videos/home/${item.video}.mp4`) : undefined}
              poster={requested[index] ? publicPath(`/images/home/${item.video}-poster.jpg`) : undefined}
              preload="auto"
              muted
              playsInline
              aria-label={item.alt}
              onPlaying={event => {
                if (selectionRef.current.index !== index || !running || document.hidden) {
                  event.currentTarget.pause();
                  return;
                }
                if (event.currentTarget.readyState >= 2) {
                  setReady(current => current[index] ? current : current.map((value, i) => value || i === index));
                  setFailed(current => current[index] ? current.map((value, i) => i === index ? false : value) : current);
                }
              }}
              onPause={() => {
                if (selectionRef.current.index === index) setReady(current => current.map((value, i) => i === index ? false : value));
              }}
              onWaiting={() => setReady(current => current.map((value, i) => i === index ? false : value))}
              onEnded={event => finishSlide(index, event.currentTarget)}
              onError={() => markFailed(index)}
            />
          </div>
        ))}
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
