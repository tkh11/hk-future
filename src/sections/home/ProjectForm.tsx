"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import Link from "next/link";

function Row({
  id,
  label,
  required,
  wide,
  area,
  ...props
}: {
  id: string;
  label: string;
  required?: boolean;
  wide?: boolean;
  area?: boolean;
} & InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const className = [
    "project-form__row",
    wide ? "project-form__row--wide" : "",
    area ? "project-form__row--area" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={className} htmlFor={id}>
      <span className="project-form__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {area ? (
        <textarea id={id} className="project-form__control" {...props} />
      ) : (
        <input id={id} className="project-form__control" required={required} {...props} />
      )}
    </label>
  );
}

export default function ProjectForm() {
  const sheetRef = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const sheet = sheetRef.current;

    if (!sheet) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sheet.classList.add("is-in");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        sheet.classList.add("is-in");
        observer.disconnect();
      },
      {
        threshold: 0.22,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    observer.observe(sheet);

    return () => observer.disconnect();
  }, []);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? "");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <section data-header-theme="light" className="project-form">
      <div className="project-form__inner">
        <div className="project-form__intro">
          <h2 className="project-form__title">
            Есть проект?
            <br />
            Расскажите нам о нём.
          </h2>
        </div>

        <form ref={sheetRef} className="project-form__sheet" onSubmit={onSubmit}>
          <div className="project-form__fields">
            <Row
              id="project-name"
              name="name"
              label="Как вас зовут?"
              required
              autoComplete="name"
            />
            <Row
              id="project-phone"
              name="phone"
              type="tel"
              label="Телефон"
              required
              autoComplete="tel"
            />
            <Row
              id="project-email"
              name="email"
              type="email"
              label="Email"
              required
              autoComplete="email"
            />
            <Row
              id="project-city"
              name="city"
              label="Из какого вы города?"
              required
              autoComplete="address-level2"
            />
            <Row
              id="project-details"
              name="details"
              label="Детали обращения"
              wide
              area
              rows={5}
            />
            <label className="project-form__row project-form__row--wide project-form__row--file">
              <input
                className="project-form__file-input"
                type="file"
                name="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.zip"
                onChange={onFileChange}
              />
              <span className="project-form__label">Прикрепить файл</span>
              <span className="project-form__file-value">
                {fileName || "Выбрать"}
              </span>
            </label>
          </div>

          <label className="project-form__consent">
            <input
              className="project-form__checkbox"
              type="checkbox"
              name="privacy"
              required
            />
            <span>
              Я соглашаюсь с{" "}
              <Link href="/privacy">политикой конфиденциальности</Link>
            </span>
          </label>

          <button className="project-form__submit" type="submit" disabled={sent}>
            {sent ? "Заявка отправлена" : "Отправить заявку"}
            {sent ? null : <span aria-hidden="true">→</span>}
          </button>
        </form>
      </div>
    </section>
  );
}
