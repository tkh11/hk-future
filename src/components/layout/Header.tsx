"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHeaderTheme } from "@/components/layout/HeaderTheme";

const leftLinks = [
  { href: "/catalog", label: "Каталог" },
  { href: "/catalog", label: "Подбор оборудования" },
  { href: "/catalog", label: "База знаний" },
];

const rightLinks = [{ href: "/catalog", label: "Контакты" }];

const mobileLinks = [
  ...leftLinks,
  { href: "/catalog", label: "Поиск" },
  ...rightLinks,
];

function SearchIcon() {
  return (
    <svg
      className="site-header__search-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16.2 16.2L20.5 20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function useHomeIdleHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [idlePath, setIdlePath] = useState(pathname);
  const [idle, setIdle] = useState(false);

  if (idlePath !== pathname) {
    setIdlePath(pathname);
    setIdle(false);
  }

  useEffect(() => {
    if (!onHome) {
      return;
    }

    const hero = document.querySelector(".hero");

    if (!(hero instanceof HTMLElement)) {
      return;
    }

    const sync = () => {
      setIdle(hero.classList.contains("is-idle"));
    };

    const observer = new MutationObserver(sync);
    observer.observe(hero, { attributes: true, attributeFilter: ["class"] });
    const frame = requestAnimationFrame(sync);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
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
                key={item.label}
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
                <Link key={item.label} href={item.href} className="site-header__link">
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
              <Link href="/catalog" className="site-header__search" aria-label="Поиск">
                <SearchIcon />
              </Link>
              {rightLinks.map((item) => (
                <Link key={item.label} href={item.href} className="site-header__link">
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
