import { dcProducts } from "@/content/solution-pages";
import Image from "next/image";
import Link from "next/link";
import { publicPath } from "@/lib/public-path";
import ClimatBanner from "./ClimatBanner";
import styles from "./DataCenters.module.css";

function ProductDetails({ label, rows }: { label: string; rows: [string, string][] }) {
  return (
    <div className={styles.details}>
      <table aria-label={label}>
        <tbody>{rows.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function DataCenterProducts() {
  return (
    <section className={styles.products} aria-labelledby="dc-products-title">
      <div className={styles.sectionHeading}>
        <h2 id="dc-products-title">{dcProducts.heading}<br /><span>{dcProducts.headingAccent}</span></h2>
        <p>{dcProducts.description}</p>
      </div>
      <ClimatBanner />
      <article className={styles.product}>
        <div className={styles.productImage}>
          <Image src={publicPath("/images/data-centers/pipes.jpg")} width={1024} height={1024} alt="Полипропиленовые трубы HEISSKRAFT PP-RCT со стекловолокном" sizes="(max-width: 767px) 100vw, 550px" />
        </div>
        <div className={styles.productCopy}>
          <h3>{dcProducts.pipeTitle}</h3>
          <p>{dcProducts.pipeDescription}</p>
          <ProductDetails label="Свойства труб ClimatFaser" rows={dcProducts.pipeProperties} />
          <div className={styles.productActions}>
            <Link href="/catalog" className="home-hero__link">Трубы в каталоге</Link>
            <Link href="/selection/pipelines" className="home-hero__link home-hero__link--secondary">Подбор трубопровода</Link>
          </div>
        </div>
      </article>
      <article className={`${styles.product} ${styles.productReverse}`}>
        <div className={styles.productImage}>
          <Image src={publicPath("/images/data-centers/pump.jpg")} width={1024} height={1024} alt="Циркуляционный насос HEISSKRAFT" sizes="(max-width: 767px) 100vw, 550px" />
        </div>
        <div className={styles.productCopy}>
          <h3>{dcProducts.pumpTitle}<br />{dcProducts.pumpTitleSecondLine}</h3>
          <p>{dcProducts.pumpDescription}</p>
          <ProductDetails label="Параметры подбора насосов" rows={dcProducts.pumpProperties} />
          <div className={styles.productActions}>
            <Link href="/catalog" className="home-hero__link">Насосы в каталоге</Link>
            <Link href="/selection/pumps" className="home-hero__link home-hero__link--secondary">Подбор насосов</Link>
          </div>
        </div>
      </article>
      <p className={styles.productNote}>{dcProducts.projectNote}</p>
      <div className={styles.catalogCta}>
        <h2>{dcProducts.ctaTitle}<br />{dcProducts.ctaTitleSecondLine}</h2>
        <Link href="/catalog" className="home-hero__link">Перейти в каталог</Link>
      </div>
    </section>
  );
}
