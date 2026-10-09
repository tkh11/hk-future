"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { publicPath } from "@/lib/public-path";
import shared from "../data-centers/DataCenters.module.css";
import styles from "./FireSuppression.module.css";

const stations = [
  { id: "fpa", name: "HK-Boost FPA", application: "Автоматические установки пожаротушения", description: "Насосные установки для автоматических систем водяного и пенного пожаротушения. Объединяют насосы HMV, коллекторы, арматуру и систему управления на общей раме." },
  { id: "fpv", name: "HK-Boost FPV", application: "Внутренний противопожарный водопровод", description: "Насосные установки для внутреннего противопожарного водопровода. Насосы HMV, трубопроводная обвязка и система управления собраны в единый комплект." },
] as const;

export default function FireStations() {
  const [selected, setSelected] = useState(0);
  const station = stations[selected];
  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - selected;
    setSelected(next);
    document.getElementById(`station-tab-${stations[next].id}`)?.focus({ preventScroll: true });
  }
  return <article className={`${shared.product} ${shared.productReverse}`}>
    <div className={shared.productImage}>
      <Image key={station.id} className={styles.stationPicture} src={publicPath(`/images/fire-suppression/station-${station.id}.png`)} width={1400} height={1312} sizes="(max-width: 767px) 90vw, 620px" alt={`Станция пожаротушения HEISSKRAFT ${station.name}`} />
    </div>
    <div className={shared.productCopy}>
      <h3>Станции<br />пожаротушения</h3>
      <p>Подача воды начинается здесь. Подберите исполнение под задачу вашей системы.</p>
      <div className={styles.stationTabs} role="tablist" aria-label="Серии насосных станций">
        {stations.map((item, index) => <button key={item.id} id={`station-tab-${item.id}`} role="tab" type="button" aria-selected={selected === index} aria-controls="station-description" tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={handleKey}>{item.name}</button>)}
      </div>
      <div id="station-description" role="tabpanel" aria-labelledby={`station-tab-${station.id}`} tabIndex={0}>
        <div className={shared.details}><table aria-label={`Назначение ${station.name}`}><tbody>
          <tr><th scope="row">Применение</th><td>{station.application}</td></tr>
          <tr><th scope="row">Насосы</th><td>Серия HMV</td></tr>
          <tr><th scope="row">Подбор</th><td>По расходу и напору системы</td></tr>
        </tbody></table></div>
        <p className={styles.stationDescription}>{station.description}</p>
      </div>
      <div className={shared.productActions}>
        <Link href="/catalog" className="home-hero__link">Станции в каталоге</Link>
        <Link href="/selection/pumps" className="home-hero__link home-hero__link--secondary">Подбор насосов</Link>
      </div>
    </div>
  </article>;
}
