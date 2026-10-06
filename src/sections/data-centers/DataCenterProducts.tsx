import Image from "next/image";
import Link from "next/link";
import { publicPath } from "@/lib/public-path";
import styles from "./DataCenters.module.css";

function ProductDetails({ label, rows }: { label: string; rows: [string, string][] }) {
  return (
    <div className={styles.details}>
      <table aria-label={label}>
        <tbody>{rows.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function DataCenterProducts() {
  return (
    <section className={styles.products} aria-labelledby="dc-products-title">
      <div className={styles.sectionHeading}>
        <h2 id="dc-products-title">Движение теплоносителя.<br /><span>В деталях системы.</span></h2>
        <p>Насосное оборудование и трубопроводы для контуров холодоснабжения.</p>
      </div>
      <article className={styles.product}>
        <div className={styles.productImage}>
          <Image src={publicPath("/images/data-centers/pump-hbp.png")} width={872} height={568} alt="Консольно-моноблочный насос HEISSKRAFT HBP" sizes="(max-width: 767px) 100vw, 550px" />
        </div>
        <div className={styles.productCopy}>
          <h3>Насосное<br />оборудование</h3>
          <p>Обеспечивает движение теплоносителя между источником холода и потребителями. Насосы HEISSKRAFT подбираются под расчётные параметры контура.</p>
          <ProductDetails label="Параметры подбора насосов" rows={[
            ["Расход и напор", "По гидравлическому расчёту"],
            ["Исполнение", "С учётом рабочей среды"],
            ["Режим работы", "Под задачи объекта"],
          ]} />
          <div className={styles.productActions}>
            <Link href="/catalog" className="home-hero__link">Насосы в каталоге</Link>
            <Link href="/selection/pumps" className="home-hero__link home-hero__link--secondary">Подбор насосов</Link>
          </div>
        </div>
      </article>
      <article className={`${styles.product} ${styles.productReverse}`}>
        <div className={styles.productImage}>
          <Image src={publicPath("/images/data-centers/climatfaser.jpg")} width={3963} height={2642} alt="Полипропиленовая труба HEISSKRAFT ClimatFaser со стекловолокном" sizes="(max-width: 767px) 100vw, 550px" />
        </div>
        <div className={styles.productCopy}>
          <h3>ClimatFaser</h3>
          <p>Многослойные трубы из термостабилизированного полипропилена PP-RCT со стекловолокном. Для обвязки чиллеров и фанкойлов, магистралей холодоснабжения и кондиционирования.</p>
          <ProductDetails label="Свойства труб ClimatFaser" rows={[
            ["Армирование", "Стекловолокно"],
            ["Коррозия", "Не подвержены"],
            ["Монтаж", "Без зачистки перед сваркой"],
          ]} />
          <div className={styles.productActions}>
            <Link href="/catalog" className="home-hero__link">Трубы в каталоге</Link>
            <Link href="/selection/pipelines" className="home-hero__link home-hero__link--secondary">Подбор трубопровода</Link>
          </div>
        </div>
      </article>
      <p className={styles.productNote}>Диаметры, исполнение и режимы работы подбираются по проекту с учётом температуры, давления и состава теплоносителя.</p>
      <div className={styles.catalogCta}>
        <h2>Соберите решение<br />для вашего проекта.</h2>
        <Link href="/catalog" className="home-hero__link">Перейти в каталог</Link>
      </div>
    </section>
  );
}
