import Link from "next/link";
import MediaPlaceholder from "@/components/ui/MediaPlaceholder";

export default function CategorySplit() {
  return (
    <section data-header-theme="light" className="category-split" aria-label="Категории продукции">
      <article className="category-split__tile">
        <MediaPlaceholder />
        <div className="category-split__copy">
          <h2 className="category-split__title">Насосное оборудование</h2>
          <p className="category-split__subtitle">
            Циркуляционные, дренажные и повысительные насосы
          </p>
          <div className="category-split__links">
            <Link href="/catalog" className="category-split__link">
              Подробнее
            </Link>
            <Link href="/catalog" className="category-split__link category-split__link--secondary">
              Подобрать насос
            </Link>
          </div>
        </div>
      </article>

      <article className="category-split__tile">
        <MediaPlaceholder />
        <div className="category-split__copy">
          <h2 className="category-split__title">Арматура</h2>
          <p className="category-split__subtitle">Шаровые краны, фитинги и коллекторы</p>
          <div className="category-split__links">
            <Link href="/catalog" className="category-split__link">
              Подробнее
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
