"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SiteSearch from "@/components/layout/SiteSearch";
import type { SiteSearchEntry } from "@/lib/site-search";
import LeadDialog from "@/components/layout/LeadDialog";
import { LEAD_REQUEST_EVENT, leadRequestDetails } from '@/lib/lead-request';

const HeaderLogo = dynamic(() => import("@/components/layout/HeaderLogo"), {
  ssr: false,
  loading: () => <span className="site-header__logo" aria-hidden="true" />,
});

type NavLink = {
  href: string;
  label: string;
};

const navLinks: NavLink[] = [
  { href: "/catalog", label: "Каталог" },
  { href: "/articles", label: "База знаний" },
  { href: "/designers", label: "Проектировщикам" },
  { href: "/selection", label: "Подбор оборудования" },
];

const rightLinks: NavLink[] = [{ href: "/contacts", label: "Контакты" }];

export default function Header({ links = navLinks, searchEntries }: { links?: NavLink[]; searchEntries: SiteSearchEntry[] }) {
  const pathname = usePathname();
  const contactsCurrent = pathname === "/contacts" || pathname.startsWith("/contacts/");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadDetails, setLeadDetails] = useState('');
  const closeLead = useCallback(() => setLeadOpen(false), []);
  const onSearchOpenChange = useCallback((open: boolean) => {
    setSearchOpen(open);
    if (open) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || leadOpen ? "hidden" : "";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !leadOpen) {
        setMenuOpen(false);
        if (menuOpen) menuToggleRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, leadOpen]);

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

  function openLead(details = '') {
    setLeadDetails(details);
    setMenuOpen(false);
    setSearchOpen(false);
    setLeadOpen(true);
  }

  useEffect(() => {
    function onOpenLead(event: Event) {
      openLead(leadRequestDetails(event instanceof CustomEvent ? event.detail : undefined));
    }

    window.addEventListener(LEAD_REQUEST_EVENT, onOpenLead);
    return () => window.removeEventListener(LEAD_REQUEST_EVENT, onOpenLead);
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

          <nav className="site-header__nav" aria-label="Навигация" aria-hidden={searchOpen} inert={searchOpen}>
            {links.map((item) => (
              <Link key={item.label} href={item.href} className="site-header__link">
                {item.label}
              </Link>
            ))}
            <button type="button" data-analytics-goal="lead_open" className="site-header__request" onClick={() => openLead()}>
              Оставить заявку
            </button>
            <div className="site-header__aside">
              {rightLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="site-header__link"
                  aria-current={item.href === "/contacts" && contactsCurrent ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="site-header__tools">
            <SiteSearch entries={searchEntries} open={searchOpen} onOpenChange={onSearchOpenChange} />
            <button
              type="button"
              className="site-header__burger"
              ref={menuToggleRef}
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
          <SiteSearch entries={searchEntries} mobile open={menuOpen} onOpenChange={setMenuOpen} />
          {links.map((item, index) => (
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
          <button type="button" data-analytics-goal="lead_open" className="site-header__mobile-request" onClick={() => openLead()}>
            Оставить заявку
          </button>
          {rightLinks.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className="site-header__mobile-link"
              style={{ "--nav-index": links.length + index } as CSSProperties}
              aria-current={item.href === "/contacts" && contactsCurrent ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {leadOpen ? <LeadDialog onClose={closeLead} initialDetails={leadDetails} /> : null}
    </>
  );
}
