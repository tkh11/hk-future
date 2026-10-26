import Link from "next/link";
import Image from "next/image";
import type { PublicProductSummary } from "@/content/cms-adapter";
import { publicPath } from "@/lib/public-path";
import styles from "./Products.module.css";

export default function ProductGrid({ products }: { products: PublicProductSummary[] }) {
  if (!products.length) return null;
  return <section className={styles.list} aria-label="Продукция">
    <ul className={styles.grid}>{products.map((product) => <li key={product.slug}>
      <Link className={styles.card} href={`/products/${product.slug}`}>
        <div className={styles.image}><Image unoptimized src={publicPath(product.image?.url ?? "/brand/small-black-logo.svg")} alt={product.image?.alt ?? ""} loading="lazy" width={480} height={360} /></div>
        <h2>{product.title}</h2><p>Артикул: {product.sku}</p>
      </Link>
    </li>)}</ul>
  </section>;
}
