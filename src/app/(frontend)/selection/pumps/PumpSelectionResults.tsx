"use client";

import { useState, type FormEvent } from "react";
import type { selectPublicPumps } from "@/cms/public-pump-selection";
import { evaluateCurve, type CurveSample } from "@/lib/curve-interpolation";
import { flowUnitLabels, fromM3h, parseFlowUnit, toM3h, type FlowUnit } from "@/lib/flow-units";
import { checkPumpCandidate } from "@/lib/pump-candidates";
import { readPumpDecimal } from "@/lib/pump-input";
import { checkPumpMotor, hasPumpMotorReserve } from "@/lib/pump-motor";
import { createSystemCurve, findPumpIntersections, type SystemCurve } from "@/lib/pump-operating-point";
import { isPumpFlowOptimal, preparePumpPowerP2, pumpPerformanceAt, pumpPowerP2At, type PumpDuty } from "@/lib/pump-selection";
import { pumpSystemTypes, type PumpSystemType } from "@/lib/pump-system-types";
import { getPumpTechnicalData } from "@/lib/pump-technical-data";
import FlowRateField from "./FlowRateField";
import PumpCurveChart from "./PumpCurveChart";
import PumpResultDetails from "./PumpResultDetails";
import type { PumpResultQuery } from "./PumpResultsTable";
import PumpTechnicalData from "./PumpTechnicalData";
import css from "./pump-selection.module.css";

type PointRow = [label: string, value: number | null, unit: string, decimals?: number];
type ResultRow = [label: string, value: string];
const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
function formatPoints(rows: PointRow[], unitsOnRight = false): ResultRow[] {
  return rows.map(([label, value, unit, decimals = 3]) => {
    const formatted = value === null ? "—" : (decimals === 3 ? numberFormat
      : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: decimals })).format(value);
    return unitsOnRight ? [label, value === null ? formatted : `${formatted} ${unit}`] : [`${label}, ${unit}`, formatted];
  });
}
function PointValues({ rows }: { rows: ResultRow[] }) {
  return <dl className={css.pointValues}>{rows.map(([label, value]) => (
    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
  ))}</dl>;
}

