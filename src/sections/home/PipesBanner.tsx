import Link from "next/link";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";

export default function PipesBanner() {
  return (
    <section data-header-theme="light" className="home-tile" aria-labelledby="pipes-title">
      <MediaPlaceholder />
      <div className="home-tile__copy">
        <h2 id="pipes-title" className="home-tile__title">
          Трубопроводные системы
        </h2>
        <p className="home-tile__subtitle">
          Полипропиленовые и PE-RT трубы и фитинги для водоснабжения и отопления
        </p>
        <div className="home-tile__links">
          <Link href="/catalog" className="home-tile__link">
            Подробнее
          </Link>
          <Link href="/catalog" className="home-tile__link home-tile__link--secondary">
            Расчёт трубопровода
          </Link>
        </div>
      </div>
    </section>
  );
}
