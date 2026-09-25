const facts = [
  { value: "25+", label: "лет на рынке" },
  { value: "10 лет", label: "гарантии" },
  { value: "РФ", label: "собственное производство" },
];

export default function AboutIntro() {
  return (
    <section data-header-theme="light" className="about-intro">
      <div className="about-intro__inner">
        <p className="about-intro__caption">О КОМПАНИИ</p>
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
    </section>
  );
}
