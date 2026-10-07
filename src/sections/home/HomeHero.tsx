import Link from "next/link";
import HoldFrameVideo from "@/components/ui/HoldFrameVideo";
import styles from "./HomeHero.module.css";

export default function HomeHero() {
  return (
    <section id="about-company" data-header-theme="light" className={styles.section} aria-labelledby="company-heading">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 id="company-heading" className={styles.heading}>О компании</h2>
          <p className={styles.description}>
            HEISSKRAFT — российский производитель трубопроводных систем,
            насосного оборудования и арматуры.
          </p>
          <p className={styles.text}>
            Более 25 лет на рынке. Выпускаем продукцию на собственном производстве
            в России и объединяем её в комплексные инженерные решения.
          </p>
          <div className={styles.actions}>
            <Link href="/catalog" className="home-hero__link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Продукция
            </Link>
            <Link href="/projects" className="home-hero__link home-hero__link--secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18M5 21V8l8-4v17M13 10h6v11M8 10v2m0 3v2m8-4v2m0 2v2" />
              </svg>
              Наши проекты
            </Link>
          </div>
        </div>
        <div className={styles.media}>
          <HoldFrameVideo
            mp4="/videos/home/hero-hk-25-pingpong.mp4"
            webm="/videos/home/hero-hk-25-pingpong.webm"
            poster="/images/home/hero-hk-25-first.jpg"
            still="/images/home/hero-hk-25-last.jpg"
            width={1280}
            height={704}
            alt="Логотип HEISSKRAFT и число 25"
            sizes="(max-width: 699px) calc(100vw - 32px), (max-width: 899px) calc((100vw - 72px) / 2), (max-width: 1140px) calc((100vw - 104px) / 2), 518px"
            play="inview"
            loop
            videoClassName={styles.video}
            stillClassName={styles.still}
            controlsClassName={styles.videoControl}
          />
        </div>
      </div>
    </section>
  );
}
