import Image from "next/image";
import Link from "next/link";
import { publicPath } from "@/lib/public-path";
import SolutionsArchitecture from "./SolutionsArchitecture";
import SolutionCard from "./SolutionCard";
import styles from "./Solutions.module.css";

const solutions: { title: string; icon: string; href?: string; ext?: string }[] = [
  { title: "Системы охлаждения ЦОД", icon: "data-center", href: "/solutions/data-centers" },
  { title: "Системы пожаротушения", icon: "fire-sprinkler-3", href: "/solutions/fire-suppression" },
  { title: "Новое строительство и капитальный ремонт", icon: "buildings-4" },
  { title: "Судостроение", icon: "marine" },
  { title: "Пневматические системы", icon: "pneumatics-3" },
  { title: "Системы отопления и кондиционирования", icon: "heating-3" },
];

export default function Solutions() {
  return (
    <section id="engineering-solutions" data-header-theme="light" className={styles.section} aria-labelledby="solutions-heading">
      <div className={styles.banner}>
        <SolutionsArchitecture className={styles.architecture} />
        <div className={styles.copy}>
          <h2 id="solutions-heading" className={styles.heading}>Инженерные<br />решения</h2>
          <p className={styles.description}>Комплексные системы для надёжной работы объектов любого масштаба.</p>
          <div className={styles.actions}>
            <Link href="/catalog" className="home-hero__link home-hero__link--secondary">Подбор оборудования</Link>
          </div>
        </div>
      </div>
      <ul className={styles.grid}>
        {solutions.map((item) => (
          <li key={item.title}>
            <SolutionCard href={item.href ?? "/catalog"}>
              <h3 className={styles.title}>{item.title}</h3>
              <div className={styles.media}>
                <Image
                  className={styles.image}
                  src={publicPath(`/images/solutions/${item.icon}.${item.ext ?? "png"}`)}
                  width={1024}
                  height={1024}
                  sizes="(max-width: 599px) calc(100vw - 40px), (max-width: 899px) calc((100vw - 64px) / 2), (max-width: 1328px) calc((100vw - 96px) / 3), 411px"
                  alt=""
                  aria-hidden="true"
                />
              </div>
            </SolutionCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
