import Image from "next/image";

const facts = [
  { value: "25+", label: "лет на рынке" },
  { value: "10 лет", label: "гарантии" },
  { value: "РФ", label: "собственное производство" },
];

export default function AboutIntro() {
  return (
    <section data-header-theme="light" className="about-intro">
      <div className="about-intro__inner">
        <div className="about-intro__copy">
          <h2 className="about-intro__title">Качество в деталях</h2>
          <p className="about-intro__text">
            HEISSKRAFT — российский производитель полимерных трубопроводных систем и
            насосного оборудования. Системный контроль качества позволяет проследить путь
            изделия от разработки до работы на объекте.
          </p>
          <dl className="about-intro__facts">
            {facts.map((fact) => (
              <div key={fact.label} className="about-intro__fact">
                <dt className="about-intro__value">{fact.value}</dt>
                <dd className="about-intro__label">{fact.label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="about-intro__media">
          <Image
            src="/images/home/about-tools.jpg"
            alt="Калибры HEISSKRAFT для контроля размеров"
            width={682}
            height={1024}
            sizes="(min-width: 768px) 42vw, 100vw"
          />
        </div>
      </div>
    </section>
  );
}
