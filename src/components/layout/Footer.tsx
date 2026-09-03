import Link from "next/link";

const companyLinks = [
  { href: "/about", label: "Информация о компании" },
  { href: "/projects", label: "Продукция Heisskraft в проектах" },
  { href: "/docs", label: "Документация" },
];

const legalLinks = [
  { href: "/requisites", label: "Реквизиты организации" },
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/personal-data", label: "Обработка персональных данных" },
];

export default function Footer() {
  return (
    <footer data-header-theme="dark" className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__nav">
          <nav className="site-footer__group" aria-label="Компания">
            {companyLinks.map((item) => (
              <Link key={item.href} href={item.href} className="site-footer__link">
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className="site-footer__group" aria-label="Правовая информация">
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="site-footer__link">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__copy">
            <p>© 2021 HEISSKRAFT — все права защищены</p>
            <p>Использование материалов сайта без согласования запрещено.</p>
          </div>

          <Link href="/" className="site-footer__brand" aria-label="HEISSKRAFT">
            <img
              src="/brand/full-logo.svg"
              alt="HEISSKRAFT"
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
