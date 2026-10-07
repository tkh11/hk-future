"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { publicPath } from "@/lib/public-path";

type HoldFrameVideoProps = {
  mp4: string;
  webm: string;
  poster: string;
  still: string;
  width: number;
  height: number;
  alt: string;
  sizes: string;
  play: "immediate" | "inview";
  videoClassName: string;
  stillClassName: string;
  controlsClassName?: string;
  loop?: boolean;
};

export default function HoldFrameVideo({
  mp4,
  webm,
  poster,
  still,
  width,
  height,
  alt,
  sizes,
  play,
  videoClassName,
  stillClassName,
  controlsClassName,
  loop = false,
}: HoldFrameVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackAllowedRef = useRef(false);
  const manuallyPausedRef = useRef(false);
  const [playback, setPlayback] = useState<"paused" | "playing" | "ended">("paused");

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = play === "immediate";

    const syncPlayback = () => {
      // A deferred section can intersect the viewport while its assets are hidden.
      const hiddenBySection = video.parentElement?.closest('[inert], [aria-hidden="true"], [hidden]');
      const allowed = inView && !document.hidden && !reducedMotion.matches && !hiddenBySection;
      playbackAllowedRef.current = allowed;

      if (!allowed) {
        video.pause();
      } else if (!manuallyPausedRef.current && !video.ended && video.paused) {
        void video.play().catch(() => undefined);
      }
    };

    const intersectionObserver = play === "inview" ? new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        syncPlayback();
      },
      { threshold: [0, 0.35] },
    ) : null;

    // Readiness changes do not necessarily change the intersection ratio.
    const visibilityObserver = new MutationObserver(syncPlayback);
    for (let parent = video.parentElement; parent; parent = parent.parentElement) {
      visibilityObserver.observe(parent, {
        attributes: true,
        attributeFilter: ["inert", "aria-hidden", "hidden"],
      });
    }

    intersectionObserver?.observe(video);
    document.addEventListener("visibilitychange", syncPlayback);
    reducedMotion.addEventListener("change", syncPlayback);
    syncPlayback();

    return () => {
      playbackAllowedRef.current = false;
      intersectionObserver?.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
      video.pause();
    };
  }, [play]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || !playbackAllowedRef.current) return;

    if (video.paused || video.ended) {
      manuallyPausedRef.current = false;
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => undefined);
    } else {
      manuallyPausedRef.current = true;
      video.pause();
    }
  };

  const controlLabel = playback === "ended" ? "Повторить видео" : playback === "playing" ? "Приостановить видео" : "Воспроизвести видео";

  return (
    <>
      <video
        ref={videoRef}
        className={videoClassName}
        poster={publicPath(poster)}
        muted
        playsInline
        loop={loop}
        preload={play === "immediate" ? "auto" : "none"}
        aria-hidden="true"
        onPlay={() => {
          // A pending play request may complete after the section becomes hidden.
          if (!playbackAllowedRef.current) {
            videoRef.current?.pause();
            return;
          }
          setPlayback("playing");
        }}
        onPause={() => setPlayback(videoRef.current?.ended ? "ended" : "paused")}
        onEnded={() => setPlayback("ended")}
      >
        <source src={publicPath(webm)} type="video/webm" />
        <source src={publicPath(mp4)} type="video/mp4" />
      </video>
      <Image
        src={publicPath(still)}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={stillClassName}
      />
      {controlsClassName && (
        <button type="button" className={controlsClassName} onClick={togglePlayback} aria-label={controlLabel} title={controlLabel}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {playback === "ended" ? <><path d="M3 10a9 9 0 1 1 2.6 8.4" /><path d="M3 4v6h6" /></> : playback === "playing" ? <><path d="M8 5v14M16 5v14" /></> : <path d="m8 5 11 7-11 7Z" />}
          </svg>
        </button>
      )}
    </>
  );
}
