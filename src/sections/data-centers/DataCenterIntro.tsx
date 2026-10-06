import styles from "./DataCenters.module.css";

export default function DataCenterIntro() {
  return <section className={styles.intro} aria-labelledby="dc-intro-title">
    <div className={styles.introHeading}>
      <h2 id="dc-intro-title">Данные работают.<br /><span>Тепло не останавливается.</span></h2>
    </div>
    <div className={styles.introColumns}>
      <div><h3>Что такое ЦОД</h3><p>Центр обработки данных — это место, где работают серверы, системы хранения и сетевое оборудование. Они обеспечивают работу облачных сервисов, приложений и искусственного интеллекта.</p><p>При вычислениях оборудование выделяет тепло. Система охлаждения отводит его и помогает поддерживать рабочие условия для серверов.</p></div>
      <div><h3>Больше вычислений — выше требования</h3><p>Облачные сервисы и ИИ увеличивают нагрузку на ЦОД. Растёт мощность серверных стоек, а вместе с ней — значение охлаждения и инженерной инфраструктуры.</p><p>Циркуляцию теплоносителя, отвод тепла и возможность расширения важно продумывать как единую систему.</p></div>
      <aside className={styles.stat}><strong>≈ ×2</strong><p>прогноз роста мирового электропотребления ЦОД к 2030 году относительно 2025 года</p><a href="https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary" target="_blank" rel="noreferrer">IEA, 2026</a></aside>
    </div>
  </section>;
}
