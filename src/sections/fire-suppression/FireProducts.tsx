import Link from "next/link";
import FireOffBanner from "./FireOffBanner";
import FireStations from "./FireStations";
import shared from "../data-centers/DataCenters.module.css";
import styles from "./FireSuppression.module.css";

export default function FireProducts() {
  return <section className={shared.products} aria-label="Решения HEISSKRAFT для пожаротушения">
    <FireOffBanner />
    <div className={styles.pipeSummary}>
      <div><h3>Трубы и фитинги.<br />Одна система FireOff.</h3><p>Полипропиленовый компаунд Compylen с антипиренами, армирование стекловолокном и сварные соединения — для водозаполненных систем пожаротушения и внутреннего противопожарного водопровода.</p></div>
      <div className={shared.productActions}>
        <Link href="/catalog" className="home-hero__link">FireOff в каталоге</Link>
        <Link href="/selection/pipelines" className="home-hero__link home-hero__link--secondary">Подбор трубопровода</Link>
      </div>
    </div>
    <FireStations />
    <p className={shared.productNote}>Диаметры трубопроводов, характеристики и комплектация насосных станций определяются проектом.</p>
    <div className={shared.catalogCta}>
      <h2>Соберите решение<br />для вашего проекта.</h2>
      <Link href="/catalog" className="home-hero__link">Перейти в каталог</Link>
    </div>
  </section>;
}
