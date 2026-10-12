import styles from "./Catalog.module.css";

export default function CatalogSkeleton({ count = 3 }: { count?: number }) {
  return <div role="status" aria-label="Загрузка разделов каталога">
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <div className={styles.card} key={index}>
        <span className="block-skeleton__line" /><span className="block-skeleton__line block-skeleton__line--short" />
        <div className={styles.art}><span className={styles.skeleton} /></div>
      </div>)}
    </div>
  </div>;
}
