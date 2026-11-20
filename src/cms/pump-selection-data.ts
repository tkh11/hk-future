import { z } from 'zod';
import { pumpGlycolKinds } from '../lib/pump-fluid';

// These fields belong to an execution/SKU. The Q–H curve can be shared by executions.
export const selectionTextFields = [
  { key: 'modelName', label: 'Наименование в отчёте', section: 'Описание' },
  { key: 'description', label: 'Описание насоса', section: 'Описание' },
  { key: 'fluid', label: 'Перекачиваемая жидкость', section: 'Технические данные' },
  { key: 'impellerType', label: 'Тип рабочего колеса', section: 'Конструкция' },
  { key: 'sealType', label: 'Тип уплотнения', section: 'Конструкция' },
  { key: 'wettedMaterial', label: 'Материал корпуса', section: 'Материалы' },
  { key: 'impellerMaterial', label: 'Материал рабочего колеса', section: 'Материалы' },
  { key: 'shaftMaterial', label: 'Материал вала', section: 'Материалы' },
  { key: 'sealMaterial', label: 'Материал уплотнения', section: 'Материалы' },
  { key: 'installation', label: 'Способ установки', section: 'Монтаж' },
  { key: 'maxOperatingPressure', label: 'Максимальное рабочее давление', section: 'Монтаж' },
  { key: 'inletConnection', label: 'Вход насоса', section: 'Монтаж' },
  { key: 'outletConnection', label: 'Выход насоса', section: 'Монтаж' },
  { key: 'motorName', label: 'Наименование двигателя', section: 'Электродвигатель' },
  { key: 'motorCode', label: 'Код двигателя', section: 'Электродвигатель' },
  { key: 'motorType', label: 'Тип двигателя', section: 'Электродвигатель' },
  { key: 'protectionClass', label: 'Степень защиты', section: 'Электродвигатель' },
  { key: 'insulationClass', label: 'Класс изоляции', section: 'Электродвигатель' },
  { key: 'sourceNotes', label: 'Источник и замечания к данным', section: 'Источник' },
] as const;
export const selectionNumberFields = [
  { key: 'temperatureMinC', label: 'Температура от, °C', section: 'Технические данные', min: -273.15 },
  { key: 'temperatureMaxC', label: 'Температура до, °C', section: 'Технические данные', min: -273.15 },
  { key: 'flowMinM3h', label: 'Расход от, м³/ч', section: 'Технические данные', min: 0 },
  { key: 'flowMaxM3h', label: 'Расход до, м³/ч', section: 'Технические данные', min: 0 },
  { key: 'headAtMinFlowM', label: 'Напор при начальном расходе, м', section: 'Технические данные', min: 0 },
  { key: 'headAtMaxFlowM', label: 'Напор при конечном расходе, м', section: 'Технические данные', min: 0 },
  { key: 'impellerCount', label: 'Количество рабочих колёс', section: 'Конструкция', min: 1 },
  { key: 'motorPoles', label: 'Количество полюсов', section: 'Электродвигатель', min: 1 },
  { key: 'volumeM3', label: 'Объём, м³', section: 'Прочее', min: 0 },
] as const;
export const selectionSections = ['Описание', 'Технические данные', 'Конструкция', 'Материалы', 'Монтаж', 'Электродвигатель', 'Прочее', 'Источник'] as const;
export const selectionSpecificationFields = [...selectionTextFields, ...selectionNumberFields]
  .filter(({ key, section }) => key === 'description' || (section !== 'Описание' && section !== 'Источник'));
