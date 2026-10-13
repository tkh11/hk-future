import styles from "./Catalog.module.css";

export default function CatalogSkeleton({ count = 3, cover = false }: { count?: number; cover?: boolean }) {
  return <div role="status" aria-label="Загрузка разделов каталога">
    {cover && <div className={styles.coverSearchPlaceholder} aria-hidden="true" />}
    <div className={`${styles.grid}${cover ? ` ${styles.coverGrid}` : ""}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => <div className={`${styles.card}${cover ? ` ${styles.coverCard} ${styles.coverLoading}` : ""}`} key={index}>
        {cover ? <><span className={styles.coverPlaceholder} /><span className={styles.coverTitlePlaceholder} /></> : <>
        <span className="block-skeleton__line" /><span className="block-skeleton__line block-skeleton__line--short" />
        <div className={styles.art}><span className={styles.skeleton} /></div>
        </>}
      </div>)}
    </div>
  </div>;
}
