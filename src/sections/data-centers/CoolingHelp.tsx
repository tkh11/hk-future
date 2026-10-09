"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CoolingExplorer.module.css";

function HelpIcon({ kind }: { kind: "info" | "cursor" | "click" | "cards" }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "info" && <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none" /></>}
    {kind === "cursor" && <path d="m5 3 14 10-7 1-3 7Z" />}
    {kind === "click" && <><path d="M9 12V6a2 2 0 0 1 4 0v5l3-1 4 2v5l-3 4h-6l-6-7a2 2 0 0 1 3-2l1 1" /><path d="M4 5 2 4m4-2L5 1m11 4 2-1" /></>}
    {kind === "cards" && <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M8 14h8M8 17h5" /></>}
  </svg>;
}

export default function CoolingHelp() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div ref={root} className={styles.help}>
    <div className={styles.helpMorph} data-open={open}>
      <div id="cooling-help" className={styles.helpPanel} role="region" aria-labelledby="cooling-help-title" aria-hidden={!open} inert={!open}>
        <div className={styles.helpPanelClip}>
          <div className={styles.helpContent}>
            <h3 id="cooling-help-title">Как пользоваться моделью</h3>
            <ul>
              <li className={styles.hoverInstruction}><HelpIcon kind="cursor" /><div><strong>Наведите курсор</strong><p>Элемент подсветится на модели.</p></div></li>
              <li><HelpIcon kind="click" /><div><strong>Нажмите на элемент</strong><p>Откроется его описание с изображением.</p></div></li>
              <li><HelpIcon kind="cards" /><div><strong>Выберите название под моделью</strong><p>Карточка раскроется. Повторное нажатие свернёт её и снимет выделение.</p></div></li>
            </ul>
          </div>
        </div>
      </div>
      <button ref={trigger} type="button" className={styles.helpButton} aria-expanded={open} aria-controls="cooling-help" onClick={() => setOpen(value => !value)}>
        <HelpIcon kind="info" />Как пользоваться
      </button>
    </div>
  </div>;
}
