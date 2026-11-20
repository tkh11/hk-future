"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { PumpChart } from "@/cms/public-pump-selection";
import PumpPerformancePath from "@/components/ui/PumpPerformancePath";
import { curveSegmentsPath, evaluateCurve, splitCurveByIntervals, type CurveInterval, type CurveSample } from "@/lib/curve-interpolation";
import { pumpOverloadRanges } from "@/lib/pump-motor";
import { systemHeadAt, type SystemCurve } from "@/lib/pump-operating-point";
import { pumpPerformanceAt, pumpWorkingRange, type PreparedPerformanceCurve, type PumpDuty } from "@/lib/pump-selection";
import { flowUnitLabels, fromM3h, toM3h, type FlowUnit } from "@/lib/flow-units";
import css from "./pump-selection.module.css";

const format = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });
const efficiencyFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const efficiencyTicks = [0, 20, 40, 60, 80, 100];
const waterCurveLabel = "Кривая насоса на воде";
const left = 50, right = 550, top = 36, width = 626;

function axisFor(maximum: number) {
  const targetStep = maximum / 5;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const step = ([1, 2, 2.5, 5, 10].find(value => value * magnitude >= targetStep) ?? 10) * magnitude;
  const intervals = Math.ceil(maximum / step);
  return { limit: intervals * step, ticks: Array.from({ length: intervals + 1 }, (_, i) => i * step) };
}

function FlowAxis({ ticks, bottom, x, unit }: { ticks: number[]; bottom: number; x: (flow: number) => number; unit: FlowUnit }) {
  return (
    <g className={css.gridlines}>
      {ticks.map(flow => (
        <g key={flow}>
          <line x1={x(toM3h(flow, unit))} x2={x(toM3h(flow, unit))} y1={top} y2={bottom} />
          <text x={x(toM3h(flow, unit))} y={bottom + 18} textAnchor="middle">{format.format(flow)}</text>
        </g>
      ))}
      <text x={right} y={bottom + 43} textAnchor="end">Q, {flowUnitLabels[unit]}</text>
    </g>
  );
}

function ResultMarker({ x, y, label, className, diamond }: {
  x: number; y: number; label: string; className?: string; diamond?: boolean;
}) {
  return (
    <g className={className ? `${css.resultMarker} ${className}` : css.resultMarker} transform={`translate(${x},${y})`}
      tabIndex={0} role="img" aria-label={label} data-result-point>
      {diamond ? <path d="M0,-4 4,0 0,4 -4,0 Z" /> : <circle r="2.8" />}
    </g>
  );
}

type PerformanceSeries = {
  id: string;
  label: string;
  unit: string;
  legend: string;
  curve: PreparedPerformanceCurve;
  overloadRanges?: CurveInterval[];
  dashedOverload?: boolean;
  scale: ReturnType<typeof axisFor>;
  axisClass: string;
  lineClass: string;
};

function PerformanceScale({ series, points, side = "right", bottom, x, y, pointValue }: {
  series: PerformanceSeries;
  points: readonly CurveSample[];
  side?: "left" | "right";
  bottom: number;
  x: (flow: number) => number;
  y: (value: number) => number;
  pointValue?: (flow: number) => number | null;
}) {
  const { id, label, unit, legend, curve, overloadRanges, dashedOverload, scale, axisClass, lineClass } = series;
  const axisX = side === "left" ? left : right;
  const direction = side === "left" ? -1 : 1;
  const valueFormat = id === "efficiency" ? efficiencyFormat : format;
  return (
    <g className={axisClass}>
      <text x={side === "left" ? left : right + 8} y={20}>{label}, {unit}</text>
      <line x1={axisX} x2={axisX} y1={top} y2={bottom} />
      {scale.ticks.map(value => (
        <g key={value}>
          <line x1={axisX} x2={axisX + 5 * direction} y1={y(value)} y2={y(value)} />
          <text x={axisX + 8 * direction} y={y(value) + 5} textAnchor={side === "left" ? "end" : "start"}>{format.format(value)}</text>
        </g>
      ))}
      {curve.segments.length ? (
        <PumpPerformancePath className={lineClass} segments={curve.segments} overloadRanges={overloadRanges}
          dashedOverload={dashedOverload} x={x} y={y} />
      ) : (
        <circle cx={x(curve.first.x)} cy={y(curve.first.y)} r="3" />
      )}
      {points.map(point => {
        const value = pointValue ? pointValue(point.x) : pumpPerformanceAt(curve, point.x);
        return value === null ? null : <ResultMarker key={point.x} x={x(point.x)} y={y(value)}
          label={`${legend} · ${valueFormat.format(value)} ${unit}`} />;
      })}
    </g>
  );
}

