"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import ProjectGallery from "@/sections/home/ProjectGallery";

function revealStyle(index: number) {
  return { "--reveal-index": index } as CSSProperties;
}

function Row({
  id,
  label,
  index,
  required,
  area,
  ...props
}: {
  id: string;
  label: string;
  index: number;
  required?: boolean;
  area?: boolean;
} & InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const className = area
    ? "project-form__row project-form__row--area"
    : "project-form__row";

  return (
    <label className={className} style={revealStyle(index)} htmlFor={id}>
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
  const sectionRef = useRef<HTMLElement>(null);
  const [fileName, setFileName] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section.classList.add("is-in");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        section.classList.add("is-in");
        observer.disconnect();
      },
      {
        threshold: 0,
        rootMargin: "0px 0px -18% 0px",
      },
    );

    observer.observe(section);

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
    <section ref={sectionRef} data-header-theme="light" className="project-form">
      <div className="project-form__inner">
        <div className="project-form__main">
          <div className="project-form__intro">
            <h2 className="project-form__title">
              Есть проект?
              <br />
              Расскажите нам о нём.
            </h2>
            <p className="project-form__note">
              Ответим в течение рабочего дня и подберём решение под ваш объект.
            </p>
          </div>

          <form className="project-form__sheet" onSubmit={onSubmit}>
            <div className="project-form__fields">
              <Row
                id="project-name"
                name="name"
                index={0}
                label="Как вас зовут?"
                placeholder="Имя и фамилия"
                required
                autoComplete="name"
              />
              <Row
                id="project-phone"
                name="phone"
                index={1}
                type="tel"
                label="Телефон"
                placeholder="+7 900 000-00-00"
                required
                autoComplete="tel"
              />
              <Row
                id="project-email"
                name="email"
                index={2}
                type="email"
                label="Email"
                placeholder="name@company.ru"
                required
                autoComplete="email"
              />
              <Row
                id="project-city"
                name="city"
                index={3}
                label="Из какого вы города?"
                placeholder="Москва"
                required
                autoComplete="address-level2"
              />
              <Row
                id="project-details"
                name="details"
                index={4}
                label="Детали обращения"
                placeholder="Тип объекта, инженерные системы, сроки"
                area
                rows={5}
              />
              <label
                className="project-form__row project-form__row--file"
                style={revealStyle(5)}
              >
                <input
                  className="project-form__file-input"
                  type="file"
                  name="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.zip"
                  onChange={onFileChange}
                />
                <span className="project-form__label">Прикрепить файл</span>
                <span className="project-form__file-pick">
                  <span className="project-form__file-value">
                    {fileName || "PDF, DOC, XLS, JPG, ZIP"}
                  </span>
                  <span className="project-form__file-action" aria-hidden="true">
                    Выбрать
                  </span>
                </span>
              </label>
            </div>

            <div className="project-form__actions" style={revealStyle(6)}>
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
            </div>
          </form>
        </div>

        <ProjectGallery />
      </div>
    </section>
  );
}
