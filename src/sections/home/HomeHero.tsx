import Link from "next/link";
import HoldFrameVideo from "@/components/ui/HoldFrameVideo";
import styles from "./HomeHero.module.css";

export default function HomeHero() {
  return (
    <section id="about-company" data-header-theme="light" className={styles.section} aria-labelledby="company-heading">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 id="company-heading" className={styles.heading}>О компании</h2>
          <div className={styles.description}>
            <p>
              Компания Heisskraft является одним из ведущих производителей инновационной
              продукции в области инженерных систем, реализуемых в различных отраслях
              промышленности. Каждый день наша команда работает над увеличением сроков
              службы и эффективности производимой продукции во вновь возводимых или
              реконструируемых инженерных коммуникациях.
            </p>
            <p>
              Наш девиз — «Качество в деталях» — полностью отражает дух нашей работы
              и комплекс процессов, который направлен на разработку новых идей и продуктов
              в области полимерных трубопроводов и насосного оборудования.
            </p>
            <p>
              Реализованный системный подход к контролю качества позволяет проследить
              весь путь изделия — от момента его разработки до практического применения
              в инженерных системах.
            </p>
            <p>
              В сотрудничестве с нашими партнерами мы постоянно развиваемся
              и внедряем инновации в жизнь!
            </p>
          </div>
          <p className={styles.text}>
            Более 25 лет на рынке. Выпускаем продукцию на собственном производстве
            в России и объединяем её в комплексные инженерные решения.
          </p>
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
            sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 899px) 608px, (max-width: 1328px) calc((100vw - 112px) / 2), 608px"
            play="inview"
            loop
            videoClassName={styles.video}
            stillClassName={styles.still}
          />
        </div>
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
    </section>
  );
}
