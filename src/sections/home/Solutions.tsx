import Image from "next/image";
import { publicPath } from "@/lib/public-path";
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
    <section id="engineering-solutions" data-header-theme="light" className={styles.section} aria-label="Инженерные решения">
      <ul className={styles.grid}>
        {solutions.map((item) => (
          <li key={item.title}>
            <SolutionCard href={item.href ?? "/catalog"}>
              <div className={styles.media}>
                <Image
                  className={styles.image}
                  src={publicPath(`/images/solutions/${item.icon}.${item.ext ?? "png"}`)}
                  width={1024}
                  height={1024}
                  sizes="(max-width: 599px) 260px, 280px"
                  alt=""
                  aria-hidden="true"
                />
              </div>
              <h3 className={styles.title}>{item.title}</h3>
            </SolutionCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
