"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { isPossiblePhoneNumber } from "libphonenumber-js/min";
import LeadPhoneField from "./LeadPhoneField";
import styles from "./LeadDialog.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])';
const STEPS = ["Укажите ваше ФИО", "Укажите ваш номер телефона", "Укажите ваш e-mail", "Укажите ваш город", "Детали обращения", "Прикрепите файл (при необходимости)", "Согласие на обработку персональных данных"];

export default function LeadDialog({ onClose }: { onClose: () => void }) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const moving = useRef(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [phone, setPhone] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<{ step: number; message: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [closing, setClosing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [completed, setCompleted] = useState<boolean[]>(() => STEPS.map(() => false));
  const completedCount = completed.filter(Boolean).length;
  const complete = completedCount === STEPS.length;

  const requestClose = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = setTimeout(onClose, reduced ? 0 : 180);
  }, [onClose]);

  useEffect(() => {
    alive.current = true;
    const panel = panelRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        item => !item.closest("[hidden], [inert]") && item.getClientRects().length > 0,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      alive.current = false;
      animationRef.current?.cancel();
      if (closeTimer.current) clearTimeout(closeTimer.current);
      document.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected && previous !== document.body && !previous.closest("[inert], [hidden]") && previous.getClientRects().length) {
        previous.focus({ preventScroll: true });
      } else {
        document.querySelector<HTMLElement>('.site-header__burger')?.focus({ preventScroll: true });
      }
    };
  }, [requestClose]);

  useEffect(() => {
    const target = sent
      ? panelRef.current?.querySelector<HTMLElement>("[data-success]")
      : formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"] [data-form-field]`);
    target?.focus({ preventScroll: true });
  }, [step, sent]);

  async function goTo(next: number) {
    if (moving.current || closing || next === step) return;
    moving.current = true;
    setTransitioning(true);
    const nextDirection = next > step ? 1 : -1;
    setDirection(nextDirection);
    const current = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animationRef.current = current.animate([
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        { opacity: 0, transform: `translateY(${-nextDirection * 14}px)`, filter: "blur(3px)" },
      ], { duration: 160, easing: "ease-in", fill: "forwards" });
      try { await animationRef.current.finished; } catch { /* Closing cancels the transition. */ }
    }
    if (!alive.current) return;
    animationRef.current?.cancel();
    animationRef.current = null;
    setError(null);
    setStep(next);
    setTransitioning(false);
    moving.current = false;
  }

  function validationError(index: number) {
    const control = formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-step="${index}"] [data-form-field]`);
    if (!control) return "";
    if (index === 1 && !isPossiblePhoneNumber(phone)) return "Введите телефон полностью и проверьте код страны";
    if (control.validity.valueMissing) return index === 6 ? "Подтвердите согласие на обработку персональных данных" : "Заполните это поле";
    if (control.validity.typeMismatch) return "Введите корректный email";
    if (control.required && control.type !== "checkbox" && !control.value.trim()) return "Заполните это поле";
    return "";
  }

  function markCompleted(index: number, value: boolean) {
    setCompleted(previous => previous.map((item, current) => current === index ? value : item));
  }

  function fieldChanged() {
    setError(null);
  }

  async function advance() {
    if (moving.current || sent || closing) return;
    const message = validationError(step);
    if (message) {
      setError({ step, message });
      markCompleted(step, false);
      formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"] [data-form-field]`)?.focus({ preventScroll: true });
      return;
    }
    markCompleted(step, true);
    if (step < STEPS.length - 1) {
      void goTo(step + 1);
      return;
    }
    // Recheck earlier fields in case browser autofill changed hidden values.
    const invalid = STEPS.findIndex((_, index) => Boolean(validationError(index)));
    if (invalid !== -1) {
      markCompleted(invalid, false);
      await goTo(invalid);
      if (alive.current) setError({ step: invalid, message: validationError(invalid) });
      return;
    }
    // Retain the existing local confirmation; submission transport is not connected yet.
    setCompleted(STEPS.map(() => true));
    setSent(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void advance();
  }

  function fieldProps(index: number) {
    return { "data-form-field": true, "aria-invalid": error?.step === index || undefined, "aria-describedby": error?.step === index ? `${id}-error` : undefined };
  }

  return <div className={styles.overlay} data-closing={closing || undefined}>
    <button type="button" className={styles.backdrop} tabIndex={-1} aria-label="Закрыть заявку" onClick={requestClose} />
    {sent && <div className={styles.successSheen} aria-hidden="true"><span /></div>}
    <div ref={panelRef} className={styles.dialog} role="dialog" aria-modal="true" aria-label="Форма заявки" data-lenis-prevent>
      <header className={styles.header}>
        <nav className={styles.navigation} aria-label="Шаги формы">
          <button type="button" className={styles.navButton} aria-label="Предыдущий шаг" disabled={step === 0 || transitioning || sent} onClick={() => void goTo(step - 1)}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
          </button>
          <button type="button" className={styles.navButton} aria-label="Следующий шаг" disabled={step === STEPS.length - 1 || transitioning || sent} onClick={() => void advance()}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </nav>
        <button type="button" className={styles.close} aria-label="Закрыть" onClick={requestClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </header>
      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate style={{ "--step-enter-y": `${direction * 18}px` } as CSSProperties}>
        <div className={styles.stage}>
          {STEPS.map((label, index) => <div key={label} className={styles.step} data-step={index} hidden={sent || step !== index} inert={sent || step !== index || transitioning}>
            <label id={`${id}-question-${index}`} className={styles.question} htmlFor={`${id}-${index}`}>{label}</label>
            {index === 0 && <input id={`${id}-0`} className={styles.input} name="name" autoComplete="name" placeholder="Александров Александр Александрович" required {...fieldProps(0)} onChange={fieldChanged} />}
            {index === 1 && <LeadPhoneField id={`${id}-1`} invalid={error?.step === 1} describedBy={error?.step === 1 ? `${id}-error` : undefined} onChange={value => { setPhone(value); fieldChanged(); }} />}
            {index === 2 && <input id={`${id}-2`} className={styles.input} name="email" type="email" autoComplete="email" placeholder="info@heisskraft.ru" required {...fieldProps(2)} onChange={fieldChanged} />}
            {index === 3 && <input id={`${id}-3`} className={styles.input} name="city" autoComplete="address-level2" placeholder="Москва" required {...fieldProps(3)} onChange={fieldChanged} />}
            {index === 4 && <textarea id={`${id}-4`} className={`${styles.input} ${styles.textarea}`} name="details" rows={4} placeholder="укажите детали вашего обращения" required {...fieldProps(4)} onChange={fieldChanged} />}
            {index === 5 && <>
              <label className={styles.file}>
                <input id={`${id}-5`} className={styles.fileInput} name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.zip" {...fieldProps(5)} onChange={event => { setFileName(event.target.files?.[0]?.name ?? ""); fieldChanged(); }} />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m9 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9" /></svg>
                <span className={styles.fileName}>{fileName || "PDF, DOC, XLS, JPG, ZIP"}</span>
                <span className={styles.fileAction}>Выбрать</span>
              </label>
            </>}
            {index === 6 && <div className={styles.consent}>
              <input id={`${id}-6`} aria-labelledby={`${id}-question-6`} type="checkbox" name="privacy" required {...fieldProps(6)} onChange={fieldChanged} />
              <span><label htmlFor={`${id}-6`}>Согласие на обработку </label><Link href="/privacy">персональных данных</Link></span>
            </div>}
          </div>)}
          {sent && <div className={styles.success} data-success tabIndex={-1} role="status">
            <h3>Заявка отправлена</h3>
            <p>В ближайшее время наш менеджер свяжется с вами.</p>
            <p>Благодарим за выбор компании Heisskraft!</p>
          </div>}
        </div>
        <div className={styles.error} id={`${id}-error`} role="alert">{error?.message}</div>
        <footer className={styles.footer}>
          <div className={styles.completion} data-complete={complete || undefined} role="progressbar" aria-label="Заполнение заявки" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={completedCount} aria-valuetext={complete ? "Заполнение завершено" : `Заполнено ${completedCount} из ${STEPS.length} шагов`}>
            <svg className={styles.ring} width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle className={styles.ringTrack} cx="18" cy="18" r="14" strokeWidth="2.5" />
              <circle className={styles.ringFill} cx="18" cy="18" r="14" strokeWidth="2.5" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - completedCount / STEPS.length * 100} />
            </svg>
            {complete && <svg className={styles.completedCheck} width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true"><circle cx="18" cy="18" r="16" fill="currentColor" fillOpacity=".08" /><path d="m10 18 5 5 11-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" /></svg>}
          </div>
          {sent ? <button type="button" className={styles.next} onClick={requestClose}>Закрыть</button> : <button type="submit" className={styles.next} disabled={transitioning}>{step === 6 ? "Отправить заявку" : "Далее"}</button>}
        </footer>
      </form>
    </div>
  </div>;
}
