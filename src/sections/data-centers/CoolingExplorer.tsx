"use client";
import Image from "next/image";
import { publicPath } from "@/lib/public-path";
import { useModelDescription } from "@/lib/use-model-description";
import dynamic from "next/dynamic";
import type { Selection } from "./chilling-model";
import CoolingHelp from "./CoolingHelp";
import styles from "./CoolingExplorer.module.css";

const ChillingViewer = dynamic(() => import("./ChillingViewer"), { ssr: false, loading: () => <div className={styles.viewer}><div className={styles.loading} role="status"><span />Загрузка системы охлаждения</div></div> });
const items = [
  { id: "pipes", label: "Труба ClimatFaser", title: "Трубопроводные системы ClimatFaser", text: "Трубы из термостабилизированного полипропилена PP-RCT со стекловолокном соединяют узлы системы охлаждения. Синим показана подача хладоносителя, красным — контур отвода тепла.", image: "/images/data-centers/pipes.jpg", alt: "Полипропиленовые трубы HEISSKRAFT PP-RCT со стекловолокном", badge: "/images/data-centers/climatfaser-temperature-range.png" },
  { id: "pumps", label: "Насосы HIP", title: "Серия циркуляционных насосов HIP", detail: "Конструкция «ин-лайн»", text: "Насосы поддерживают циркуляцию теплоносителя между источником холода и потребителями. Мягкая пульсация показывает сердце инженерной системы.", image: "/images/data-centers/pump.jpg", alt: "Циркуляционный насос HEISSKRAFT" },
  { id: "valves", label: "Арматура HEISSKRAFT", title: "Запорно-регулирующая арматура HEISSKRAFT", text: "Шаровые краны позволяют отключать отдельные участки контура для обслуживания оборудования. На модели они выделены жёлтым цветом.", image: "/images/data-centers/valve.jpg", alt: "Дисковый затвор HEISSKRAFT DN100 PN16" },
] as const;

export default function CoolingExplorer() {
  const { selection, menu, selectFromModel, clear, toggle } = useModelDescription<NonNullable<Selection>>();

  return <section id="cooling-system" className={styles.section} aria-labelledby="cooling-system-title" data-header-theme="light">
    <div className={styles.heading}><h2 id="cooling-system-title">Системы охлаждения ЦОД</h2><p>Наведите на элемент системы или выберите его, чтобы узнать больше.</p></div>
    <div className={styles.layout}>
      <div className={styles.visual}>
        <ChillingViewer selection={selection} onSelect={selectFromModel} />
        <div className={styles.modelFooter}>
          <div className={styles.legend} aria-live="polite">
          {selection === "pipes" ? <><span><i className={styles.blue} />Подача хладоносителя</span><span><i className={styles.red} />Отвод тепла</span></> : selection === "pumps" ? <span><i className={styles.red} />Циркуляционные насосы</span> : selection === "valves" ? <span><i className={styles.yellow} />Шаровые краны</span> : <span>Общий вид системы</span>}
          </div>
          <CoolingHelp />
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
                    {"badge" in item && <Image className={styles.temperatureBadge} src={publicPath(item.badge)} width={300} height={98} alt="Диапазон рабочих температур: от −40 до +95 градусов Цельсия" />}
                    {"detail" in item && <p className={styles.detail}>{item.detail}</p>}
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