export const selectionMediaFields = [
  { key: 'photo', label: 'Фото насоса' }, { key: 'drawing', label: 'Габаритный чертёж' }, { key: 'sourcePdf', label: 'Исходный PDF' },
] as const;
const textKeys = selectionTextFields.map(f => f.key);
const numberKeys = selectionNumberFields.map(f => f.key);
type TextKey = typeof textKeys[number];
type NumberKey = typeof numberKeys[number];
const textShape = Object.fromEntries(textKeys.map(key => [key, z.string().max(key === 'description' ? 10000 : 2000).default('')])) as Record<TextKey, z.ZodDefault<z.ZodString>>;
const numberShape = Object.fromEntries(selectionNumberFields.map(f => [f.key, z.number().finite().min(f.min).nullable().default(null)])) as Record<NumberKey, z.ZodDefault<z.ZodNullable<z.ZodNumber>>>;
const optionalValue = z.number().finite().nonnegative().nullable();
export const performancePointsSchema = z.array(z.object({
  flow: z.number().finite().nonnegative(),
  efficiency: z.number().finite().min(0).max(100).nullable(),
  powerP2: optionalValue, npsh: optionalValue,
})).max(200).refine(rows => rows.every((row, i) => i === 0 || row.flow > rows[i - 1].flow), 'Расход должен возрастать без повторов.');
const fluidLimitSchema = z.object({
  kind: z.enum(pumpGlycolKinds),
  temperatureMinC: z.number().finite().min(-273.15),
  temperatureMaxC: z.number().finite().min(-273.15),
  concentrationMinPct: z.number().finite().nonnegative().max(60),
  concentrationMaxPct: z.number().finite().positive().max(60),
}).superRefine((row, ctx) => {
  if (row.temperatureMinC > row.temperatureMaxC) {
    ctx.addIssue({ code: 'custom', path: ['temperatureMaxC'], message: 'Проверьте диапазон температуры.' });
  }
  if (row.concentrationMinPct > row.concentrationMaxPct) {
    ctx.addIssue({ code: 'custom', path: ['concentrationMaxPct'], message: 'Проверьте диапазон концентрации.' });
  }
});
export type PumpFluidLimit = z.output<typeof fluidLimitSchema>;
export const pumpFluidLimitsSchema = z.array(fluidLimitSchema).max(pumpGlycolKinds.length)
  .refine(rows => new Set(rows.map(row => row.kind)).size === rows.length, 'Укажите один диапазон для каждой среды.');
const mediaID = z.number().int().positive().nullable().default(null);
export const pumpSelectionSchema = z.object({
  ...textShape, ...numberShape, photo: mediaID, drawing: mediaID, sourcePdf: mediaID,
  performancePoints: performancePointsSchema.default([]),
  fluidLimits: pumpFluidLimitsSchema.default([]),
}).superRefine((data, ctx) => {
  for (const [lo, hi] of [['temperatureMinC','temperatureMaxC'], ['flowMinM3h','flowMaxM3h']] as const) {
    if (data[lo] !== null && data[hi] !== null && data[lo] > data[hi]) ctx.addIssue({ code: 'custom', path: [hi], message: 'Конец диапазона должен быть не меньше начала.' });
  }
  for (const key of ['impellerCount', 'motorPoles'] as const) {
    if (data[key] !== null && !Number.isInteger(data[key])) ctx.addIssue({ code: 'custom', path: [key], message: 'Введите целое число.' });
  }
});
export type PumpSelectionData = z.output<typeof pumpSelectionSchema>;

/** Normalise Payload nulls and populated media without hiding invalid numeric data. */
export function fromPumpSelection(value: unknown): PumpSelectionData {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const raw: Record<string, unknown> = {};
  for (const key of textKeys) raw[key] = typeof row[key] === 'string' ? row[key] : '';
  for (const key of numberKeys) raw[key] = typeof row[key] === 'number' ? row[key] : null;
  for (const {key} of selectionMediaFields) {
    const v = row[key];
    raw[key] = typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? v.id : null;
  }
  raw.performancePoints = Array.isArray(row.performancePoints) ? row.performancePoints.map(point => {
    if (!point || typeof point !== 'object') return point;
    return { ...point, efficiency: point.efficiency ?? null, powerP2: point.powerP2 ?? null, npsh: point.npsh ?? null };
  }) : [];
  raw.fluidLimits = row.fluidLimits ?? [];
  return pumpSelectionSchema.parse(raw);
}
