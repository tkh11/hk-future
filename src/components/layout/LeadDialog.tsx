"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])';

function maskPhone(next: string, previous: string) {
  const nextDigits = next.replace(/\D/g, "");
  const previousDigits = previous.replace(/\D/g, "");
  let digits = nextDigits;

  if (next.length < previous.length && nextDigits.length === previousDigits.length) {
    digits = previousDigits.slice(0, -1);
  }

  let national = digits;

  if (national.startsWith("7") || national.startsWith("8")) {
    national = national.slice(1);
  }

  national = national.slice(0, 10);

  if (national.length === 0) {
    return "";
  }

  let formatted = "+7";

  formatted += ` (${national.slice(0, 3)}`;

  if (national.length >= 3) {
    formatted += ")";
  }

  if (national.length > 3) {
    formatted += ` ${national.slice(3, 6)}`;
  }

  if (national.length > 6) {
    formatted += `-${national.slice(6, 8)}`;
  }

  if (national.length > 8) {
    formatted += `-${national.slice(8, 10)}`;
  }

  return formatted;
}

export default function LeadDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState("");
  const [fileName, setFileName] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    panel?.querySelector<HTMLElement>("input")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) {
        return;
      }

      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];

      if (items.length === 0) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  function onPhoneChange(event: ChangeEvent<HTMLInputElement>) {
    setPhone(maskPhone(event.target.value, phone));
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? "");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (phone.replace(/\D/g, "").length < 11) {
      event.currentTarget.querySelector<HTMLInputElement>('[name="phone"]')?.setCustomValidity(
        "Введите телефон полностью",
      );
      event.currentTarget.reportValidity();
      return;
    }

    setSent(true);
  }

  return (
    <div className="lead-dialog" role="presentation">
      <button type="button" className="lead-dialog__backdrop" aria-label="Закрыть заявку" onClick={onClose} />
      <div
        ref={panelRef}
        className="lead-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="lead-dialog__head">
          <h2 id={titleId} className="lead-dialog__title">
            Оставить заявку
          </h2>
          <button type="button" className="lead-dialog__close" aria-label="Закрыть" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <form className="lead-dialog__form" onSubmit={onSubmit}>
          <label className="lead-dialog__field">
            <span className="lead-dialog__label">ФИО</span>
            <input className="lead-dialog__control" name="name" autoComplete="name" required />
          </label>

          <label className="lead-dialog__field">
            <span className="lead-dialog__label">Телефон</span>
            <input
              className="lead-dialog__control"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 (___) ___-__-__"
              value={phone}
              required
              onChange={(event) => {
                event.target.setCustomValidity("");
                onPhoneChange(event);
              }}
            />
          </label>

          <label className="lead-dialog__field">
            <span className="lead-dialog__label">Email</span>
            <input
              className="lead-dialog__control"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="lead-dialog__field">
            <span className="lead-dialog__label">Ваш город</span>
            <input className="lead-dialog__control" name="city" autoComplete="address-level2" required />
          </label>

          <label className="lead-dialog__field lead-dialog__field--area">
            <span className="lead-dialog__label">Детали обращения</span>
            <textarea className="lead-dialog__control" name="details" rows={4} required />
          </label>

          <label className="lead-dialog__field lead-dialog__field--file">
            <input
              className="lead-dialog__file-input"
              type="file"
              name="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.zip"
              onChange={onFileChange}
            />
            <span className="lead-dialog__label">Прикрепите файл</span>
            <span className="lead-dialog__file">
              <span className="lead-dialog__file-value">{fileName || "PDF, DOC, XLS, JPG, ZIP"}</span>
              <span className="lead-dialog__file-action">Выбрать</span>
            </span>
          </label>

          <label className="lead-dialog__consent">
            <input className="lead-dialog__checkbox" type="checkbox" name="privacy" required />
            <span>
              Согласие на обработку{" "}
              <Link href="/privacy">персональных данных</Link>
            </span>
          </label>

          <button className="lead-dialog__submit" type="submit" disabled={sent}>
            {sent ? "Заявка отправлена" : "Отправить заявку"}
          </button>
        </form>
      </div>
    </div>
  );
}
