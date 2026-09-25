import Image from "next/image";
import Link from "next/link";

export default function PipesBanner() {
  return (
    <section data-header-theme="light" className="home-tile" aria-labelledby="pipes-title">
      <Image
        src="/images/home/pipes-pert.jpg"
        alt="Трубы PE-RT HEISSKRAFT"
        width={2400}
        height={1350}
        sizes="100vw"
        className="home-tile__image"
      />
      <div className="home-tile__copy">
        <h2 id="pipes-title" className="home-tile__title">
          Трубопроводные системы
        </h2>
        <p className="home-tile__subtitle">
          Полипропиленовые и PE-RT трубы и фитинги для водоснабжения и отопления
        </p>
        <div className="home-tile__links">
          <Link href="/catalog" className="home-tile__link">
            Подробнее ›
          </Link>
          <Link href="/catalog" className="home-tile__link">
            Расчёт трубопровода ›
          </Link>
        </div>
      </div>
    </section>
  );
}
