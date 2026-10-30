"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { publicPath } from "@/lib/public-path";
import styles from "./Catalog.module.css";

export default function CatalogCoverVideo({ src, active }: { src: string; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const poster = publicPath(src.replace("/videos/", "/images/").replace(".mp4", "-poster.jpg"));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let pending = false;
    let revision = 0;
    let frame: number | undefined;
    let retry: number | undefined;
    const allowed = () => !disposed && active && document.visibilityState === "visible" && !motion.matches;

    function hideFrame() {
      if (frame !== undefined) video!.cancelVideoFrameCallback(frame);
      frame = undefined;
      setReady(false);
    }
    function showFrame() {
      if (!allowed() || video!.readyState < 2 || frame !== undefined) return;
      // A resolved play() promise alone does not guarantee that a discarded
      // background-tab video surface has received its first decoded frame.
      if (typeof video!.requestVideoFrameCallback === "function") {
        frame = video!.requestVideoFrameCallback(() => {
          frame = undefined;
          if (allowed() && !video!.paused && video!.readyState >= 2) setReady(true);
        });
      } else setReady(true);
    }
    function startPlayback(allowRetry = true) {
      if (!allowed() || pending || video!.error) return;
      pending = true;
      const request = ++revision;
      void video!.play().then(() => {
        if (disposed || request !== revision) return;
        pending = false;
        showFrame();
      }).catch((error: unknown) => {
        if (disposed || request !== revision) return;
        pending = false;
        hideFrame();
        // An interrupted play is transient, not a failed video. Retry once;
        // subsequent visibility/focus/canplay events can recover independently.
        if (allowRetry && allowed() && error instanceof DOMException && error.name === "AbortError") {
          retry = requestAnimationFrame(() => { retry = undefined; startPlayback(false); });
        }
      });
    }
    function syncPlayback() {
      if (!allowed()) {
        revision += 1;
        pending = false;
        if (retry !== undefined) cancelAnimationFrame(retry);
        retry = undefined;
        hideFrame();
        video!.pause();
      } else startPlayback();
    }
    function onPlaying() {
      if (allowed()) showFrame();
      else { hideFrame(); video!.pause(); }
    }
    // React may batch hidden -> visible into the same render. Handle these
    // events directly so a resume never depends on a boolean state change.
    document.addEventListener("visibilitychange", syncPlayback);
    window.addEventListener("pageshow", syncPlayback);
    window.addEventListener("focus", syncPlayback);
    motion.addEventListener("change", syncPlayback);
    video.addEventListener("canplay", syncPlayback);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", hideFrame);
    video.addEventListener("waiting", hideFrame);
    video.addEventListener("emptied", hideFrame);
    video.addEventListener("error", hideFrame);
    syncPlayback();
    return () => {
      disposed = true;
      if (frame !== undefined) video.cancelVideoFrameCallback(frame);
      if (retry !== undefined) cancelAnimationFrame(retry);
      document.removeEventListener("visibilitychange", syncPlayback);
      window.removeEventListener("pageshow", syncPlayback);
      window.removeEventListener("focus", syncPlayback);
      motion.removeEventListener("change", syncPlayback);
      video.removeEventListener("canplay", syncPlayback);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", hideFrame);
      video.removeEventListener("waiting", hideFrame);
      video.removeEventListener("emptied", hideFrame);
      video.removeEventListener("error", hideFrame);
      video.pause();
    };
  }, [active, src]);

  return <>
    <Image src={poster} className={styles.coverVideo} width={900} height={1600} unoptimized loading="eager" alt="" />
    <video ref={videoRef} className={styles.coverVideo} data-ready={ready && active}
      src={publicPath(src)} poster={poster} muted loop playsInline preload="none" aria-hidden="true" />
  </>;
}
