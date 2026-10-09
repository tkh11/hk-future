"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { publicPath } from "@/lib/public-path";
import { useModelDescription } from "@/lib/use-model-description";
import CoolingHelp from "../data-centers/CoolingHelp";
import styles from "../data-centers/CoolingExplorer.module.css";
import type { FireSelection } from "./fireoff-model";

const FireOffViewer = dynamic(() => import("./FireOffViewer"), { ssr: false, loading: () => <div className={styles.viewer}><div className={styles.loading} role="status"><span />Загрузка системы FireOff</div></div> });
const items = [
  { id: "main", label: "Труба FireOff 125", title: "Основная магистраль FireOff", text: "Труба диаметром 125 мм — основа распределительной сети. Многослойная конструкция из полипропиленового компаунда Compylen со стекловолокном предназначена для водозаполненных систем пожаротушения.", image: "pipe.png", alt: "Многослойная труба HEISSKRAFT FireOff" },
  { id: "saddle", label: "Вварное седло 125×40", title: "Ответвление от магистрали", text: "Вварное седло соединяет магистраль диаметром 125 мм с ответвлением 40 мм. На модели выделен компактный узел перехода от основной трубы к распределительному участку.", image: "saddle.jpg", alt: "Вварное седло HEISSKRAFT FireOff" },
  { id: "tee", label: "Тройник 40×40×40", title: "Распределение по ветвям", text: "Равнопроходной тройник объединяет три участка трубопровода диаметром 40 мм. Он формирует ответвления распределительной сети и соединяет её элементы в общий контур.", image: "tee.png", alt: "Тройник из предоставленной модели системы FireOff" },
] as const;

export default function FireExplorer() {
  const { selection, menu, selectFromModel, clear, toggle } = useModelDescription<NonNullable<FireSelection>>();
  return <section id="fireoff-system" className={styles.section} aria-labelledby="fireoff-system-title" data-header-theme="light">
    <div className={styles.heading}><h2 id="fireoff-system-title">FireOff. Система в деталях.</h2><p>Выберите магистраль, седло или тройник на модели — и познакомьтесь с каждым соединением.</p></div>
    <div className={styles.layout}>
      <div className={styles.visual}>
        <FireOffViewer selection={selection} onSelect={selectFromModel} />
        <div className={styles.modelFooter}>
          <div className={styles.legend} aria-live="polite"><span>{selection && <i className={styles.red} />}{items.find(item => item.id === selection)?.label ?? "Узел подключения FireOff"}</span></div>
          <CoolingHelp />
        </div>
      </div>
      <div ref={menu} className={styles.menu} role="group" aria-label="Элементы системы FireOff" onKeyDown={event => { if (event.key === "Escape") clear(); }}>
        {items.map((item, index) => {
          const expanded = selection === item.id;
          return <article key={item.id} className={styles.card} data-expanded={expanded}>
            <button id={`fireoff-toggle-${item.id}`} type="button" aria-expanded={expanded} aria-controls={`fireoff-detail-${item.id}`} className={styles.option} onClick={() => toggle(item.id)}>
              <span className={styles.number}>0{index + 1}</span><strong>{item.label}</strong>
            </button>
            <div id={`fireoff-detail-${item.id}`} className={styles.disclosure} role="region" aria-labelledby={`fireoff-toggle-${item.id}`} aria-hidden={!expanded} inert={!expanded}>
              <div className={styles.disclosureClip}><div className={styles.productContent}>
                <div className={styles.productImage}><Image src={publicPath(`/images/fire-suppression/${item.image}`)} width={1024} height={1024} sizes="(max-width: 767px) 80vw, 240px" alt={item.alt} /></div>
                <div className={styles.productCopy}><h3>{item.title}</h3><p>{item.text}</p></div>
              </div></div>
            </div>
          </article>;
        })}
      </div>
    </div>
  </section>;
}
