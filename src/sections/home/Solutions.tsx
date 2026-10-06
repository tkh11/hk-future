import Image from "next/image";
import Link from "next/link";

const solutions = [
  { title: "Системы охлаждения ЦОД", icon: "data-center", href: "/solutions/data-centers" },
  { title: "Системы пожаротушения", icon: "fire-sprinkler" },
  { title: "Новое строительство и капитальный ремонт", icon: "buildings" },
  { title: "Судостроение", icon: "marine" },
  { title: "Пневматические системы", icon: "pneumatics" },
  { title: "Системы отопления и кондиционирования", icon: "heating" },
];

export default function Solutions() {
  return (
    <section data-header-theme="light" className="solutions" aria-label="Области применения">
      <ul className="solutions__grid">
        {solutions.map((item) => (
          <li key={item.title}>
            <Link href={item.href ?? "/catalog"} className="solutions__card">
              <Image
                className="solutions__icon"
                src={`/icons/solutions/${item.icon}.svg`}
                width={88}
                height={88}
                alt=""
                aria-hidden="true"
              />
              <span className="solutions__title">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
