"use client";
import type { ProductDescription } from "@/content/types";
import Image from "next/image";
import { publicPath } from "@/lib/public-path";
import { useModelDescription } from "@/lib/use-model-description";
import { createRetryableModel } from "@/components/models/createRetryableModel";
import ModelFailure from "@/components/ui/ModelFailure";
import ViewportMount from "@/components/ui/ViewportMount";
import type { Selection } from "./chilling-model";
import ModelHelp from "@/components/models/ModelHelp";
import styles from "./CoolingExplorer.module.css";

const ChillingViewer = createRetryableModel(() => import("./ChillingViewer"), {
  loading: () => <div className={styles.viewer}><div className={styles.loading} role="status"><span />Загрузка системы охлаждения</div></div>,
  fallback: retry => <div className={styles.viewer}><ModelFailure onRetry={retry} /></div>,
});


export default function CoolingExplorer({ items }: { items: ProductDescription<NonNullable<Selection>>[] }) {
  const { selection, menu, selectFromModel, clear, toggle } = useModelDescription<NonNullable<Selection>>();

  return <section id="cooling-system" className={styles.section} aria-labelledby="cooling-system-title" data-header-theme="light">
    <div className={styles.heading}><h2 id="cooling-system-title">Системы охлаждения ЦОД</h2><p>Наведите на элемент системы или выберите его, чтобы узнать больше.</p></div>
    <div className={styles.layout}>
      <div className={styles.visual}>
        <ViewportMount fallback={<div className={styles.viewer}><div className={styles.loading} role="status"><span />Загрузка системы охлаждения</div></div>}><ChillingViewer selection={selection} onSelect={selectFromModel} /></ViewportMount>
        <div className={styles.modelFooter}>
          <div className={styles.legend} aria-live="polite">
          {selection === "pipes" ? <><span><i className={styles.blue} />Подача хладоносителя</span><span><i className={styles.red} />Отвод тепла</span></> : selection === "pumps" ? <span><i className={styles.red} />Циркуляционные насосы</span> : selection === "valves" ? <span><i className={styles.yellow} />Шаровые краны</span> : <span>Общий вид системы</span>}
          </div>
          <ModelHelp />
        </div>
      </div>
      <div ref={menu} className={styles.menu} role="group" aria-label="Элементы системы охлаждения" onKeyDown={event => { if (event.key === "Escape") { clear(); } }}>
        {items.map((item, index) => {
          const expanded = selection === item.id;
          return <article key={item.id} className={styles.card} data-expanded={expanded}>
            <button id={`cooling-toggle-${item.id}`} type="button" aria-expanded={expanded} aria-controls={`cooling-detail-${item.id}`} className={styles.option} onClick={() => { toggle(item.id); }}>
              <span className={styles.number}>0{index + 1}</span>
              <strong>{item.label}</strong>
            </button>
            <div id={`cooling-detail-${item.id}`} className={styles.disclosure} role="region" aria-labelledby={`cooling-toggle-${item.id}`} aria-hidden={!expanded} inert={!expanded}>
              <div className={styles.disclosureClip}>
                <div className={styles.productContent}>
                  <div className={styles.productImage}>
                    <Image src={publicPath(item.image)} width={1024} height={1024} sizes="(max-width: 767px) 80vw, 240px" alt={item.alt} />
                  </div>
                  <div className={styles.productCopy}>
                    <h3>{item.title}</h3>
                    {item.badge && <Image className={styles.temperatureBadge} src={publicPath(item.badge)} width={300} height={98} alt="Диапазон рабочих температур: от −40 до +95 градусов Цельсия" />}
                    {item.detail && <p className={styles.detail}>{item.detail}</p>}
                    <p>{item.text}</p>
                  </div>
                </div>
              </div>
            </div>
          </article>;
        })}
      </div>
    </div>
  </section>;
}
