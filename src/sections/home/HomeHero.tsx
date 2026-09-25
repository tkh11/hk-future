import Link from "next/link";
import HoldFrameVideo from "@/components/ui/HoldFrameVideo";

export default function HomeHero() {
  return (
    <section data-header-theme="light" className="home-hero">
      <div className="home-hero__media">
        <HoldFrameVideo
          mp4="/videos/home/hero-hk-25.mp4"
          webm="/videos/home/hero-hk-25.webm"
          poster="/images/home/hero-hk-25-first.jpg"
          still="/images/home/hero-hk-25-last.jpg"
          width={1280}
          height={704}
          alt="Логотип HEISSKRAFT и число 25"
          sizes="100vw"
          play="immediate"
          videoClassName="home-hero__video"
          stillClassName="home-hero__still"
        />
      </div>

      <div className="home-hero__copy">
        <h1 className="home-hero__title">Инженерные системы HEISSKRAFT</h1>
        <p className="home-hero__subtitle">
          Трубы, фитинги, насосное оборудование и арматура от российского производителя
        </p>
        <div className="home-hero__links">
          <Link href="/catalog" className="home-hero__link">
            Каталог ›
          </Link>
          <Link href="/catalog" className="home-hero__link">
            Подбор оборудования ›
          </Link>
        </div>
      </div>
    </section>
  );
}
