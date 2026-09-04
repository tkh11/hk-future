"use client";

import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import Link from "next/link";

function Field({
  id,
  label,
  required,
  className,
  ...props
}: {
  id: string;
  label: string;
  required?: boolean;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`project-form__field${className ? ` ${className}` : ""}`} htmlFor={id}>
      <span className="project-form__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input id={id} className="project-form__control" required={required} {...props} />
    </label>
  );
}

function Area({
  id,
  label,
  className,
  ...props
}: {
  id: string;
  label: string;
  className?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`project-form__field${className ? ` ${className}` : ""}`} htmlFor={id}>
      <span className="project-form__label">{label}</span>
      <textarea id={id} className="project-form__control project-form__control--area" {...props} />
    </label>
  );
}

export default function ProjectForm() {
  const [fileName, setFileName] = useState("");
  const [sent, setSent] = useState(false);

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

        <form className="project-form__form" onSubmit={onSubmit}>
          <div className="project-form__grid">
            <Field
              id="project-name"
              name="name"
              label="Как вас зовут?"
              required
              autoComplete="name"
            />
            <Field
              id="project-phone"
              name="phone"
              type="tel"
              label="Телефон"
              required
              autoComplete="tel"
            />
            <Field
              id="project-email"
              name="email"
              type="email"
              label="Email"
              required
              autoComplete="email"
            />
            <Field
              id="project-city"
              name="city"
              label="Из какого вы города?"
              required
              autoComplete="address-level2"
            />
            <Area
              id="project-details"
              name="details"
              label="Детали обращения"
              className="project-form__field--wide"
              rows={5}
            />
          </div>

          <label className="project-form__file">
            <input
              className="project-form__file-input"
              type="file"
              name="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.zip"
              onChange={onFileChange}
            />
            <span className="project-form__file-label">
              {fileName || "Прикрепить файл"}
            </span>
          </label>

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
          </button>
        </form>
      </div>
    </section>
  );
}
