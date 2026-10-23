"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Contacts.module.css";

export default function ContactsMap({ mapEmbed, mapUrl }: { mapEmbed: string; mapUrl: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0, rootMargin: "0px" });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={root} className={styles.map} data-loaded={loaded || undefined} data-lenis-prevent>
    {!loaded && <div className={styles.mapPlaceholder} role="status" aria-live="polite">
      {!failed && <span className={styles.mapShimmer} aria-hidden="true" />}
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
      <span>{failed ? "Карта временно недоступна" : "Загрузка карты"}</span>
      {failed ? <a className={styles.mapFallback} href={mapUrl} target="_blank" rel="noopener noreferrer">Открыть в Яндекс Картах</a> : null}
    </div>}
    {visible && !failed && <iframe
      title="HEISSKRAFT — схема проезда в Пушкино"
      src={mapEmbed}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      allowFullScreen
    />}
  </div>;
}
