import shared from "../data-centers/DataCenters.module.css";
import styles from "./FireSuppression.module.css";

export default function FireIntro() {
  return <section className={shared.intro} aria-labelledby="fire-intro-title">
    <div className={shared.introHeading}>
      <h2 id="fire-intro-title">Готовность, которая<br /><span>складывается из деталей.</span></h2>
      <p className={shared.introCaption}>Система пожаротушения подаёт воду к очагу возгорания через сеть трубопроводов, арматуру и оросители.</p>
    </div>
    <div className={styles.introColumns}>
      <div><h3>Надёжность — на всём пути воды</h3><p>В обычный день система остаётся незаметной. В момент срабатывания важна согласованная работа всех её элементов: от насосной станции до последнего соединения.</p><p>Поэтому трубопроводы, узлы подключения и насосное оборудование рассматривают вместе — с учётом проекта, условий эксплуатации и последующего обслуживания.</p></div>
      <div><h3>Единая система. Общая задача.</h3><p>Магистраль распределяет воду. Фитинги соединяют участки и формируют ответвления. Насосная станция обеспечивает подачу с параметрами, предусмотренными проектом.</p><p>Решения HEISSKRAFT помогают выстроить эту цепочку из совместно подобранных компонентов.</p></div>
    </div>
  </section>;
}
