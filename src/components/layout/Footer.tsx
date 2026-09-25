import Link from "next/link";

const columns = [
  {
    title: "Продукция",
    links: [
      { href: "/catalog", label: "Трубопроводные системы" },
      { href: "/catalog", label: "Насосное оборудование" },
      { href: "/catalog", label: "Арматура" },
    ],
  },
  {
    title: "Покупателям",
    links: [
      { href: "/catalog", label: "Каталог" },
      { href: "/catalog", label: "Подбор оборудования" },
      { href: "/catalog", label: "База знаний" },
    ],
  },
  {
    title: "Компания",
    links: [
      { href: "/about", label: "Информация о компании" },
      { href: "/docs", label: "Документация" },
      { href: "/catalog", label: "Сервисный центр" },
      { href: "/requisites", label: "Реквизиты организации" },
    ],
  },
];

const legalLinks = [
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/personal-data", label: "Обработка персональных данных" },
];

export default function Footer() {
  return (
    <footer data-header-theme="light" className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__columns">
          {columns.map((column) => (
            <nav key={column.title} className="site-footer__group" aria-label={column.title}>
              <h2 className="site-footer__heading">{column.title}</h2>
              <ul className="site-footer__list">
                {column.links.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="site-footer__link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="site-footer__group">
            <h2 className="site-footer__heading">Контакты</h2>
            <ul className="site-footer__list">
              <li>
                <a href="tel:+74952584542" className="site-footer__link">
                  +7 (495) 258-45-42
                </a>
              </li>
              <li>
                <a href="mailto:info@heisskraft.ru" className="site-footer__link">
                  info@heisskraft.ru
                </a>
              </li>
              <li>
                <p className="site-footer__address">
                  141214, Московская область, г. Пушкино, пос. Зверосовхоза, ул. Соболиная, д. 11,
                  стр. 1, оф. 1-19
                </p>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copy">© 2026 HEISSKRAFT — все права защищены</p>
          <nav className="site-footer__legal" aria-label="Правовая информация">
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="site-footer__link">
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="site-footer__note">Использование материалов сайта без согласования запрещено.</p>
          <Link href="/" className="site-footer__brand" aria-label="HEISSKRAFT">
            <img
              src="/brand/full-logo.svg"
              alt=""
              width={541}
              height={54}
              className="site-footer__logo"
            />
          </Link>
        </div>
      </div>
    </footer>
  );
}
