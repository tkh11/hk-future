"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

const HeaderLogo = dynamic(() => import("@/components/layout/HeaderLogo"), {
  ssr: false,
  loading: () => <span className="site-header__logo" aria-hidden="true" />,
});

const leftLinks = [
  { href: "/catalog", label: "Каталог" },
  { href: "/catalog", label: "Подбор оборудования" },
  { href: "/catalog", label: "База знаний" },
];

const rightLinks = [{ href: "/catalog", label: "Контакты" }];

const mobileLinks = [...leftLinks, ...rightLinks];

function SearchIcon() {
  return (
    <svg
      className="site-header__search-icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16.2 16.2L20.5 20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function HeaderSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    inputRef.current?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!formRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/catalog?q=${encodeURIComponent(value)}` : "/catalog");
    onOpenChange(false);
  }

  return (
    <form
      ref={formRef}
      className={`site-header__search${open ? " is-open" : ""}`}
      role="search"
      onSubmit={onSubmit}
    >
      <button
        type="button"
        className="site-header__search-toggle"
        aria-label={open ? "Закрыть поиск" : "Поиск"}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <SearchIcon />
      </button>
      <input
        ref={inputRef}
        className="site-header__search-input"
        type="search"
        name="q"
        value={query}
        placeholder="Поиск"
        aria-label="Поиск"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const onSearchOpenChange = useCallback((open: boolean) => {
    setSearchOpen(open);
    if (open) {
      setMenuOpen(false);
    }
  }, []);

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
    const media = window.matchMedia("(min-width: 834px)");

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

      <header className="site-header">
        <div className="site-header__bar">
          <Link href="/" aria-label="HEISSKRAFT" className="site-header__brand">
            <HeaderLogo />
          </Link>

          <nav className="site-header__nav" aria-label="Навигация">
            {leftLinks.map((item) => (
              <Link key={item.label} href={item.href} className="site-header__link">
                {item.label}
              </Link>
            ))}
            <div className="site-header__aside">
              {rightLinks.map((item) => (
                <Link key={item.label} href={item.href} className="site-header__link">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="site-header__tools">
            <HeaderSearch open={searchOpen} onOpenChange={onSearchOpenChange} />
            <button
              type="button"
              className="site-header__burger"
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => {
                setMenuOpen((open) => !open);
                setSearchOpen(false);
              }}
            >
              <span className="site-header__burger-icon" aria-hidden="true">
                <span className={menuOpen ? "is-open" : ""} />
                <span className={menuOpen ? "is-open" : ""} />
                <span className={menuOpen ? "is-open" : ""} />
              </span>
            </button>
          </div>
        </div>

        <nav
          id="mobile-menu"
          className={`site-header__panel${menuOpen ? " is-open" : ""}`}
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
      </header>
    </>
  );
}
