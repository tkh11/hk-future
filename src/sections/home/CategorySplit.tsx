import Link from "next/link";
import HoldFrameVideo from "@/components/ui/HoldFrameVideo";
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
              Подробнее ›
            </Link>
            <Link href="/catalog" className="category-split__link">
              Подобрать насос ›
            </Link>
          </div>
        </div>
      </article>

      <article className="category-split__tile">
        <div className="category-split__copy">
          <h2 className="category-split__title">Арматура</h2>
          <p className="category-split__subtitle">Шаровые краны, фитинги и коллекторы</p>
          <div className="category-split__links">
            <Link href="/catalog" className="category-split__link">
              Подробнее ›
            </Link>
          </div>
        </div>
        <div className="category-split__media">
          <HoldFrameVideo
            mp4="/videos/home/armature-valves.mp4"
            webm="/videos/home/armature-valves.webm"
            poster="/images/home/armature-valves-first.jpg"
            still="/images/home/armature-valves-last.jpg"
            width={720}
            height={1264}
            alt="Шаровые краны, фитинги и коллектор HEISSKRAFT"
            sizes="(min-width: 768px) 50vw, 100vw"
            play="inview"
            videoClassName="category-split__video"
            stillClassName="category-split__still"
          />
        </div>
      </article>
    </section>
  );
}
