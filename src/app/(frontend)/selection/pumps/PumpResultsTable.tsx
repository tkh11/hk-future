"use client";

import { useState } from "react";
import Link from "next/link";
import type { OperatingResult } from "@/cms/public-pump-selection";
import type { FlowUnit } from "@/lib/flow-units";
import css from "./pump-selection.module.css";

export type PumpResultQuery = {
  flow: string;
  head: string;
  staticHead: string;
  system: string;
  mode: string;
  flowUnit?: FlowUnit;
  fluid?: string;
  temperature?: string;
  concentration?: string;
  fluidName?: string;
  density?: string;
  viscosity?: string;
};

const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
const efficiencyFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const columns = [
  ["name", "Модель"],
  ["connectionSize", "Диаметр присоединения, DN"],
  ["efficiency", "КПД, %"],
  ["powerKw", "Ном. мощность двигателя, кВт"],
  ["speedRpm", "Обороты, об/мин"],
  ["supply", "Питание"],
] as const;
type SortKey = typeof columns[number][0];

function motorSupply({ phases, voltageV, voltageDeltaV, voltageStarV, frequencyHz }: OperatingResult) {
  const voltage = [voltageDeltaV, voltageStarV].filter(Boolean).join("/")
    || (voltageV === null ? "" : numberFormat.format(voltageV));
  const phase = phases === null ? "" : numberFormat.format(phases);
  const prefix = phase && (voltage ? `${phase} × ` : `${phase} ф.`);
  const supply = prefix + (voltage ? `${voltage} В` : "");
  const frequency = frequencyHz === null ? "" : `${numberFormat.format(frequencyHz)} Гц`;
  const suffix = frequency && (supply ? `, ${frequency}` : frequency);
  return { prefix, suffix, text: supply + suffix || null };
}

function MotorSupply({ pump }: { pump: OperatingResult }) {
  const { voltageDeltaV, voltageStarV } = pump;
  const { prefix, suffix, text } = motorSupply(pump);
  if (!voltageDeltaV && !voltageStarV) return text ?? "—";

  return <span className={css.motorSupply}>
    {prefix}
    {voltageDeltaV && <ruby>{voltageDeltaV}<rt title="Треугольник">Δ</rt></ruby>}
    {voltageDeltaV && voltageStarV && "/"}
    {voltageStarV && <ruby>{voltageStarV}<rt title="Звезда">Y</rt></ruby>}
    {" В"}{suffix}
  </span>;
}

export default function PumpResultsTable({ pumps, selectedSku, query, onShowChart }: {
  pumps: OperatingResult[];
  selectedSku?: string;
  query: PumpResultQuery;
  onShowChart?: () => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean } | null>(null);
  const ordered = sort ? [...pumps].sort((a, b) => {
    const aValue = sort.key === "supply" ? motorSupply(a).text : a[sort.key];
    const bValue = sort.key === "supply" ? motorSupply(b).text : b[sort.key];
    if (aValue === null) return bValue === null ? 0 : 1;
    if (bValue === null) return -1;
    const comparison = typeof aValue === "number" && typeof bValue === "number"
      ? aValue - bValue : String(aValue).localeCompare(String(bValue), "ru", { numeric: true });
    return sort.descending ? -comparison : comparison;
  }) : pumps;

  return (
    <div className={css.tableWrap}>
      <table className={css.table}>
        <caption className="visually-hidden">Параметры насосов в выбранной системе</caption>
        <thead>
          <tr>{columns.map(([key, label]) => (
            <th key={key} scope="col" aria-sort={sort?.key === key ? sort.descending ? "descending" : "ascending" : "none"}>
              <button type="button" className={css.sortButton} onClick={() => setSort({ key,
                descending: sort?.key === key ? !sort.descending : key === "efficiency",
              })}>
                {label}<span aria-hidden="true">{sort?.key === key ? sort.descending ? " ↓" : " ↑" : " ↕"}</span>
              </button>
            </th>
          ))}</tr>
        </thead>
        <tbody>{ordered.map(pump => (
          <tr key={pump.sku}>
            <th scope="row">
              {pump.name}
              {pump.optimal && <span className={css.optimal}>Оптимальный</span>}
              <span className={css.sku}>Арт. {pump.sku}</span>
              <Link className={css.chartLink} prefetch={false} aria-label={`График ${pump.name}`}
                aria-current={selectedSku === pump.sku ? "location" : undefined}
                onNavigate={onShowChart}
                href={{ pathname: "/selection/pumps", query: { ...query, curve: pump.sku }, hash: "pump-results-title" }}>
                График Q–H
              </Link>
            </th>
            <td>{pump.connectionSize ?? "—"}</td>
            <td>{pump.efficiency === null ? "—" : efficiencyFormat.format(pump.efficiency)}</td>
            <td>{pump.powerKw === null ? "—" : numberFormat.format(pump.powerKw)}</td>
            <td>{numberFormat.format(pump.speedRpm)}</td>
            <td><MotorSupply pump={pump} /></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
