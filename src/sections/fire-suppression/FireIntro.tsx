import { fireIntro } from "@/content/solution-pages";
import shared from "../data-centers/DataCenters.module.css";
import styles from "./FireSuppression.module.css";

export default function FireIntro() {
  return <section className={shared.intro} aria-labelledby="fire-intro-title">
    <div className={shared.introHeading}>
      <h2 id="fire-intro-title">{fireIntro.heading}<br /><span>{fireIntro.headingAccent}</span></h2>
      <p className={shared.introCaption}>{fireIntro.definition}</p>
    </div>
    <div className={styles.introColumns}>
      <div><h3>{fireIntro.reliabilityHeading}</h3><p>{fireIntro.reliabilityDescription}</p><p>{fireIntro.planningDescription}</p></div>
      <div><h3>{fireIntro.systemHeading}</h3><p>{fireIntro.systemDescription}</p><p>{fireIntro.solutionsDescription}</p></div>
    </div>
  </section>;
}
