import Link from "next/link";
import Image from "next/image";
import type { PublicProduct } from "@/content/cms-adapter";
import { publicPath } from "@/lib/public-path";
import styles from "./Products.module.css";

export default function ProductScreen({ product }: { product: PublicProduct }) {
  return <main className={styles.page} data-header-theme="light">
    <nav className={styles.breadcrumbs} aria-label="Путь по каталогу"><Link href="/catalog">Каталог</Link>
      {product.category && <><span aria-hidden="true">/</span><Link href={`/catalog/${product.category.path}`}>{product.category.title}</Link></>}
    </nav>
    <article>
      <div className={styles.summary}>
        <div className={styles.productImage}><Image unoptimized src={publicPath(product.image?.url ?? "/brand/small-black-logo.svg")} alt={product.image?.alt ?? "HEISSKRAFT"} width={800} height={800} /></div>
        <div className={styles.copy}><h1>{product.title}</h1><p className={styles.sku}>Артикул: {product.sku}</p>
          {product.series && <p>{product.series.title}</p>}
          {product.description && <p className={styles.description}>{product.description}</p>}
          <Link href="/contacts" className="home-hero__link">Связаться с нами</Link>
        </div>
      </div>
      {!!product.attributes.length && <section className={styles.specifications} aria-labelledby="product-specifications"><h2 id="product-specifications">Характеристики</h2>
        <div className={styles.tableFrame}><table><tbody>{product.attributes.map((attribute) => <tr key={attribute.key}><th scope="row">{attribute.label}</th><td>{attribute.value}{attribute.unit ? ` ${attribute.unit}` : ""}</td></tr>)}</tbody></table></div>
      </section>}
      {!!product.documents.length && <section className={styles.documents} aria-labelledby="product-documents"><h2 id="product-documents">Документы</h2><ul>{product.documents.map((document) => <li key={document.url}><a href={publicPath(document.url)} target="_blank" rel="noopener noreferrer">{document.title}</a></li>)}</ul></section>}
    </article>
  </main>;
}
