'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import PumpPerformancePath from '@/components/ui/PumpPerformancePath';
import { performancePointsSchema, pumpFluidLimitsSchema, selectionMediaFields, selectionNumberFields, selectionSections, selectionTextFields, type PumpFluidLimit, type PumpSelectionData } from '@/cms/pump-selection-data';
import { pumpGroupPath } from '@/cms/pump-selection-groups';
import { pumpSharedFieldDefinitions, resolvePumpCharacteristics, type PumpSharedField } from '@/cms/pump-shared-characteristics';
import { interpolateCurve, type CurveSample, type CurveSegment } from '@/lib/curve-interpolation';
import { defaultPumpFluid, pumpFluidLabels, pumpGlycolKinds } from '@/lib/pump-fluid';
import { pumpOverloadRanges } from '@/lib/pump-motor';
import { preparePumpCurve, preparePumpEfficiency, preparePumpPowerP2 } from '@/lib/pump-selection';
import { pumpSystemTypes, type PumpSystemType } from '@/lib/pump-system-types';
import { flowUnitLabels, fromM3h, parseFlowUnit, toM3h, type FlowUnit } from '@/lib/flow-units';
import type { PumpSelectionValues } from '@/cms/pump-selection-values';
import type { PumpSelectionEditorData } from '../pump-selection-data';
import { changePumpSelectionPublication, savePumpSelection } from '../pump-selection-actions';
import type { FieldError } from '../errors';
import MediaPicker, { type MediaChoice } from './MediaPicker';
import PumpCurveEditor from './PumpCurveEditor';
import { SaveError, SaveStatus, Toc } from './editor/parts';
import { useDraft } from './editor/useDraft';
import css from './editor/Editor.module.css';
import graph from './PumpCurve.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

type Props = { data: PumpSelectionEditorData; canPublish: boolean; breadcrumbs: ReactNode };
const toc = [
  { id: 's-selection', title: 'Данные для подбора' },
  { id: 's-datasheet', title: 'Данные для техлиста' },
];
const systemTypes = Object.keys(pumpSystemTypes) as PumpSystemType[];
const technicalSection = 'Технические данные';
const performanceFields = [['flow', 'Q'], ['efficiency', 'КПД, %'], ['npsh', 'NPSHr, м']] as const;
const selectionImageFields = selectionMediaFields.filter(field => field.key !== 'sourcePdf');
type Performance = PumpSelectionData['performancePoints'];
type Series = { label: string; color: string; points: CurveSample[]; segments?: readonly CurveSegment[]; ratedPowerKw?: number | null };
type PerformanceRow = Record<'flow' | 'efficiency' | 'powerP2' | 'npsh', string> & { unit: FlowUnit };
const fluidRangeFields = [
  ['temperatureMinC', 'Температура от, °C', -273.15, undefined],
  ['temperatureMaxC', 'Температура до, °C', -273.15, undefined],
  ['concentrationMinPct', 'Концентрация от, % масс.', 0, 60],
  ['concentrationMaxPct', 'Концентрация до, % масс.', 0, 60],
] as const;
type FluidLimitRow = { kind: PumpFluidLimit['kind'] } & Record<typeof fluidRangeFields[number][0], string>;
type SharedField = (typeof pumpSharedFieldDefinitions)[number];

