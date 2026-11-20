import Image from 'next/image';
import type { PublicProduct } from '@/content/cms-adapter';
import type { CatalogNode } from '@/lib/catalog';
import { publicPath } from '@/lib/public-path';
import { productInquiry } from '@/lib/lead-request';
import Link from 'next/link';
import ProductText from './ProductText';
import LeadButton from '@/components/ui/LeadButton';
import ProductBreadcrumbs from './ProductBreadcrumbs';
import ProductDocuments from './ProductDocuments';
import ProductTabs, { type ProductTab } from './ProductTabs';
import VariantTable from './VariantTable';
import styles from './Products.module.css';

export default function ProductScreen({ product, path, trail }: { product: PublicProduct; path: string[]; trail: CatalogNode[] }) {
  const specifications = product.specifications;
  const primaryMedia = product.image;
  const source = publicPath(primaryMedia?.url ?? '/brand/small-black-logo.svg');
  const tabs: ProductTab[] = [
    { id: 'description', label: 'Описание', content: product.description
      ? <ProductText text={product.description} />
      : <p className={styles.emptyPanel}>Описание пока не добавлено.</p> },
    { id: 'specifications', label: 'Характеристики', content: <>
      {product.characteristics && <ProductText text={product.characteristics} specifications />}
      {!!specifications.length && <>
        <p className={styles.rangeNote}>Диапазоны по опубликованным позициям. Точные параметры каждого исполнения — во вкладке «Номенклатура».</p>
        <div className={styles.tableFrame}><table><tbody>{specifications.map(attribute => <tr key={attribute.key}>
          <th scope="row">{attribute.label}</th><td>{attribute.value}{attribute.unit ? ` ${attribute.unit}` : ''}</td>
        </tr>)}</tbody></table></div>
      </>}
      {!product.characteristics && !specifications.length && <p className={styles.emptyPanel}>Характеристики пока не добавлены.</p>}
    </> },
    { id: 'variants', label: 'Номенклатура', content: product.variantCount
      ? <VariantTable slug={product.slug} sizes={product.sizes} columns={specifications} />
      : <p className={styles.emptyPanel}>{product.sku ? `Артикул товара: ${product.sku}.` : 'Для этого товара номенклатура пока не указана.'}</p> },
    { id: 'gallery', label: 'Фотографии и чертежи', content: product.gallery.length
      ? <div className={styles.gallery}>{product.gallery.map((item, index) => <figure key={`${item.url}-${index}`}>
        {/\.mp4(?:[?#]|$)/i.test(item.url)
          ? <video controls playsInline preload="none" src={publicPath(item.url)} aria-label={item.alt} />
          : <a href={publicPath(item.url)} target="_blank" rel="noopener noreferrer"><Image unoptimized loading={item.url === primaryMedia?.url ? 'eager' : 'lazy'} src={publicPath(item.url)} alt={item.alt} width={600} height={600} /></a>}
        <figcaption>{item.alt}</figcaption>
      </figure>)}</div>
      : <p className={styles.emptyPanel}>Дополнительные фотографии и чертежи пока не добавлены.</p> },
    { id: 'documents', label: 'Документы', content: <ProductDocuments documents={product.previewDocuments} /> },
  ];

  return <main className={styles.page} data-header-theme="light">
    <ProductBreadcrumbs path={path} trail={trail} title={product.title} slug={product.slug} />
    <article>
      <div className={styles.summary}>
        <div className={styles.productImage}>
          {/\.mp4(?:[?#]|$)/i.test(source)
            ? <video src={source} controls playsInline preload="metadata" aria-label={product.title} />
            : <Image unoptimized loading="eager" src={source} alt={primaryMedia?.alt ?? product.title} width={800} height={800} />}
        </div>
        <h1>{product.title}</h1>
      </div>
      <ProductTabs tabs={tabs} />
      <div className={styles.actions}>
        <LeadButton className="home-hero__link" label="Запросить предложение" details={productInquiry(product)} />
        {product.profile === 'pump' && <Link className={`home-hero__link home-hero__link--secondary ${styles.selectionLink}`} href="/selection/pumps">Подбор оборудования</Link>}
      </div>
    </article>
  </main>;
}
