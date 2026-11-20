'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import {
  getSharedPumpValue, pumpSharedCharacteristicsSchema, pumpSharedFieldDefinitions, resolvePumpCharacteristics,
  type PumpSharedCharacteristics, type PumpSharedField,
} from '@/cms/pump-shared-characteristics';
import type { PumpFluidLimit } from '@/cms/pump-selection-data';
import { pumpFluidLabels, pumpGlycolKinds } from '@/lib/pump-fluid';
import { isPumpSystemType, storedPumpSystemTypes } from '@/lib/pump-system-types';
import { savePumpSharedCharacteristics } from '../pump-selection-actions';
import { Field } from './editor/parts';
import f from './form.module.css';
import ui from './ui.module.css';

type Folder = { id: number; title: string; sharedCharacteristics?: unknown };
type Props = {
  group: Folder & { updatedAt: string; sharedCharacteristicsDraft?: unknown };
  path: readonly Folder[];
};
type System = keyof typeof storedPumpSystemTypes;
const systemOptions = Object.keys(storedPumpSystemTypes) as System[];
const scalarFields = pumpSharedFieldDefinitions.filter(({ kind }) => kind !== 'systemTypes' && kind !== 'fluidLimits');

function scalarInputs(values: PumpSharedCharacteristics): Partial<Record<PumpSharedField, string>> {
  return Object.fromEntries(scalarFields.flatMap(({ key }) => {
    const value = String(values[key] ?? '').trim();
    return value ? [[key, value]] : [];
  }));
}
const fluidFields = [
  ['temperatureMinC', 'Температура от, °C'],
  ['temperatureMaxC', 'Температура до, °C'],
  ['concentrationMinPct', 'Концентрация от, % масс.'],
  ['concentrationMaxPct', 'Концентрация до, % масс.'],
] as const;
type FluidField = typeof fluidFields[number][0];
type FluidInput = { kind: PumpFluidLimit['kind'] } & Record<FluidField, string>;

function fluidInput(row: PumpFluidLimit): FluidInput {
  return {
    kind: row.kind,
    temperatureMinC: String(row.temperatureMinC),
    temperatureMaxC: String(row.temperatureMaxC),
    concentrationMinPct: String(row.concentrationMinPct),
    concentrationMaxPct: String(row.concentrationMaxPct),
  };
}

function FluidFields({ rows, onChange, disabled, minimum, maximum }: {
  rows: FluidInput[];
  onChange: (rows: FluidInput[]) => void;
  disabled: boolean;
  minimum: string;
  maximum: string;
}) {
  return <fieldset className={f.form} disabled={disabled}>
    <div className={f.actions}>{pumpGlycolKinds.map(kind => <label className={f.check} key={kind}>
      <input type="checkbox" checked={rows.some(row => row.kind === kind)} onChange={event =>
        onChange(event.target.checked ? [...rows, {
          kind, temperatureMinC: minimum, temperatureMaxC: maximum, concentrationMinPct: '', concentrationMaxPct: '',
        }] : rows.filter(row => row.kind !== kind))} />
      {pumpFluidLabels[kind]}
    </label>)}</div>
    {rows.map(row => <fieldset className={f.section} key={row.kind}>
      <legend>{pumpFluidLabels[row.kind]}</legend>
      <div className={f.grid}>{fluidFields.map(([key, label]) => <label className={f.field} key={key}>
        <span className={f.label}>{label}</span>
        <input className={f.input} type="number" step="any" value={row[key]} onChange={event =>
          onChange(rows.map(item => item.kind === row.kind ? { ...item, [key]: event.target.value } : item))} />
      </label>)}</div>
    </fieldset>)}
  </fieldset>;
}