function FluidLimitsEditor({ initial, temperatureMinC, temperatureMaxC, onApply, onDirtyChange }: {
  initial: PumpFluidLimit[];
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  onApply: (limits: PumpFluidLimit[]) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [rows, setRows] = useState<FluidLimitRow[]>(() => initial.map(row => ({
    kind: row.kind, temperatureMinC: String(row.temperatureMinC), temperatureMaxC: String(row.temperatureMaxC),
    concentrationMinPct: String(row.concentrationMinPct ?? ''), concentrationMaxPct: String(row.concentrationMaxPct ?? ''),
  })));
  const [dirty, setDirty] = useState(false);
  const mark = (value: boolean) => { setDirty(value); onDirtyChange(value); };
  const updateRows = (next: FluidLimitRow[]) => { setRows(next); mark(true); };
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const parseNumber = (value: string) => value === '' ? null : Number(value);
  const parsed = pumpFluidLimitsSchema.safeParse(rows.map(row => ({
    kind: row.kind, temperatureMinC: parseNumber(row.temperatureMinC), temperatureMaxC: parseNumber(row.temperatureMaxC),
    concentrationMinPct: parseNumber(row.concentrationMinPct), concentrationMaxPct: parseNumber(row.concentrationMaxPct),
  })));
  return <>
    <div className={css.checks}>{pumpGlycolKinds.map(kind => <label key={kind} className={f.check}>
      <input type="checkbox" checked={rows.some(row => row.kind === kind)} onChange={e => updateRows(e.target.checked ? [...rows, {
        kind, temperatureMinC: String(temperatureMinC ?? ''), temperatureMaxC: String(temperatureMaxC ?? ''),
        concentrationMinPct: '', concentrationMaxPct: '',
      }] : rows.filter(row => row.kind !== kind))} /> {pumpFluidLabels[kind]}
    </label>)}</div>
    {rows.map(row => <fieldset className={css.tile} key={row.kind}>
      <legend>{pumpFluidLabels[row.kind]}</legend>
      <div className={css.row}>
        {fluidRangeFields.map(([key, label, min, max]) => <label key={key} className={f.field}>
          <span className={f.label}>{label}</span>
          <input type="number" step="any" className={f.input} min={min} max={max} value={row[key]}
            onChange={e => updateRows(rows.map(item => item.kind === row.kind ? { ...item, [key]: e.target.value } : item))} />
        </label>)}
      </div>
    </fieldset>)}
    {dirty && <div className={f.actions}>
      <button type="button" className={ui.button} disabled={!parsed.success} onClick={() => {
        if (parsed.success) { onApply(parsed.data); mark(false); }
      }}>Применить допуски</button>
      {!parsed.success && <span className={f.error} role="status">Проверьте диапазоны температуры и концентрации.</span>}
    </div>}
  </>;
}

function PerformanceGraph({ series, maxFlow, minFlow, flowUnit }: { series: Series[]; maxFlow: number; minFlow: number; flowUnit: FlowUnit }) {
  const axes = series.filter(item => item.points.length >= 2);
  if (!axes.length) return null;
  const left = 52, right = 448, top = 32, bottom = 197;
  const x = (flow: number) => left + flow / maxFlow * (right - left);
  const y = (fraction: number) => bottom - fraction * (bottom - top);
  const fractions = [0, 0.25, 0.5, 0.75, 1];
  const format = (value: number) => value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  const formatFlow = (value: number) => fromM3h(value, flowUnit).toLocaleString('ru-RU', { maximumSignificantDigits: 4 });
  return <figure className={graph.figure}>
    <svg className={graph.graph} viewBox="0 0 500 235" role="img" aria-label={axes.map(item => item.label).join(' и ') + ' от расхода'}>
      {minFlow > 0 && <rect x={left} y={top} width={x(minFlow) - left} height={bottom - top} fill="currentColor" opacity="0.09" />}
      {fractions.map(fraction => <g key={fraction} className={graph.gridline}>
        <path fill="none" d={`M${left} ${y(fraction)}H${right} M${x(fraction * maxFlow)} ${top}V${bottom}`} />
        <text stroke="none" x={x(fraction * maxFlow)} y={bottom + 16} textAnchor="middle">{formatFlow(fraction * maxFlow)}</text>
      </g>)}
      <text x={right} y={231} textAnchor="end">Q, {flowUnitLabels[flowUnit]}</text>
      {axes.map(({ label, color, points, segments, ratedPowerKw }, index) => {
        const peak = Math.max(0.01, ...points.map(point => point.y));
        const magnitude = 10 ** Math.floor(Math.log10(peak));
        const max = Math.ceil(peak / magnitude * 2) * magnitude / 2;
        const scale = (value: number) => y(value / max);
        const curveSegments = segments ?? interpolateCurve(points);
        return <g key={label}>
          <text x={index === 0 ? left : right} y={19} textAnchor={index === 0 ? 'start' : 'end'} style={{ fill: color }}>{label}</text>
          {fractions.map(fraction => <text key={fraction} x={index === 0 ? left - 7 : right + 7} y={y(fraction) + 4}
            textAnchor={index === 0 ? 'end' : 'start'}>{format(fraction * max)}</text>)}
          <PumpPerformancePath className={graph.line} color={color} overloadRanges={pumpOverloadRanges(curveSegments, ratedPowerKw ?? null)}
            segments={curveSegments} x={x} y={scale} />
          {points.map(point => <circle key={point.x} cx={x(point.x)} cy={scale(point.y)} r="2.4" fill={color}>
            <title>{`Q ${formatFlow(point.x)} ${flowUnitLabels[flowUnit]} · ${label} ${format(point.y)}`}</title>
          </circle>)}
        </g>;
      })}
    </svg>
  </figure>;
}

function PerformanceEditor({ initial, onChange, onDirtyChange, head, minFlow, maxFlow, flowUnit, ratedPowerKw }: {
  initial: Performance;
  onChange: (rows: Performance) => void;
  onDirtyChange: (dirty: boolean) => void;
  head: CurveSample[];
  minFlow: number;
  maxFlow: number;
  flowUnit: FlowUnit;
  ratedPowerKw: number | null;
}) {
  const [rows, setRows] = useState<PerformanceRow[]>(() => initial.map(row => ({
    flow: String(row.flow), efficiency: String(row.efficiency ?? ''),
    powerP2: String(row.powerP2 ?? ''), npsh: String(row.npsh ?? ''), unit: 'm3h',
  })));
  const [dirty, setDirty] = useState(false);
  const mark = (value: boolean) => { setDirty(value); onDirtyChange(value); };
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const parsed = performancePointsSchema.safeParse(rows.map(({ unit, ...row }) => Object.fromEntries(Object.entries(row).map(([key,value]) => {
    const numeric = value.trim() === '' ? key === 'flow' ? NaN : null : Number(value.replace(',', '.'));
    return [key, key === 'flow' ? toM3h(numeric as number, unit) : numeric];
  }))));
  const series = (key: 'efficiency' | 'npsh', label: string, color: string): Series => ({
    label, color,
    points: (parsed.data ?? []).flatMap(point => point[key] === null ? [] : [{ x: point.flow, y: point[key] }]),
  });
  const efficiency = series('efficiency', 'КПД, %', '#79b96a');
  const pumpCurve = preparePumpCurve({ flowMinM3h: minFlow, flowMaxM3h: maxFlow,
    points: head.map(({ x, y }) => ({ flow: x, head: y })) });
  const powerCurve = pumpCurve && preparePumpPowerP2(
    pumpCurve, preparePumpEfficiency(parsed.data ?? []), [], defaultPumpFluid.densityKgM3,
  );
  const powerNodes = new Map<number, CurveSample>();
  if (powerCurve) {
    powerNodes.set(powerCurve.first.x, powerCurve.first);
    for (const { start, end } of powerCurve.segments) {
      powerNodes.set(start.x, start);
      powerNodes.set(end.x, end);
    }
  }
  const power = { label: 'P2, кВт', color: '#8d85f0',
    points: [...powerNodes.values()], segments: powerCurve?.segments, ratedPowerKw };
  const npsh = series('npsh', 'NPSHr, м', '#d29960');
  const chartMaxFlow = Math.max(1, minFlow, maxFlow, ...head.map(point => point.x), ...(parsed.data ?? []).map(point => point.flow));
  return <section className={css.section}>
    <h3>КПД, мощность P2 и NPSHr</h3>
    <div className={graph.tableScroll}><table className={graph.table} aria-label="Дополнительные характеристики">
      <thead><tr>{performanceFields.map(([key,label]) => <th key={key}>{key === 'flow' ? `Q, ${flowUnitLabels[flowUnit]}` : label}</th>)}<th /></tr></thead>
      <tbody>{rows.map((row,index) => {
        const numericFlow = Number(row.flow.replace(',', '.'));
        const convertedFlow = row.unit !== flowUnit && row.flow.trim() !== '' && Number.isFinite(numericFlow);
        const shownFlow = convertedFlow
          ? String(+fromM3h(toM3h(numericFlow, row.unit), flowUnit).toPrecision(12)).replace('.', ',')
          : row.flow;
        return <tr key={index}>
        {performanceFields.map(([key, label]) => <td key={key}><input className={f.input} inputMode="decimal" aria-label={`${key === 'npsh' ? label : key}, строка ${index+1}`}
          value={key === 'flow' ? shownFlow : row[key]}
          onChange={e => { setRows(rows.map((r,i) => i === index ? {...r,[key]:e.target.value,unit:key === 'flow' ? flowUnit : r.unit} : r)); mark(true); }} /></td>)}
        <td><button className={graph.remove} type="button" aria-label={`Удалить дополнительную точку ${index+1}`} onClick={() => {setRows(rows.filter((_,i) => i !== index)); mark(true);}}>×</button></td>
      </tr>; })}</tbody>
    </table></div>
    {parsed.success ? <>
      {efficiency.points.length >= 2 && <PerformanceGraph series={[{ label: 'Напор, м', color: '#59b7c3', points: head }, efficiency]} maxFlow={chartMaxFlow} minFlow={minFlow} flowUnit={flowUnit} />}
      <PerformanceGraph series={[power, npsh]} maxFlow={chartMaxFlow} minFlow={minFlow} flowUnit={flowUnit} />
    </> : <p className={f.error}>Проверьте числа и порядок расхода. КПД должен быть от 0 до 100%.</p>}
    <div className={f.actions}>
      <button type="button" className={ui.button} disabled={rows.length >= 200} onClick={() => {setRows([...rows,{flow:'',efficiency:'',powerP2:'',npsh:'',unit:flowUnit}]);mark(true);}}>Добавить строку</button>
      <button type="button" className={ui.button} disabled={!dirty || !parsed.success} onClick={() => {if(parsed.success){onChange(parsed.data);mark(false);}}}>Применить таблицу</button>
      {dirty && <span className={f.hint} role="status">Таблица ещё не применена</span>}
    </div>
  </section>;
}

export default function PumpSelectionEditor({ data, canPublish, breadcrumbs }: Props) {
  const router = useRouter();
  const [flowUnit, setFlowUnit] = useState<FlowUnit>('m3h');
  const revision = useRef(data.updatedAt);
  const [publishing, startPublication] = useTransition();
  const [curveDirty, setCurveDirty] = useState(false);
  const [performanceDirty, setPerformanceDirty] = useState(false);
  const [fluidLimitsDirty, setFluidLimitsDirty] = useState(false);
  const [publicationError, setPublicationError] = useState<{ message: string; fields: FieldError[] } | null>(null);
  const draft = useDraft<PumpSelectionValues>({
    initial: data.values,
    updatedAt: data.updatedAt,
    save: async (patch, mode) => {
      const result = await savePumpSelection(data.id, revision.current, patch, mode);
      if ('ok' in result) revision.current = result.savedAt;
      return result;
    },
    lock: { collection: 'pump-selection-records', id: data.id, holder: data.holder },
  });
  const { values: v, update, flush, status, readOnly, holder } = draft;
  const unapplied = curveDirty || performanceDirty || fluidLimitsDirty;
  function publish(value: boolean) {
    setPublicationError(null);
    startPublication(async () => {
      if (!await flush('autosave')) return;
      try {
        const result = await changePumpSelectionPublication(data.id, revision.current, value);
        if ('ok' in result) {
          revision.current = result.savedAt;
          router.refresh();
        } else {
          setPublicationError({ message: result.error, fields: result.fields ?? [] });
        }
      } catch {
        setPublicationError({ message: 'Не удалось обновить публикацию. Повторите попытку.', fields: [] });
      }
    });
  }
  const p = v.pumpSelection;
  const path = pumpGroupPath(data.sharedGroups ?? [], v.group) ?? [];
  const { record: effective, inherited } = resolvePumpCharacteristics(v, path);
  const { inherited: defaults } = resolvePumpCharacteristics({}, path);
  const overrides = v.characteristicOverrides ?? [];
  const isInherited = (key: string) => inherited[key as PumpSharedField] !== undefined;
  const [picker, setPicker] = useState<typeof selectionImageFields[number]['key'] | null>(null);
  const [localMedia,setLocalMedia] = useState<MediaChoice[]>([]);

  function updateLocal(patch: Partial<PumpSelectionValues>, ...changed: string[]) {
    const added = changed.filter((key): key is PumpSharedField => {
      const emptyList = key === 'systemTypes' && patch.systemTypes?.length === 0
        || key === 'fluidLimits' && patch.pumpSelection?.fluidLimits.length === 0;
      return (emptyList || !!defaults[key as PumpSharedField]) && !overrides.includes(key as PumpSharedField);
    });
    update(added.length ? { ...patch, characteristicOverrides: [...overrides, ...added] } : patch);
  }

  function changeSharedField({ key, kind, container }: SharedField, toLocal: boolean) {
    const cleared = kind === 'systemTypes' || kind === 'fluidLimits' ? [] : kind === 'number' || container === 'specs' ? null : '';
    const value = toLocal ? defaults[key]?.value ?? cleared : cleared;
    const characteristicOverrides = toLocal ? [...overrides, key] : overrides.filter(field => field !== key);
    update(container
      ? { [container]: { ...v[container], [key]: value }, characteristicOverrides }
      : { [key]: value, characteristicOverrides });
  }

  function sharedToggle(key: string, label: string) {
    const field = pumpSharedFieldDefinitions.find(item => item.key === key);
    const source = field && defaults[field.key];
    if (!field || !source) return null;
    return <label className={`${f.check} ${css.sharedToggle}`} title={`Из ${source.title}`}>
      <input type="checkbox" aria-label={`Из общих данных · ${label}`} checked={isInherited(key)} disabled={unapplied}
        onChange={event => changeSharedField(field, !event.currentTarget.checked)} />
      <span>Из общих данных</span>
    </label>;
  }

  function cardField(key: string, label: string, control: ReactNode) {
    return <div className={f.field} key={key}>
      <label className={f.field}><span className={f.label}>{label}</span>{control}</label>
      {sharedToggle(key, label)}
    </div>;
  }

  const change = (patch: Partial<PumpSelectionData>) => updateLocal({ pumpSelection: { ...p, ...patch } }, ...Object.keys(patch));
  const specs = [
    ['powerKw','Номинальная мощность, кВт'], ['phases','Количество фаз'], ['voltageV','Номинальное напряжение, В'],
  ] as const;
  const voltageFields = [
    ['voltageDeltaV', 'Напряжение Δ (треугольник), В'], ['voltageStarV', 'Напряжение Y (звезда), В'],
  ] as const;
  const specField = (key: typeof specs[number][0] | 'netWeightKg', label: string) => cardField(key, label,
    <input className={f.input} type="number" min="0" step="any" value={effective.specs[key] ?? ''} readOnly={isInherited(key)}
      onChange={e => updateLocal({ specs: { ...v.specs, [key]: e.target.value === '' ? null : Number(e.target.value) } }, key)} />);
  const fields = (section: typeof selectionSections[number]) => [
    ...selectionTextFields.filter(field => field.section === section && field.key !== 'modelName' && field.key !== 'fluid')
      .map(({ key, label }) => cardField(key, label, key === 'description'
        ? <textarea className={f.textarea} rows={6} value={effective.pumpSelection[key]} readOnly={isInherited(key)}
          onChange={e => change({ [key]: e.target.value })} />
        : <input className={f.input} value={effective.pumpSelection[key]} readOnly={isInherited(key)}
          onChange={e => change({ [key]: e.target.value })} />)),
    ...selectionNumberFields.filter(field => field.section === section).map(({ key, label, min }) => {
      const isFlow = key === 'flowMinM3h' || key === 'flowMaxM3h';
      const value = effective.pumpSelection[key];
      return cardField(key, isFlow ? label.replace('м³/ч', flowUnitLabels[flowUnit]) : label,
        <input className={f.input} type="number" step={key === 'motorPoles' || key === 'impellerCount' ? '1' : 'any'} min={min}
          value={value === null ? '' : isFlow ? +fromM3h(value, flowUnit).toPrecision(12) : value}
          readOnly={isInherited(key)}
          onChange={e => change({ [key]: e.target.value === '' ? null : isFlow ? toM3h(Number(e.target.value), flowUnit) : Number(e.target.value) })} />);
    }),
  ];
  const sharedMode = {
    speedRpm: { inherited: isInherited('speedRpm'), value: effective.curve.speedRpm, toggle: sharedToggle('speedRpm', 'Частота вращения, об/мин') },
    frequencyHz: { inherited: isInherited('frequencyHz'), value: effective.curve.frequencyHz, toggle: sharedToggle('frequencyHz', 'Частота питания, Гц') },
  };
  const curveEditorKey = [v.group, sharedMode.speedRpm.inherited ? 'shared' : v.curve.speedRpm,
    sharedMode.frequencyHz.inherited ? 'shared' : v.curve.frequencyHz].join(':');
  return <>
    <header className={css.bar}>
      {breadcrumbs}
      <h1 className={css.title}>{v.sku} · {p.modelName.trim() || v.title}</h1>
      <span className={css.spacer} />
      <span className={f.hint}>{data.published ? data.hasDraft ? 'Опубликовано · есть черновик' : 'Опубликовано' : 'Черновик'}</span>
      <SaveStatus status={status} />
      <button type="button" className={ui.button} disabled={readOnly || publishing || unapplied || status.kind === 'saving'}
        onClick={() => void flush('save')}>Сохранить черновик</button>
      {canPublish && data.published && <button type="button" className={ui.button}
        disabled={readOnly || publishing || unapplied || status.kind === 'saving'}
        onClick={() => publish(false)}>Снять с подбора</button>}
      {canPublish && <button type="button" className={`${ui.button} ${ui.primary}`}
        disabled={readOnly || publishing || unapplied || status.kind === 'saving'}
        onClick={() => publish(true)}>Опубликовать для подбора</button>}
    </header>
    {readOnly && (
      <div className={css.banner} data-tone="warning" role="status">
        <span>{holder ? `Насос редактирует ${holder.name}.` : 'Обновите страницу перед редактированием.'}</span>
        <button type="button" className={ui.button} onClick={() => window.location.reload()}>Обновить</button>
      </div>
    )}
    <SaveError status={status} labels={{}} />
    {publicationError && <SaveError status={{ kind: 'error', ...publicationError }} labels={{}} />}
    <div className={`${css.layout} ${css.singleForm}`}>
      <Toc entries={toc} />
      <fieldset className={css.form} disabled={readOnly || publishing}>
        <legend className="visually-hidden">Карточка насоса</legend>
        <section id="s-selection" className={css.section}>
          <div className={css.sectionHead}><h2>Данные для подбора</h2></div>
          <label className={f.field}>
            <span className={f.label}>Единицы расхода</span>
            <select className={f.select} value={flowUnit} onChange={e => setFlowUnit(parseFlowUnit(e.target.value))}>
              {Object.entries(flowUnitLabels).map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}
            </select>
          </label>
          <div className={css.row}>
            <label className={f.field}>
              <span className={f.label}>Артикул</span>
              <input className={f.input} value={v.sku} maxLength={100} onChange={e => update({ sku: e.target.value })} />
            </label>
            <label className={f.field}>
              <span className={f.label}>Название</span>
              <input className={f.input} value={p.modelName || v.title} maxLength={200}
                onChange={e => update({ title: e.target.value, pumpSelection: { ...p, modelName: e.target.value } })} />
            </label>
            <label className={f.field}>
              <span className={f.label}>Группа</span>
              <select className={f.select} value={v.group} disabled={unapplied} onChange={e => update({ group: Number(e.target.value) })}>
                {data.groups.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}
              </select>
            </label>
            <label className={f.field}>
              <span className={f.label}>Диаметр присоединения DN</span>
              <input className={f.input} value={v.connectionSize} maxLength={100}
                onChange={e => update({ connectionSize: e.target.value })} />
            </label>
          </div>
          <section className={css.section} aria-labelledby="pump-system-types">
            <h3 id="pump-system-types">Тип системы</h3>
            <div className={css.checks}>{systemTypes.map(type => <label key={type} className={f.check}>
              <input type="checkbox" checked={effective.systemTypes.includes(type)} disabled={isInherited('systemTypes')} onChange={e => updateLocal({
                systemTypes: e.target.checked ? [...v.systemTypes, type] : v.systemTypes.filter(value => value !== type),
              }, 'systemTypes')} /> {pumpSystemTypes[type]}
            </label>)}</div>
            {sharedToggle('systemTypes', 'Тип системы')}
          </section>
          <section className={css.section} aria-labelledby="pump-fluid-limits">
            <h3 id="pump-fluid-limits">Допустимые среды</h3>
            <fieldset className={css.sharedValues} disabled={isInherited('fluidLimits')}>
              <legend className="visually-hidden">Допуски сред</legend>
              <FluidLimitsEditor key={isInherited('fluidLimits') ? JSON.stringify(effective.pumpSelection.fluidLimits) : v.group}
                initial={effective.pumpSelection.fluidLimits}
                temperatureMinC={effective.pumpSelection.temperatureMinC} temperatureMaxC={effective.pumpSelection.temperatureMaxC}
                onApply={fluidLimits => change({ fluidLimits })} onDirtyChange={setFluidLimitsDirty} />
            </fieldset>
            {sharedToggle('fluidLimits', 'Допустимые среды')}
          </section>
          <section className={css.section}>
            <h3>График насоса и точки Q–H</h3>
            <PumpCurveEditor key={curveEditorKey} curve={v.curve} source={data.curveSource} model={p.modelName.trim() || v.title}
              flowUnit={flowUnit} sharedMode={sharedMode}
              onApply={curve => updateLocal({ curve }, ...(['speedRpm', 'frequencyHz'] as const).filter(key => curve[key] !== v.curve[key]))}
              onDirtyChange={setCurveDirty} />
          </section>
          <PerformanceEditor initial={p.performancePoints} onChange={performancePoints => change({ performancePoints })}
            onDirtyChange={setPerformanceDirty} head={v.curve.points.map(({ flow, head }) => ({ x: flow, y: head }))}
            minFlow={p.flowMinM3h ?? 0} maxFlow={p.flowMaxM3h ?? 0} flowUnit={flowUnit} ratedPowerKw={effective.specs.powerKw} />
          <section className={css.section}>
            <h3>{technicalSection}</h3>
            <div className={css.row}>{fields(technicalSection)}</div>
          </section>
          <section className={css.section}>
            <h3>Питание и мощность</h3>
            <div className={css.row}>
              {specs.map(([key, label]) => specField(key, label))}
              {voltageFields.map(([key, label]) => cardField(key, label,
                <input className={f.input} maxLength={32} value={effective.specs[key] ?? ''} readOnly={isInherited(key)}
                  onChange={e => updateLocal({ specs: { ...v.specs, [key]: e.target.value || null } }, key)} />))}
            </div>
          </section>
        </section>
        <section id="s-datasheet" className={css.section}>
          <div className={css.sectionHead}><h2>Данные для техлиста</h2></div>
          {cardField('fluid', 'Перекачиваемая жидкость',
            <input className={f.input} value={effective.pumpSelection.fluid} readOnly={isInherited('fluid')}
              onChange={e => change({ fluid: e.target.value })} />)}
          {selectionSections.filter(section => section !== technicalSection && section !== 'Источник').map(section => {
            const visible = fields(section);
            return (visible.length > 0 || section === 'Прочее') && <section key={section} className={css.section}>
              <h3>{section}</h3>
              <div className={css.row}>
                {visible}
                {section === 'Прочее' && specField('netWeightKg', 'Вес нетто, кг')}
              </div>
            </section>;
          })}
          <section className={css.section}>
            <h3>Фото и чертёж</h3>
            <div className={f.grid}>{selectionImageFields.map(({ key, label }) => {
              const file = [...localMedia, ...data.media].find(m => m.id === p[key]);
              return <div className={css.tile} key={key}>
                <h4>{label}</h4>
                {file && <a href={file.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.url} alt={file.alt} style={{ height: 150 }} />
                </a>}
                <div className={f.actions}>
                  <button type="button" className={ui.button} onClick={() => setPicker(key)}>{file ? 'Заменить' : 'Выбрать'}</button>
                  {p[key] && <button type="button" className={ui.button} onClick={() => change({ [key]: null })}>Убрать</button>}
                </div>
              </div>;
            })}</div>
            <MediaPicker open={!!picker && !readOnly} onOpenChange={open => { if (!open) setPicker(null); }} options={data.media}
              accept="image/jpeg,image/png,image/webp"
              description={picker === 'photo' ? 'Фото насоса' : 'Габаритный чертёж'}
              onPick={file => { if (picker) { change({ [picker]: file.id }); setLocalMedia(list => [file, ...list]); } }} />
          </section>
        </section>
      </fieldset>
    </div>
  </>;
}
