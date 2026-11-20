'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, ReactNode } from 'react';
import type { CurvePoint } from '@/cms/pump-curve';
import { curvePoints } from '@/cms/pump-curve';
import { smoothCurvePath } from '@/lib/curve-interpolation';
import { flowUnitLabels, fromM3h, toM3h, type FlowUnit } from '@/lib/flow-units';
import type { PumpSelectionEditorData } from '../pump-selection-data';
import type { PumpSelectionValues } from '@/cms/pump-selection-values';
import f from './form.module.css';
import ui from './ui.module.css';
import css from './PumpCurve.module.css';

type Curve = PumpSelectionValues['curve'];
type SharedModeField = { inherited: boolean; value: number | null; toggle: ReactNode };
type Row = { key: number; flow: string; head: string; unit: FlowUnit };
const display = (n: number) => String(n).replace('.', ',');
function number(text: string) {
  const value = text.trim().replace(',', '.');
  const parsed = Number(value);
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(parsed) ? parsed : NaN;
}

function toRows(points: CurvePoint[]): Row[] {
  return points.map((p, key) => ({ key, flow: display(p.flow), head: display(p.head), unit: 'm3h' }));
}
function toPoints(rows: Row[]): CurvePoint[] {
  return rows.map(row => ({ flow: toM3h(number(row.flow), row.unit), head: number(row.head) }));
}

