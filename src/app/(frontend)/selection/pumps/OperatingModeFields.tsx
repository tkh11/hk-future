"use client";

import { useState, type ReactNode } from "react";
import css from "./pump-selection.module.css";

export type OperatingMode = "quick" | "advanced";

export default function OperatingModeFields({ initialMode, quickForm, children }: {
  initialMode: OperatingMode;
  quickForm: ReactNode;
  children: ReactNode;
}) {
  const [mode, setMode] = useState(initialMode);
  return (
    <div className={css.tool}>
      <div className={css.panel}>
        <div className={css.modeFields}>
          <div className={css.field}>
            <label htmlFor="pump-mode">Режим подбора</label>
            <select id="pump-mode" name="mode" form="pump-selection-form" value={mode}
              onChange={event => setMode(event.target.value as OperatingMode)}>
              <option value="quick">Быстрый подбор</option>
              <option value="advanced">Расширенный подбор</option>
            </select>
          </div>
        </div>
        <fieldset className={css.quickFields} aria-label="Быстрый подбор" hidden={mode !== "quick"} disabled={mode !== "quick"}>
          {quickForm}
        </fieldset>
        <section className={css.advanced} hidden={mode !== "advanced"} aria-label="Расширенный подбор" />
      </div>
      <div hidden={mode !== "quick"}>{children}</div>
    </div>
  );
}
