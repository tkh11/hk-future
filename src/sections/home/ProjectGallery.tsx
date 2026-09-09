"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const CLIPS = ["/videos/hero-production.mp4", "/videos/hero-warranty.mp4"];

const RADIUS = 24;
const STROKE = 2;

export default function ProjectGallery() {
  const rootRef = useRef<HTMLDivElement>(null);
  const clipsRef = useRef<Array<HTMLVideoElement | null>>([]);
  const progressRef = useRef<SVGRectElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const resize = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      setSize({ width: rect.width, height: rect.height });
    });

    const visibility = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );

    resize.observe(root);
    visibility.observe(root);

    return () => {
      resize.disconnect();
      visibility.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!inView) {
      return;
    }

    for (const clip of clipsRef.current) {
      if (clip) {
        clip.preload = "auto";
      }
    }
  }, [inView]);

  useEffect(() => {
    const clip = clipsRef.current[active];

    if (clip) {
      clip.currentTime = 0;
    }
  }, [active]);

  useEffect(() => {
    clipsRef.current.forEach((clip, index) => {
      if (!clip) {
        return;
      }

      if (index !== active || !inView) {
        clip.pause();
        return;
      }

      void clip.play().catch(() => undefined);
    });
  }, [active, inView]);

  const inset = STROKE / 2;
  const width = Math.max(0, size.width - STROKE);
  const height = Math.max(0, size.height - STROKE);
  const radius = Math.min(RADIUS - inset, width / 2, height / 2);
  const perimeter =
    2 * (width - 2 * radius) + 2 * (height - 2 * radius) + 2 * Math.PI * radius;

  useEffect(() => {
    const clip = clipsRef.current[active];
    const progress = progressRef.current;

    if (!clip || !progress || perimeter <= 0) {
      return;
    }

    let frame = requestAnimationFrame(function tick() {
      frame = requestAnimationFrame(tick);

      const played =
        Number.isFinite(clip.duration) && clip.duration > 0
          ? Math.min(1, clip.currentTime / clip.duration)
          : 0;

      progress.style.strokeDashoffset = String(perimeter * (1 - played));
    });

    return () => cancelAnimationFrame(frame);
  }, [active, perimeter]);

  return (
    <div
      ref={rootRef}
      className="project-gallery"
      style={{ "--gallery-radius": `${RADIUS}px` } as CSSProperties}
    >
      <div className="project-gallery__stage">
        {CLIPS.map((src, index) => (
          <video
            key={src}
            ref={(node) => {
              clipsRef.current[index] = node;
            }}
            className={`project-gallery__clip${index === active ? " is-active" : ""}`}
            src={src}
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            aria-hidden="true"
            onEnded={() => setActive((current) => (current + 1) % CLIPS.length)}
          />
        ))}
      </div>

      {perimeter > 0 ? (
        <svg
          className="project-gallery__timeline"
          width={size.width}
          height={size.height}
          aria-hidden="true"
        >
          <rect
            className="project-gallery__timeline-track"
            x={inset}
            y={inset}
            width={width}
            height={height}
            rx={radius}
            strokeWidth={STROKE}
          />
          <rect
            ref={progressRef}
            className="project-gallery__timeline-value"
            x={inset}
            y={inset}
            width={width}
            height={height}
            rx={radius}
            strokeWidth={STROKE}
            strokeDasharray={perimeter}
            strokeDashoffset={perimeter}
          />
        </svg>
      ) : null}
    </div>
  );
}