function CurveGraph({ points, model, flowUnit }: { points: CurvePoint[]; model: string; flowUnit: FlowUnit }) {
  const width = 420, height = 250, left = 45, right = 32, top = 30, bottom = 46;
  const pw = width - left - right, ph = height - top - bottom;
  const maxFlow = Math.max(...points.map(p => p.flow), 1);
  const maxHead = Math.max(...points.map(p => p.head), 1);
  const x = (q: number) => left + pw * (q / maxFlow);
  const y = (h: number) => top + ph * (1 - h / maxHead);
  const path = smoothCurvePath(points.map(p => ({ x: p.flow, y: p.head })), x, y);
  return <svg className={css.graph} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Напор от расхода, ${model}. Значения приведены в таблице.`}>
    <text x={left} y={16}>H, м</text>
    {[0, 0.25, 0.5, 0.75, 1].map(part => <g key={part}>
      <line className={css.gridline} x1={left} x2={width-right} y1={y(part*maxHead)} y2={y(part*maxHead)} />
      <text x={left-6} y={y(part*maxHead)+4} textAnchor="end">{display(+(part*maxHead).toFixed(2))}</text>
      <line className={css.gridline} x1={x(part*maxFlow)} x2={x(part*maxFlow)} y1={top} y2={height-bottom}/>
      <text x={x(part*maxFlow)} y={height-bottom+17} textAnchor="middle">{display(+fromM3h(part*maxFlow, flowUnit).toPrecision(4))}</text>
    </g>)}
    <text x={width-right} y={height-3} textAnchor="end">Q, {flowUnitLabels[flowUnit]}</text>
    <path className={css.line} d={path} />
    {points.map(p => <circle key={p.flow} className={css.point} cx={x(p.flow)} cy={y(p.head)} r="3">
      <title>{`${display(+fromM3h(p.flow, flowUnit).toPrecision(12))} ${flowUnitLabels[flowUnit]} · ${display(p.head)} м`}</title>
    </circle>)}
  </svg>;
}

export default function PumpCurveEditor({ curve, source, model, flowUnit = 'm3h', sharedMode, onApply, onDirtyChange }: {
  curve: Curve;
  source: PumpSelectionEditorData['curveSource'];
  model: string;
  flowUnit?: FlowUnit;
  sharedMode?: { speedRpm: SharedModeField; frequencyHz: SharedModeField };
  onApply: (value: Curve) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [rows, setRows] = useState(() => toRows(curve.points));
  const nextKey = useRef(rows.length);
  const [rpm, setRpm] = useState(String(curve.speedRpm ?? ''));
  const [hz, setHz] = useState(String(curve.frequencyHz ?? ''));
  const [amps, setAmps] = useState(String(curve.nominalCurrentA ?? '').replace('.', ','));
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const points = toPoints(rows);
  const valid = curvePoints.safeParse(points).success;
  const validMode = (sharedMode?.speedRpm.inherited || !rpm.trim() || (Number.isInteger(number(rpm)) && number(rpm) > 0))
    && (sharedMode?.frequencyHz.inherited || !hz.trim() || number(hz) > 0)
    && (!amps.trim() || number(amps) >= 0);
  const mark = () => {
    setDirty(true);
    onDirtyChange(true);
    setNotice('Изменения Q–H ещё не применены.');
  };
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);
  function update(key: number, col: 'flow' | 'head', value: string) {
    setRows(list => list.map(row => row.key === key ? { ...row, [col]: value, unit: col === 'flow' ? flowUnit : row.unit } : row));
    mark();
  }
  function paste(e: ClipboardEvent<HTMLInputElement>, index: number) {
    const text = e.clipboardData.getData('text').trim();
    if (!text.includes('\t')) return;
    e.preventDefault();
    const cells = text.split(/\r?\n/).map(line => line.split('\t'));
    if (cells.some(row => row.length !== 2 || row.some(v => !Number.isFinite(number(v)))) || index + cells.length > 200) {
      setNotice('Вставьте два числовых столбца: расход и напор (до 200 строк).'); return;
    }
    const inserted = cells.map(([flow, head]) => ({ key: nextKey.current++, flow, head, unit: flowUnit }));
    setRows(list => [...list.slice(0, index), ...inserted, ...list.slice(index+inserted.length)]);
    mark();
  }
  function apply() {
    onApply({
      points,
      speedRpm: sharedMode?.speedRpm.inherited ? curve.speedRpm : rpm.trim() ? number(rpm) : null,
      frequencyHz: sharedMode?.frequencyHz.inherited ? curve.frequencyHz : hz.trim() ? number(hz) : null,
      nominalCurrentA: amps.trim() ? number(amps) : null,
    });
    setDirty(false);
    onDirtyChange(false);
    setNotice('');
  }
  return <fieldset className={css.editor}>
    <legend className="visually-hidden">{model}</legend>
    {source.workbook && <p className={f.hint}>Исходная таблица {source.workbook.filename} · {source.workbook.sheet}</p>}
    <div className={f.grid}>
      {([
        ['Частота вращения, об/мин', rpm, setRpm, sharedMode?.speedRpm],
        ['Частота питания, Гц', hz, setHz, sharedMode?.frequencyHz],
        ['Номинальный ток, А', amps, setAmps, undefined],
      ] as const).map(([label, value, set, shared]) => <div className={f.field} key={label}>
        <label className={f.field}>
          <span className={f.label}>{label}</span>
          <input className={f.input} inputMode="decimal" value={shared?.inherited ? shared.value ?? '' : value}
            readOnly={shared?.inherited} onChange={e => {set(e.target.value); mark();}} />
        </label>
        {shared?.toggle}
      </div>)}
    </div>
    {!validMode && <p className={f.error}>Проверьте частоту питания, частоту вращения и номинальный ток.</p>}
    <div className={css.layout}>
      <div className={css.tableScroll}><table className={css.table} aria-label={`Точки Q–H ${model}`}>
        <thead><tr><th>Q, {flowUnitLabels[flowUnit]}</th><th>H, м</th><th><span className="visually-hidden">Действия</span></th></tr></thead>
        <tbody>{rows.map((row, i) => <tr key={row.key}>{(['flow','head'] as const).map(col => <td key={col}>
          <input className={f.input} inputMode="decimal" aria-label={`${col === 'flow' ? 'Расход' : 'Напор'}, точка ${i+1}`}
            value={col === 'flow' && row.unit !== flowUnit && Number.isFinite(number(row.flow))
              ? display(+fromM3h(toM3h(number(row.flow), row.unit), flowUnit).toPrecision(12)) : row[col]}
            onChange={e => update(row.key,col,e.target.value)} onPaste={e => paste(e,i)} />
        </td>)}<td><button type="button" className={css.remove} aria-label={`Удалить точку ${i+1}`}
          onClick={() => {setRows(rows.filter(r => r.key !== row.key)); mark();}}>×</button></td></tr>)}</tbody>
      </table></div>
      {valid ? <figure className={css.figure}>
        <CurveGraph points={points} model={model} flowUnit={flowUnit} />
      </figure> : <p className={f.error}>Проверьте точки кривой: нужны минимум две точки с неотрицательными значениями в порядке возрастания расхода.</p>}
    </div>
    <div className={f.actions}><button type="button" className={ui.button} disabled={rows.length>=200}
      onClick={() => {setRows([...rows,{ key: nextKey.current++, flow:'', head:'', unit:flowUnit }]); mark();}}>Добавить точку</button>
    </div>
    <div className={f.actions}>
      <button type="button" className={ui.button} disabled={!valid || !validMode || !dirty} onClick={apply}>Применить точки Q–H</button>
      {notice && <span className={f.hint} role="status">{notice}</span>}
    </div>
  </fieldset>;
}
