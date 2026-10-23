import { firePageProducts } from "@/content/solution-pages";
import { fireStations } from "@/content/solutions";
import Link from "next/link";
import FireOffBanner, { HKBoostBanner } from "./FireOffBanner";
import FireStations from "./FireStations";
import shared from "../data-centers/DataCenters.module.css";
import styles from "./FireSuppression.module.css";

export default function FireProducts() {
  return <section className={shared.products} aria-label="Решения HEISSKRAFT для пожаротушения">
    <FireOffBanner />
    <div className={styles.pipeSummary}>
      <div><h3>{firePageProducts.pipeHeading}<br />{firePageProducts.pipeHeadingSecondLine}</h3><p>{firePageProducts.pipeDescription}</p></div>
      <div className={shared.productActions}>
        <Link href="/catalog" className="home-hero__link">FireOff в каталоге</Link>
        <Link href="/selection/pipelines" className="home-hero__link home-hero__link--secondary">Подбор трубопровода</Link>
      </div>
    </div>
    <HKBoostBanner />
    <FireStations stations={fireStations} />
    <p className={shared.productNote}>{firePageProducts.projectNote}</p>
    <div className={shared.catalogCta}>
      <h2>{firePageProducts.ctaTitle}<br />{firePageProducts.ctaTitleSecondLine}</h2>
      <Link href="/catalog" className="home-hero__link">Перейти в каталог</Link>
    </div>
  </section>;
}