function pointLabel(name: string, flow: number, head: number, unit: FlowUnit) {
  return `${name} · ${format.format(fromM3h(flow, unit))} ${flowUnitLabels[unit]} · ${format.format(head)} м`;
}

export default function PumpCurveChart({ chart, duty, system, powerAt, flowUnit = "m3h", npshLabel = "NPSHr",
  isSolution = false, manualFlow, onPickPoint, pickError }: {
  chart: PumpChart; duty: PumpDuty; system: SystemCurve; powerAt: (flow: number) => number | null; flowUnit?: FlowUnit; npshLabel?: string;
  isSolution?: boolean; manualFlow?: number; onPickPoint?: (point: CurveSample) => void; pickError?: string;
}) {
  const { curve, waterCurve, coincident, efficiencyCurve, npshCurve, powerP2Curve } = chart;
  const overloadRanges = useMemo(() => pumpOverloadRanges(powerP2Curve?.segments ?? [], chart.powerKw), [powerP2Curve, chart.powerKw]);
  const headParts = useMemo(() => isSolution && overloadRanges.length ? splitCurveByIntervals(curve.segments, overloadRanges) : null,
    [isSolution, curve.segments, overloadRanges]);
  const [hiddenCurves, setHiddenCurves] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; labels: string[] } | null>(null);
  const { minFlow, maxFlow } = pumpWorkingRange(curve);
  const bottom = 310, lowerBottom = 200;
  const performanceOptions = [
    { id: "efficiency", curve: efficiencyCurve, label: "КПД", unit: "%", legend: "КПД", axisClass: css.efficiencyAxis,
      lineClass: css.efficiencyLine, keyClass: css.efficiencyKey, scale: { limit: 100, ticks: efficiencyTicks } },
    { id: "npsh", curve: npshCurve, label: "NPSHr", unit: "м", legend: npshLabel, axisClass: css.npshAxis,
      lineClass: css.npshLine, keyClass: css.npshKey },
    { id: "power", curve: powerP2Curve, label: "P2", unit: "кВт", legend: "Мощность P2", axisClass: css.powerAxis,
      lineClass: css.powerLine, keyClass: css.powerKey, overloadRanges, dashedOverload: isSolution },
  ];
  const performance = performanceOptions.flatMap(({ curve, scale, ...series }) => curve && !hiddenCurves.includes(series.id) ? [{
    ...series, curve,
    scale: scale ?? axisFor(Math.max(0.1, curve.first.y, ...curve.segments.map(({ start, end }) => Math.max(start.y, end.y))) * 1.08),
  }] : []);
  const efficiency = performance.find(series => series.id === "efficiency");
  const lowerPerformance = performance.filter(series => series.id !== "efficiency");
  const lowerGrid = lowerPerformance.find(series => series.id === "power") ?? lowerPerformance[0];
  const headSegments = waterCurve ? [...curve.segments, ...waterCurve.segments] : curve.segments;
  const flowAxis = axisFor(fromM3h(Math.max(1, duty.flowM3h, curve.segments.at(-1)!.end.x,
    waterCurve?.segments.at(-1)?.end.x ?? 0, ...performanceOptions.map(series => series.curve?.last.x ?? 0)), flowUnit));
  const headAxis = axisFor(Math.max(1, duty.requiredHeadM, ...headSegments.map(({ start, end }) => Math.max(start.y, end.y))) * 1.08);
  const flowLimit = toM3h(flowAxis.limit, flowUnit);
  const { limit: headLimit } = headAxis;
  const x = (flow: number) => left + flow / flowLimit * (right - left);
  const scaleY = (limit: number, axisBottom: number) => (value: number) => axisBottom - value / limit * (axisBottom - top);
  const y = scaleY(headLimit, bottom);
  const pump = curveSegmentsPath(curve.segments, x, y);
  const solidHead = headParts ? curveSegmentsPath(headParts.outside, x, y) : pump;
  const lastSystemFlow = manualFlow ?? (system.coefficient > 0
    ? Math.min(flowLimit, Math.sqrt((headLimit - system.staticHeadM) / system.coefficient)) : flowLimit);
  const targetX = x(duty.flowM3h), targetY = y(duty.requiredHeadM);
  const points = coincident ? [] : chart.points;
  const singleFlowHead = minFlow === maxFlow ? evaluateCurve(curve.segments, minFlow) : null;
  const firstFlow = curve.segments[0].start.x, lastFlow = curve.segments.at(-1)!.end.x;
  const constrainFlow = (flow: number) => Math.max(firstFlow, Math.min(flow, lastFlow));
  const selectedFlow = constrainFlow(points[0]?.x ?? duty.flowM3h);
  function pickFlow(flow: number) {
    const x = constrainFlow(flow);
    const head = evaluateCurve(curve.segments, x);
    if (head !== null) {
      setTooltip(null);
      onPickPoint?.({ x, y: head });
    }
  }

  const showTooltip = (markers: SVGElement[], x: number, y: number) => {
    const labels = [...new Set(markers.map(marker => marker.getAttribute("aria-label")!))];
    setTooltip(labels.length ? { x, y, labels } : null);
  };

  return (
    <figure id="pump-graph" className={css.graph}>
      <figcaption>
        <h3>Характеристика {chart.name}</h3>
      </figcaption>
      <div className={css.curveControls} role="group" aria-label="Кривые на графике">
        {performanceOptions.map(series => (
          <label key={series.id}>
            <input
              type="checkbox"
              checked={series.curve !== null && !hiddenCurves.includes(series.id)}
              disabled={series.curve === null}
              onChange={event => {
                const { checked } = event.currentTarget;
                setHiddenCurves(hidden => checked ? hidden.filter(id => id !== series.id) : [...hidden, series.id]);
              }}
            />
            <span className={series.keyClass} aria-hidden="true" />
            {series.legend}
          </label>
        ))}
      </div>
      {pickError && <p className={css.error} role="alert">{pickError}</p>}
      <div className={css.plot} tabIndex={0} role="region" aria-label="График характеристик"
        onPointerMove={event => {
          const { target, clientX, clientY } = event;
          const svg = target instanceof SVGElement ? target.closest("svg") : null;
          const markers = [...svg?.querySelectorAll<SVGElement>("[data-result-point]") ?? []].filter(marker => {
            const bounds = marker.getBoundingClientRect();
            return Math.hypot(clientX - (bounds.left + bounds.width / 2), clientY - (bounds.top + bounds.height / 2)) <= 10;
          });
          showTooltip(markers, clientX, clientY);
        }}
        onPointerLeave={() => setTooltip(null)} onScroll={() => setTooltip(null)}
        onFocus={event => {
          const { target } = event;
          if (!(target instanceof SVGElement) || !target.hasAttribute("data-result-point")) return;
          const bounds = target.getBoundingClientRect();
          showTooltip([target], bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        }}
        onBlur={() => setTooltip(null)}
        onKeyDown={event => { if (event.key === "Escape") setTooltip(null); }}>
        <svg viewBox={`0 0 ${width} 360`} role="group"
          aria-label={`Кривые насоса ${chart.name} и системы${efficiency ? ", КПД" : ""}`}>
          <defs>
            <clipPath id="pump-working-zone"><rect x={x(minFlow)} y={top} width={x(maxFlow) - x(minFlow)} height={bottom - top} /></clipPath>
          </defs>
          <text x={left} y={20}>H, м</text>
          <g className={css.gridlines}>
            {headAxis.ticks.map(head => (
              <g key={head}>
                <line x1={left} x2={right} y1={y(head)} y2={y(head)} />
                <text x={left - 6} y={y(head) + 4} textAnchor="end">{format.format(head)}</text>
              </g>
            ))}
          </g>
          <FlowAxis ticks={flowAxis.ticks} bottom={bottom} x={x} unit={flowUnit} />
          {[...new Set([minFlow, maxFlow])].map(flow => (
            <line key={flow} className={css.workingLimit} x1={x(flow)} x2={x(flow)} y1={top} y2={bottom} />
          ))}
          <path className={css.pumpOutside} d={solidHead} />
          <path className={css.pumpLine} clipPath="url(#pump-working-zone)" d={solidHead} />
          {headParts && headParts.inside.length > 0 &&
            <path className={css.pumpOutside} d={curveSegmentsPath(headParts.inside, x, y)} strokeDasharray="5 3" />}
          {waterCurve && <path className={css.waterPumpLine} d={curveSegmentsPath(waterCurve.segments, x, y)}
            role="img" aria-label={waterCurveLabel} />}
          {singleFlowHead !== null ? <circle className={css.availableMarker} cx={x(minFlow)} cy={y(singleFlowHead)} r="3" /> : null}
          <path className={css.systemLine} d={`M${x(0)},${y(system.staticHeadM)} Q${x(lastSystemFlow / 2)},${y(system.staticHeadM)} ${x(lastSystemFlow)},${y(systemHeadAt(system, lastSystemFlow))}`} />
          {efficiency && (
            <PerformanceScale series={efficiency} points={points} bottom={bottom} x={x} y={scaleY(efficiency.scale.limit, bottom)} />
          )}
          {manualFlow === undefined && <ResultMarker x={targetX} y={targetY} className={css.targetMarker} diamond
            label={pointLabel("Расчетная точка", duty.flowM3h, duty.requiredHeadM, flowUnit)} />}
          {points.map(point => <ResultMarker key={point.x} x={x(point.x)} y={y(point.y)} className={css.intersectionMarker}
            label={pointLabel("Фактическая рабочая точка", point.x, point.y, flowUnit)} />)}
          {onPickPoint && <path d={pump} fill="none" stroke="none" strokeWidth="14" pointerEvents="stroke"
            data-point-picker="" className={css.pointPicker} tabIndex={0} role="slider"
            aria-label="Выбрать рабочую точку на кривой Q–H"
            aria-valuemin={fromM3h(firstFlow, flowUnit)} aria-valuemax={fromM3h(lastFlow, flowUnit)}
            aria-valuenow={fromM3h(selectedFlow, flowUnit)}
            aria-valuetext={`${format.format(fromM3h(selectedFlow, flowUnit))} ${flowUnitLabels[flowUnit]}`}
            onClick={event => {
              const matrix = event.currentTarget.getScreenCTM();
              if (!matrix) return;
              const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
              pickFlow((position.x - left) / (right - left) * flowLimit);
            }}
            onKeyDown={event => {
              const step = (lastFlow - firstFlow) / 100;
              const flows: Record<string, number> = { ArrowLeft: selectedFlow - step, ArrowDown: selectedFlow - step,
                ArrowRight: selectedFlow + step, ArrowUp: selectedFlow + step, Home: firstFlow, End: lastFlow };
              if (!(event.key in flows)) return;
              event.preventDefault();
              pickFlow(flows[event.key]);
            }}>
            <title>Выбрать рабочую точку на кривой Q–H</title>
          </path>}
        </svg>
        {lowerGrid && (
          <svg viewBox={`0 0 ${width} 250`} role="group" aria-label={lowerPerformance.map(series => series.legend).join(", ")}>
            <g className={css.gridlines}>
              {lowerGrid.scale.ticks.map(value => {
                const position = scaleY(lowerGrid.scale.limit, lowerBottom)(value);
                return <line key={value} x1={left} x2={right} y1={position} y2={position} />;
              })}
            </g>
            <FlowAxis ticks={flowAxis.ticks} bottom={lowerBottom} x={x} unit={flowUnit} />
            {lowerPerformance.map(series => (
              <PerformanceScale key={series.id} series={series} points={points}
                side={series.id === "power" ? "left" : "right"} bottom={lowerBottom} x={x}
                y={scaleY(series.scale.limit, lowerBottom)}
                pointValue={series.id === "power" ? powerAt : undefined} />
            ))}
          </svg>
        )}
      </div>
      <ul className={css.graphLegend}>
        <li><span className={css.pumpKey} aria-hidden="true" />Кривая насоса</li>
        {waterCurve && <li>
          <svg viewBox="0 0 26 8" height="8" aria-hidden="true">
            <line className={css.waterPumpLine} x1="1.5" x2="24.5" y1="4" y2="4" />
          </svg>
          {waterCurveLabel}
        </li>}
        <li><span className={css.systemKey} aria-hidden="true" />Кривая системы</li>
        {performance.map(series => (
          <li key={series.id}>
            <svg className={series.axisClass} viewBox="0 0 26 8" height="8" aria-hidden="true">
              <line className={series.lineClass} x1="1.5" x2="24.5" y1="4" y2="4" />
            </svg>
            {series.legend}, {series.unit}
          </li>
        ))}
      </ul>
      {tooltip && createPortal(
        <div className={css.pointTooltip} role="tooltip" style={{
          left: tooltip.x,
          top: tooltip.y,
          transform: `translate(${tooltip.x > window.innerWidth / 2 ? "calc(-100% - 12px)" : "12px"}, ${tooltip.y > window.innerHeight / 2 ? "calc(-100% - 12px)" : "12px"})`,
        }}>
          {tooltip.labels.map(label => <div key={label}>{label}</div>)}
        </div>, document.body,
      )}
    </figure>
  );
}
