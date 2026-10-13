import CatalogSkeleton from "@/sections/catalog/CatalogSkeleton";
import styles from "@/sections/catalog/Catalog.module.css";

export default function CatalogLoading() {
  return <main className={styles.landing} aria-label="Каталог продукции Heisskraft" data-header-theme="light">
    <div className={styles.landingContent}><CatalogSkeleton cover /></div>
  </main>;
}
