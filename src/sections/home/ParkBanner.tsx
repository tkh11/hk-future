"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

const description = "Насосное оборудование, трубопроводные системы и фитинги HEISSKRAFT — в парке Галицкого.";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => value * value * (3 - 2 * value);

export default function ParkBanner() {
  const [imageReady, setImageReady] = useState(false);
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const copy = copyRef.current;
    if (!track || !stage || !copy) return;
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;

    const update = () => {
      frameId = 0;
      const distance = Math.max(1, track.offsetHeight - stage.offsetHeight);
      const progress = reduced.matches ? 0 : clamp(-track.getBoundingClientRect().top / distance);
      // Finish the intro once scrolling starts; never restart it on reverse scroll.
      if (progress > 0 || reduced.matches) track.dataset.introComplete = "true";
      const shrink = smooth(clamp((progress - 0.08) / 0.8));
      const text = smooth(clamp(progress / 0.42));
      const reveal = reduced.matches ? 1 : smooth(clamp((progress - 0.35) / 0.3));
      track.style.setProperty("--park-shrink", String(shrink));
      track.style.setProperty("--park-text", String(text));
      track.style.setProperty("--park-caption", String(smooth(clamp((progress - 0.65) / 0.25))));
      // Hidden calls to action must also leave the keyboard navigation order.
      copy.inert = text > 0.98;
      root.style.setProperty("--header-reveal", String(reveal));
      root.classList.toggle("header-in", reveal > 0.02);
      root.classList.toggle("header-revealed", reveal >= 0.995);
    };
    const schedule = () => {
      if (!frameId) frameId = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(track);
    observer.observe(stage);
    window.addEventListener("scroll", schedule, { passive: true });
    reduced.addEventListener("change", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      reduced.removeEventListener("change", schedule);
      cancelAnimationFrame(frameId);
      root.style.removeProperty("--header-reveal");
      root.classList.remove("header-in", "header-revealed");
      copy.inert = false;
    };
  }, []);

  return (
    <section ref={trackRef} data-header-theme="light" className="park-banner" aria-label="HEISSKRAFT в парке Галицкого">
      <div ref={stageRef} className="park-banner__frame">
        <div className={`park-banner__scene${imageReady ? " is-image-ready" : ""}`}>
          {!imageReady && <div className="park-banner__skeleton" role="status" aria-label="Загрузка панорамы" />}
          <Image
            className="park-banner__image"
            src="/images/home/galitsky-hero-photo.jpg"
            alt="Панорама парка Галицкого со стадионом и круговыми садами"
            fill
            preload
            sizes="(max-width: 767px) 180vh, 100vw"
            draggable={false}
            onLoad={() => setImageReady(true)}
            onError={() => setImageReady(true)}
          />
          <div className="park-banner__shade" />
          <div ref={copyRef} className="park-banner__copy">
            <h1 className="park-banner__title">Инженерия за красотой</h1>
            <div className="park-banner__actions">
              <Link href="/catalog" className="home-hero__link park-banner__button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                Каталог
              </Link>
              <Link href="/projects" className="home-hero__link home-hero__link--secondary park-banner__button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V8l8-4v17M13 10h6v11M8 10v2m0 3v2m8-4v2m0 2v2" /></svg>
                Проекты
              </Link>
            </div>
            <p className="park-banner__description" aria-label={description}>
              <span aria-hidden="true">{description.split(" ").map((word, wordIndex, words) => {
                const offset = words.slice(0, wordIndex).join(" ").length + (wordIndex ? 1 : 0);
                return <span className="park-banner__word" key={wordIndex}>{Array.from(word + (wordIndex < words.length - 1 ? " " : "")).map((letter, index) => (
                  <span className="park-banner__letter" key={index} style={{ "--letter-delay": `${0.85 + (offset + index) * 0.023}s` } as CSSProperties}>{letter}</span>
                ))}</span>;
              })}</span>
            </p>
          </div>
          <div className="park-banner__caption" aria-hidden="true">Парк Галицкого<span>Краснодар</span></div>
          <div className="park-banner__scroll" aria-hidden="true">Прокрутите, чтобы увидеть больше<span>↓</span></div>
        </div>
      </div>
    </section>
  );
}
