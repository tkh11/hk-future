"use client";

import { useEffect, useRef } from "react";
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
}: HoldFrameVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      video.pause();
      video.removeAttribute("autoplay");
      return;
    }

    const start = () => {
      const pending = video.play();

      if (pending) {
        pending.catch(() => undefined);
      }
    };

    if (play === "immediate") {
      start();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          start();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, [play]);

  return (
    <>
      <video
        ref={videoRef}
        className={videoClassName}
        poster={publicPath(poster)}
        autoPlay={play === "immediate"}
        muted
        playsInline
        preload={play === "immediate" ? "auto" : "metadata"}
        aria-hidden="true"
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
    </>
  );
}
