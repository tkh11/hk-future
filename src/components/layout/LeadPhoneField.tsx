"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
import styles from "./LeadDialog.module.css";

const regionNames = new Intl.DisplayNames(["ru"], { type: "region" });
const countries = getCountries().map(code => ({ code, name: regionNames.of(code) ?? code, dial: getCountryCallingCode(code) }))
  .sort((a, b) => a.code === "RU" ? -1 : b.code === "RU" ? 1 : a.name.localeCompare(b.name, "ru"));

function formatNational(digits: string, country: CountryCode) {
  if (!digits) return "";
  if (country !== "RU") return new AsYouType(country).input(digits);
  return `(${digits.slice(0, 3)}${digits.length >= 3 ? ")" : ""}${digits.length > 3 ? ` ${digits.slice(3, 6)}` : ""}${digits.length > 6 ? `-${digits.slice(6, 8)}` : ""}${digits.length > 8 ? `-${digits.slice(8, 10)}` : ""}`;
}

export default function LeadPhoneField({ id, invalid, describedBy, onChange }: {
  id: string;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [country, setCountry] = useState<CountryCode>("RU");
  const [digits, setDigits] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ above: false, height: 240 });
  const dial = getCountryCallingCode(country);
  const formatted = formatNational(digits, country);
  const value = digits ? parsePhoneNumberFromString(digits, country)?.number ?? `+${dial}${digits}` : "";
  const selected = countries.find(item => item.code === country)!;
  const filtered = countries.filter(item => `${item.name} ${item.code} +${item.dial}`.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")));

  useEffect(() => {
    if (!open) return;
    search.current?.focus({ preventScroll: true });
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  useEffect(() => {
    if (open) root.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function update(nextDigits: string, nextCountry: CountryCode) {
    setDigits(nextDigits);
    setCountry(nextCountry);
    onChange(nextDigits ? parsePhoneNumberFromString(nextDigits, nextCountry)?.number ?? `+${getCountryCallingCode(nextCountry)}${nextDigits}` : "");
  }

  function changeNumber(next: string) {
    let nextDigits = next.replace(/\D/g, "");
    let nextCountry = country;
    if (next.trim().startsWith("+")) {
      const parsed = parsePhoneNumberFromString(next);
      if (parsed) {
        nextCountry = parsed.country ?? country;
        nextDigits = parsed.nationalNumber;
      } else if (nextDigits.startsWith(dial)) nextDigits = nextDigits.slice(dial.length);
    } else {
      if (next.length < formatted.length && nextDigits === digits) nextDigits = digits.slice(0, -1);
      if (country === "RU" && nextDigits.length === 11 && /^[78]/.test(nextDigits)) nextDigits = nextDigits.slice(1);
    }
    update(nextDigits.slice(0, nextCountry === "RU" ? 10 : 15 - getCountryCallingCode(nextCountry).length), nextCountry);
  }

  function toggle() {
    if (open) { setOpen(false); return; }
    const bounds = root.current?.getBoundingClientRect();
    const dialog = root.current?.closest('[role="dialog"]')?.getBoundingClientRect();
    if (bounds && dialog) {
      const below = dialog.bottom - bounds.bottom - 20;
      const above = bounds.top - dialog.top - 20;
      setPlacement({ above: above > below, height: Math.max(120, Math.min(270, Math.max(above, below))) });
    }
    setQuery("");
    setActive(countries.findIndex(item => item.code === country));
    setOpen(true);
  }

  function choose(next: CountryCode) {
    update(digits, next);
    setOpen(false);
    input.current?.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(index => Math.max(0, Math.min(filtered.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active].code);
    }
  }

  return <div ref={root} className={styles.phoneField} onKeyDown={onKeyDown} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <div className={styles.phoneRow} data-invalid={invalid || undefined}>
      <button ref={trigger} type="button" className={styles.countryTrigger} aria-label={`Код страны: ${selected.name}, +${dial}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-countries` : undefined} onClick={toggle}>
        <span>+{dial}</span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      <input ref={input} id={id} className={styles.phoneInput} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={country === "RU" ? "(___) ___-__-__" : new AsYouType(country).input("123456789")} value={formatted} required data-form-field aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={event => changeNumber(event.target.value)} />
      <input type="hidden" name="phone" value={value} />
    </div>
    {open && <div className={styles.countryMenu} data-above={placement.above || undefined} style={{ "--country-menu-height": `${placement.height}px` } as CSSProperties}>
      <input ref={search} className={styles.countrySearch} type="search" role="combobox" aria-label="Найти страну или код" aria-expanded="true" aria-controls={`${id}-countries`} aria-activedescendant={filtered[active] ? `${id}-country-${filtered[active].code}` : undefined} autoComplete="off" placeholder="Страна или код" value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} />
      <div id={`${id}-countries`} className={styles.countryList} role="listbox" aria-label="Код страны">
        {filtered.map((item, index) => <button key={item.code} id={`${id}-country-${item.code}`} type="button" role="option" tabIndex={-1} aria-selected={country === item.code} data-active={active === index || undefined} className={styles.countryOption} onMouseDown={event => event.preventDefault()} onClick={() => choose(item.code)}>
          <span>{item.name}</span><span>+{item.dial}</span>
        </button>)}
        {!filtered.length && <p className={styles.countryEmpty}>Страна не найдена</p>}
      </div>
    </div>}
  </div>;
}
