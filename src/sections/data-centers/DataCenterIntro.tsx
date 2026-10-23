import { dcIntro } from "@/content/solution-pages";
import styles from "./DataCenters.module.css";

export default function DataCenterIntro() {
  return <section className={styles.intro} aria-labelledby="dc-intro-title">
    <div className={styles.introHeading}>
      <h2 id="dc-intro-title">{dcIntro.heading}<br /><span>{dcIntro.headingAccent}</span></h2>
      <p className={styles.introCaption}>{dcIntro.definition}</p>
    </div>
    <div className={styles.introColumns}>
      <div><h3>{dcIntro.growthHeading}</h3><p>{dcIntro.growthDescription}</p><p>{dcIntro.systemDescription}</p></div>
      <aside className={styles.stat}><strong>≈ ×2</strong><p>{dcIntro.statDescription}</p><a href="https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary" target="_blank" rel="noreferrer">IEA, 2026</a></aside>
    </div>
  </section>;
}
