"use client";

import { useEffect, useRef, type RefObject } from "react";

function useScrollVideo(
  sectionRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
) {
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

      if (!duration || video.readyState < HTMLMediaElement.HAVE_METADATA || video.seeking) {
        return;
      }

      const nextTime = Math.min(progress() * duration, Math.max(0, duration - 0.001));

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
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useScrollVideo(sectionRef, videoRef);

  return (
    <section ref={sectionRef} data-header-theme="dark" className="hero">
      <div className="hero__sticky">
        <video
          ref={videoRef}
          className="hero__media"
          src="/videos/master-scene-01.mp4"
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
