"use client";

import { useState } from "react";
import { isPumpFluidKind, pumpFluidLabels, type CustomFluidFields, type PumpFluidKind } from "@/lib/pump-fluid";
import css from "./pump-selection.module.css";

export default function PumpFluidFields({ fluid, temperature, concentration, customFields, error }: {
  fluid: string;
  temperature: string;
  concentration: string;
  customFields: CustomFluidFields;
  error: boolean;
}) {
  const [kind, setKind] = useState<PumpFluidKind | "">(isPumpFluidKind(fluid) ? fluid : "");
  const mixture = kind !== "" && kind !== "water";
  const custom = kind === "custom";
  const samePropertySource = custom === (fluid === "custom");
  const fluidError = error && kind === "";
  const propertiesError = error && !fluidError;
  const errorId = error ? "pump-fluid-error" : undefined;
  return <>
    <div className={css.field}>
      <label htmlFor="pump-fluid">Перекачиваемая среда</label>
      <select id="pump-fluid" name="fluid" required value={kind}
        aria-invalid={fluidError || undefined} aria-describedby={fluidError ? errorId : undefined}
        onChange={event => setKind(event.target.value as PumpFluidKind)}>
        {kind === "" && <option value="" disabled>Выберите среду</option>}
        {Object.entries(pumpFluidLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {fluidError && <p id={errorId} className={css.error}>Выберите среду из списка.</p>}
    </div>
    {custom && ([
        ["fluidName", "Название жидкости", 128],
        ["viscosity", "Кинематическая вязкость, мм²/с", 64],
        ["density", "Плотность, кг/м³", 64],
      ] as const).map(([name, label, maxLength]) => <div className={css.field} key={name}>
        <label htmlFor={`pump-${name}`}>{label}</label>
        <input id={`pump-${name}`} name={name} required inputMode={name === "fluidName" ? "text" : "decimal"}
          maxLength={maxLength} defaultValue={customFields[name].slice(0, maxLength)}
          aria-invalid={propertiesError || undefined} aria-describedby={propertiesError ? errorId : undefined} />
      </div>)}
    <div className={css.field}>
      <label htmlFor="pump-temperature">Температура, °C</label>
      <input key={custom ? "custom" : "catalog"} id="pump-temperature" name="temperature" inputMode="decimal" required={!custom}
        defaultValue={samePropertySource ? temperature : custom ? "" : "20"}
        maxLength={64} aria-invalid={propertiesError || undefined} aria-describedby={propertiesError ? errorId : undefined} />
      {propertiesError && <p id={errorId} className={css.error}>
        {custom ? "Проверьте название и числовые значения. Плотность и вязкость должны быть положительными, вязкость до 3000 мм²/с, концентрация от 0 до 100%."
          : mixture ? "Проверьте температуру и концентрацию." : "Проверьте температуру воды."}
      </p>}
    </div>
    <div className={css.field} hidden={!mixture}>
      <label htmlFor="pump-concentration">Концентрация, % масс.</label>
      <input key={custom ? "custom" : "catalog"} id="pump-concentration" name="concentration" inputMode="decimal" required={mixture && !custom} disabled={!mixture}
        defaultValue={samePropertySource ? concentration : ""} maxLength={64} aria-invalid={(propertiesError && mixture) || undefined}
        aria-describedby={propertiesError && mixture ? errorId : undefined} />
    </div>
  </>;
}