export default function PumpSharedCharacteristicsEditor({ group, path }: Props) {
  const router = useRouter();
  const [initial] = useState(() => pumpSharedCharacteristicsSchema.safeParse(
    group.sharedCharacteristicsDraft ?? group.sharedCharacteristics ?? {},
  ));
  const start = initial.success ? initial.data : {};
  const [scalars, setScalars] = useState(() => scalarInputs(start));
  const [systems, setSystems] = useState(start.systemTypes ?? undefined);
  const [limits, setLimits] = useState(start.fluidLimits?.map(fluidInput));
  const [saved, setSaved] = useState({
    revision: group.updatedAt,
    published: group.sharedCharacteristics != null,
    draft: group.sharedCharacteristicsDraft != null,
  });
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PumpSharedField, string>>>({});
  const [pending, run] = useTransition();

  const { record: parentValues, inherited } = resolvePumpCharacteristics({}, path.filter(folder => folder.id !== group.id));
  const scalarVisible = (key: PumpSharedField) => scalars[key] !== undefined || inherited[key] !== undefined;
  const availableScalars = scalarFields.filter(({ key }) => !scalarVisible(key));
  const inheritedSystems = getSharedPumpValue(parentValues, 'systemTypes') ?? [];
  const inheritedLimits = getSharedPumpValue(parentValues, 'fluidLimits') ?? [];
  const displayedSystems = systems ?? inheritedSystems;
  const visibleSystems = systemOptions.filter(type => isPumpSystemType(type) || displayedSystems.includes(type));
  const minimum = scalars.temperatureMinC || String(getSharedPumpValue(parentValues, 'temperatureMinC') ?? '');
  const maximum = scalars.temperatureMaxC || String(getSharedPumpValue(parentValues, 'temperatureMaxC') ?? '');
  const status = pending ? 'Сохранение…'
    : dirty ? 'Есть несохранённые правки'
    : saved.draft ? saved.published ? 'Опубликовано · есть черновик' : 'Черновик сохранён'
    : saved.published ? 'Опубликовано' : 'Не задано';

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { submitter } = event.nativeEvent as SubmitEvent;
    const mode = submitter instanceof HTMLButtonElement && submitter.value === 'publish' ? 'publish' : 'save';
    if (pending || (!dirty && (mode === 'save' || !saved.draft))) return;

    const input = Object.fromEntries(scalarFields.flatMap(({ key, kind }) => {
      const value = scalars[key]?.trim();
      return value ? [[key, kind === 'number' ? Number(value) : value]] : [];
    }));
    const parsed = pumpSharedCharacteristicsSchema.safeParse({
      ...input,
      systemTypes: systems,
      fluidLimits: limits?.map(row => ({
        kind: row.kind,
        temperatureMinC: row.temperatureMinC === '' ? undefined : Number(row.temperatureMinC),
        temperatureMaxC: row.temperatureMaxC === '' ? undefined : Number(row.temperatureMaxC),
        concentrationMinPct: row.concentrationMinPct === '' ? undefined : Number(row.concentrationMinPct),
        concentrationMaxPct: row.concentrationMaxPct === '' ? undefined : Number(row.concentrationMaxPct),
      })),
    });
    setError('');
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map(issue => [
        issue.path[0], issue.path[0] === 'fluidLimits' ? 'Проверьте диапазоны температуры и концентрации.'
          : issue.code === 'custom' ? issue.message : 'Проверьте значение.',
      ])));
      setError('Проверьте отмеченные поля.');
      return;
    }
    setFieldErrors({});
    run(async () => {
      try {
        const result = await savePumpSharedCharacteristics(group.id, saved.revision, parsed.data, mode);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        setSaved({ revision: result.savedAt, published: saved.published || mode === 'publish', draft: mode === 'save' });
        setScalars(scalarInputs(parsed.data));
        setDirty(false);
        router.refresh();
      } catch {
        setError('Не удалось сохранить. Повторите попытку.');
      }
    });
  }

  return <details className={f.section}>
    <summary>Общие характеристики{initial.success && <> · <span className={f.hint} role="status">{status}</span></>}</summary>
    {!initial.success ? <p className={f.error} role="alert">Не удалось загрузить общие характеристики.</p>
      : <form className={f.form} onSubmit={submit} onChange={() => setDirty(true)}>
        <fieldset className={f.form} disabled={pending}>
          <div className={f.grid}>{scalarFields.filter(({ key }) => scalarVisible(key)).map(({ key, label, kind }) => {
            const value = scalars[key] ?? '';
            const from = inherited[key];
            const props = {
              placeholder: from ? String(from.value) : undefined,
              value,
              onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setScalars({ ...scalars, [key]: event.target.value }),
            };
            return <Field key={key} path={`pump-shared-${key}`} label={label} error={fieldErrors[key]}
              aside={from && !value.trim() ? `Из папки «${from.title}»` : undefined}>
              {input => kind === 'textarea'
                ? <textarea className={f.textarea} {...input} {...props} />
                : <input className={f.input} type={kind === 'number' ? 'number' : 'text'}
                  step={kind === 'number' ? 'any' : undefined} {...input} {...props} />}
            </Field>;
          })}</div>
          {availableScalars.length > 0 && <label className={f.field}>
            <span className={f.label}>Добавить общее поле</span>
            <select className={f.select} value="" onChange={event => {
              const picked = availableScalars.find(({ key }) => key === event.currentTarget.value);
              event.stopPropagation();
              if (picked) setScalars(values => ({ ...values, [picked.key]: '' }));
            }}>
              <option value="">Выберите характеристику</option>
              {availableScalars.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>}
          <fieldset className={f.section}>
            <legend>Тип системы</legend>
            <label className={f.check}>
              <input type="checkbox" checked={systems !== undefined} onChange={event =>
                setSystems(event.target.checked ? inheritedSystems : undefined)} />
              Задать для папки
              {systems === undefined && inherited.systemTypes && <span className={f.hint}>
                {`Из папки «${inherited.systemTypes.title}»`}
              </span>}
            </label>
            <fieldset className={f.actions} disabled={systems === undefined}>{visibleSystems.map(type => <label className={f.check} key={type}>
              <input type="checkbox" checked={displayedSystems.includes(type)} onChange={event =>
                setSystems(event.target.checked ? [...displayedSystems, type] : displayedSystems.filter(item => item !== type))} />
              {storedPumpSystemTypes[type]}
            </label>)}</fieldset>
            {fieldErrors.systemTypes && <p className={f.error}>{fieldErrors.systemTypes}</p>}
          </fieldset>
          <fieldset className={f.section}>
            <legend>Допуски по гликолю</legend>
            <label className={f.check}>
              <input type="checkbox" checked={limits !== undefined} onChange={event =>
                setLimits(event.target.checked ? inheritedLimits.map(fluidInput) : undefined)} />
              Задать для папки
              {limits === undefined && inherited.fluidLimits && <span className={f.hint}>
                {`Из папки «${inherited.fluidLimits.title}»`}
              </span>}
            </label>
            <FluidFields rows={limits ?? inheritedLimits.map(fluidInput)} onChange={setLimits}
              disabled={limits === undefined} minimum={minimum} maximum={maximum} />
            {fieldErrors.fluidLimits && <p className={f.error}>{fieldErrors.fluidLimits}</p>}
          </fieldset>
        </fieldset>
        {error && <p className={f.error} role="alert">{error}</p>}
        <div className={f.actions}>
          <button className={ui.button} type="submit" value="save" disabled={pending || !dirty}>Сохранить черновик</button>
          <button className={`${ui.button} ${ui.primary}`} type="submit" value="publish"
            disabled={pending || (!dirty && !saved.draft)}>Опубликовать</button>
        </div>
      </form>}
  </details>;
}
