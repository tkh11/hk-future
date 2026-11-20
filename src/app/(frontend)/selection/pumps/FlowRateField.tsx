"use client";

import { useState } from "react";
import { flowUnitLabels, fromM3h, parseFlowUnit, toM3h, type FlowUnit } from "@/lib/flow-units";
import { readPumpDecimal } from "@/lib/pump-input";
import css from "./pump-selection.module.css";

const flowInputFormat = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 15, useGrouping: false });

export default function FlowRateField({ id, defaultValue, defaultUnit, error = false, inline = false }: {
  id: string;
  defaultValue: string;
  defaultUnit: FlowUnit;
  error?: boolean;
  inline?: boolean;
}) {
  const [unit, setUnit] = useState(defaultUnit);
  const [text, setText] = useState(defaultValue);
  const [canonical, setCanonical] = useState(() => {
    const value = readPumpDecimal(defaultValue);
    return value === null ? null : toM3h(value, defaultUnit);
  });
  return <div className={`${css.field} ${inline ? css.pointField : ""}`}>
    <label htmlFor={id}>Расход</label>
    <div className={css.flowInput}>
      <input id={id} name="flow" inputMode="decimal" required maxLength={64} value={text}
        aria-label={`Расход, ${flowUnitLabels[unit]}`}
        aria-invalid={error || undefined} aria-describedby={error ? `${id}-error` : undefined}
        onChange={event => {
          setText(event.target.value);
          const value = readPumpDecimal(event.target.value);
          setCanonical(value === null ? null : toM3h(value, unit));
        }} />
      <select name="flowUnit" aria-label="Единицы расхода" value={unit} onChange={event => {
        const nextUnit = parseFlowUnit(event.target.value);
        if (canonical !== null && Number.isFinite(canonical)) {
          setText(flowInputFormat.format(fromM3h(canonical, nextUnit)));
        }
        setUnit(nextUnit);
      }}>
        {Object.entries(flowUnitLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    {error && <p id={`${id}-error`} className={css.error}>Введите расход больше 0.</p>}
  </div>;
}
