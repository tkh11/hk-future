"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHeaderTheme } from "@/components/layout/HeaderTheme";

const leftLinks = [
  { href: "/catalog", label: "Продукция" },
  { href: "/designers", label: "Проектировщикам" },
];

const rightLinks = [
  { href: "/tools", label: "Программы подбора" },
  { href: "/contacts", label: "Контакты" },
];

const mobileLinks = [...leftLinks, ...rightLinks];

function useHomeIdleHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [idle, setIdle] = useState(onHome);

  useEffect(() => {
    if (!onHome) {
      setIdle(false);
      return;
    }

    const hero = document.querySelector(".hero");

    if (!(hero instanceof HTMLElement)) {
      setIdle(true);
      return;
    }

    const sync = () => {
      setIdle(hero.classList.contains("is-idle"));
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(hero, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, [onHome]);

  return onHome && idle;
}

export default function Header() {
  const { theme } = useHeaderTheme();
  const homeIdle = useHomeIdleHeader();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");

    function onChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setMenuOpen(false);
      }
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          className="site-header__overlay"
          aria-label="Закрыть меню"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <header className={`site-header-root${homeIdle ? " is-home-idle" : ""}`}>
        <div data-theme={theme} className="site-header site-header--chip site-header--logo">
          <Link href="/" aria-label="HEISSKRAFT" className="site-header__brand">
            <img
              src="/brand/small-black-logo.svg"
              alt=""
              width={71}
              height={29}
              className="site-header__logo"
            />
          </Link>
        </div>

        <div className="site-header--menu">
          <nav
            id="mobile-menu"
            data-theme={theme}
            className={`site-header site-header--panel${menuOpen ? " is-open" : ""}`}
            aria-label="Мобильная навигация"
            aria-hidden={!menuOpen}
            inert={!menuOpen}
          >
            {mobileLinks.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className="site-header__mobile-link"
                style={{ "--nav-index": index } as CSSProperties}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            data-theme={theme}
            className="site-header site-header--chip site-header--burger"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="site-header__burger-icon" aria-hidden="true">
              <span className={menuOpen ? "is-open" : ""} />
              <span className={menuOpen ? "is-open" : ""} />
              <span className={menuOpen ? "is-open" : ""} />
            </span>
          </button>
        </div>

        <div data-theme={theme} className="site-header site-header--desktop">
          <div className="site-header__bar">
            <nav className="site-header__desktop-nav" aria-label="Левая навигация">
              {leftLinks.map((item) => (
                <Link key={item.href} href={item.href} className="site-header__link">
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link href="/" aria-label="HEISSKRAFT" className="site-header__brand">
              <img
                src="/brand/small-black-logo.svg"
                alt=""
                width={71}
                height={29}
                className="site-header__logo"
              />
            </Link>

            <nav className="site-header__desktop-nav site-header__desktop-nav--right" aria-label="Правая навигация">
              {rightLinks.map((item) => (
                <Link key={item.href} href={item.href} className="site-header__link">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
