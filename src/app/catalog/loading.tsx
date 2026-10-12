import CatalogSkeleton from "@/sections/catalog/CatalogSkeleton";
import styles from "@/sections/catalog/Catalog.module.css";

export default function CatalogLoading() {
  return <main className={styles.page} data-header-theme="light"><div className={styles.heading}><h1>Каталог</h1></div><CatalogSkeleton /></main>;
}