export default function PumpSelectionResults({ results, duty, system, flowUnit, query }: {
  results: Awaited<ReturnType<typeof selectPublicPumps>>;
  duty: PumpDuty & { system: PumpSystemType };
  system: SystemCurve;
  flowUnit: FlowUnit;
  query: PumpResultQuery;
}) {
  const [current, setCurrent] = useState({ duty, system, flowUnit });
  const [manual, setManual] = useState<{ point: CurveSample; system: SystemCurve } | null>(null);
  const [pickError, setPickError] = useState("");
  const [error, setError] = useState("");
  const { chart: base, fluid } = results;
  const { densityKgM3 } = fluid;
  const npshLabel = fluid.kind === "water" ? "NPSHr" : "NPSHr (вода)";
  const activeSystem = manual?.system ?? current.system;
  const activeDuty = manual ? { flowM3h: manual.point.x, requiredHeadM: manual.point.y } : current.duty;
  const intersections = manual ? { points: [manual.point], coincident: false }
    : base ? findPumpIntersections(base.curve, activeSystem) : { points: [], coincident: false };
  const point = intersections.points[0];
  const availableHead = base ? evaluateCurve(base.curve.segments, activeDuty.flowM3h) : null;
  const powerAt = (flow: number) => base ? pumpPowerP2At(base.curve, base.efficiencyCurve, flow, densityKgM3) : null;
  const candidate = base ? checkPumpCandidate(base.curve, activeDuty, activeSystem, intersections) : null;
  const meetsDuty = candidate?.status === "suitable" && !!base && hasPumpMotorReserve(powerAt(candidate.point.x), base.powerKw);
  const chart = base && {
    ...base, ...intersections,
    headMarginM: availableHead === null ? 0 : availableHead - activeDuty.requiredHeadM,
    meetsDuty,
    efficiency: point ? pumpPerformanceAt(base.efficiencyCurve, point.x) : null,
    optimal: meetsDuty && isPumpFlowOptimal(base.efficiencyCurve, candidate.point.x),
    powerP2Curve: preparePumpPowerP2(base.curve, base.efficiencyCurve, intersections.points.map(p => p.x), densityKgM3),
  };
  const designRows: PointRow[] = [
    ["Расход", fromM3h(current.duty.flowM3h, current.flowUnit), flowUnitLabels[current.flowUnit]],
    ["Напор", current.duty.requiredHeadM, "м"],
  ];
  const systemRows: ResultRow[] = [
    ...formatPoints([["Статический напор", activeSystem.staticHeadM, "м"]], true),
    ["Тип системы", pumpSystemTypes[duty.system]],
  ];
  function actualRows(p: { x: number; y: number }, unitsOnRight = false): ResultRow[] {
    if (!chart) return [];
    const power = powerAt(p.x);
    const motor = checkPumpMotor(power, chart.powerKw);
    const rows = formatPoints([
      ["Расход фактический", fromM3h(p.x, current.flowUnit), flowUnitLabels[current.flowUnit]],
      ["Напор фактический", p.y, "м"],
      ["КПД", pumpPerformanceAt(chart.efficiencyCurve, p.x), "%", 1],
      ["Мощность P2", power, "кВт"],
    ], unitsOnRight);
    if (motor !== "ok") rows.push(["Проверка двигателя", motor === "overload" ? "Перегрузка" : "Не проверено"]);
    else if (!hasPumpMotorReserve(power, chart.powerKw)) rows.push(["Проверка двигателя", "Недостаточный запас мощности"]);
    if (manual && (p.x < chart.curve.flowMinM3h || p.x > chart.curve.flowMaxM3h)) {
      rows.push(["Рабочий диапазон", "Расход вне рабочего диапазона"]);
    }
    return rows.concat(formatPoints([[npshLabel, pumpPerformanceAt(chart.npshCurve, p.x), "м"]], unitsOnRight));
  }

  function pickPoint(p: CurveSample) {
    const nextSystem = createSystemCurve({ flowM3h: p.x, requiredHeadM: p.y }, current.system.staticHeadM);
    if (!nextSystem) {
      setPickError(p.x <= 0 ? "Выберите точку с расходом больше нуля." : "Напор выбранной точки ниже статического.");
      return;
    }
    setPickError("");
    setManual({ point: p, system: nextSystem });
  }

  function rebuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "");
    const unit = parseFlowUnit(value("flowUnit"));
    const flow = readPumpDecimal(value("flow"));
    const head = readPumpDecimal(value("head"));
    const staticHead = value("staticHead").trim() ? readPumpDecimal(value("staticHead")) : 0;
    if (flow === null || flow <= 0 || !Number.isFinite(toM3h(flow, unit))) {
      setError("Введите расход больше 0."); return;
    }
    if (head === null) { setError("Введите напор числом от 0."); return; }
    if (staticHead === null || staticHead > head) {
      setError("Статический напор должен быть от 0 до расчётного напора."); return;
    }
    const nextDuty = { ...duty, flowM3h: toM3h(flow, unit), requiredHeadM: head };
    const nextSystem = createSystemCurve(nextDuty, staticHead);
    if (!nextSystem) { setError("Проверьте расход и напор."); return; }
    setCurrent({ duty: nextDuty, system: nextSystem, flowUnit: unit });
    setPickError("");
    setError("");
  }

  return <>
    <div className={css.resultPoints}>
      <section className={css.pointCard} aria-labelledby="design-point-title" hidden={!!manual}>
        <h3 id="design-point-title"><span className={css.targetKey} aria-hidden="true" />Расчетная точка</h3>
        {chart ? <form className={css.pointForm} aria-label="Изменить рабочую точку" onSubmit={rebuild} noValidate autoComplete="off">
          <FlowRateField id="rebuild-flow" defaultValue={query.flow} defaultUnit={flowUnit} inline />
          <div className={`${css.field} ${css.pointField}`}>
            <label htmlFor="rebuild-head">Напор, м</label>
            <input id="rebuild-head" name="head" aria-label="Расчётный напор, м" inputMode="decimal"
              defaultValue={String(duty.requiredHeadM)} maxLength={64} required />
          </div>
          <div className={`${css.field} ${css.pointField}`}>
            <label htmlFor="rebuild-static">Статический напор, м</label>
            <input id="rebuild-static" name="staticHead" inputMode="decimal"
              defaultValue={String(system.staticHeadM)} maxLength={64} />
          </div>
          {error && <p className={css.error} role="alert">{error}</p>}
          <button className={css.submit} type="submit">Перестроить</button>
        </form> : <PointValues rows={formatPoints(designRows)} />}
      </section>
      <section className={css.pointCard} aria-labelledby="working-point-title">
        <h3 id="working-point-title"><span className={css.intersectionKey} aria-hidden="true" />{intersections.points.length > 1 ? "Фактические рабочие точки" : "Фактическая рабочая точка"}</h3>
        {chart && intersections.points.length ? intersections.points.map(p => <PointValues key={p.x} rows={actualRows(p)} />)
          : <p>{intersections.coincident ? "Не определяется однозначно" : "Не найдена"}</p>}
        {manual && <button type="button" className={css.restorePoint} onClick={() => { setManual(null); setPickError(""); }}>
          Вернуть расчётную точку
        </button>}
      </section>
    </div>
    {!results.hasData ? <p className={css.message}>Для подбора пока нет опубликованных насосов с рабочими характеристиками.</p>
      : chart ? <PumpResultDetails
        chart={<PumpCurveChart chart={chart} duty={activeDuty} system={activeSystem} powerAt={powerAt}
          manualFlow={manual?.point.x} onPickPoint={pickPoint} pickError={pickError} isSolution={fluid.kind !== "water"}
          flowUnit={current.flowUnit} npshLabel={npshLabel} />}
        technicalData={<PumpTechnicalData chart={chart} specification={results.specification} flowUnit={current.flowUnit} />}
        sheet={{ name: chart.name, sku: chart.sku,
          design: manual ? [] : [...formatPoints(designRows, true), ...systemRows],
          actual: [...intersections.points.flatMap(p => actualRows(p, true)), ...(manual ? systemRows : [])],
          technical: getPumpTechnicalData(chart, results.specification, current.flowUnit, fluid),
        }}
        table={{ pumps: results.operating.map(p => p.sku === chart.sku ? chart : p), selectedSku: chart.sku, query }} />
        : <p className={css.message}>Подходящих насосов нет.</p>}
  </>;
}
