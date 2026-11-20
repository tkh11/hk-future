import { z } from 'zod';
import { isPumpSystemType, storedPumpSystemTypes } from '../lib/pump-system-types';
import { pumpFluidLimitsSchema, pumpSelectionSchema, selectionNumberFields, selectionTextFields } from './pump-selection-data';

const report = pumpSelectionSchema.shape;
const voltageRange = z.string().trim().max(32).regex(/^[1-9]\d*(?:\s*[-–—]\s*[1-9]\d*)?$/).nullish();
const nonnegative = z.number().finite().nonnegative().nullish();
const optionalText = (field: z.ZodDefault<z.ZodString>) => field.unwrap().nullish();
const systemTypes = z.array(z.custom<keyof typeof storedPumpSystemTypes>(
  value => typeof value === 'string' && Object.hasOwn(storedPumpSystemTypes, value),
)).refine(types => new Set(types).size === types.length);

const sharedShape = {
  description: optionalText(report.description),
  fluid: optionalText(report.fluid),
  temperatureMinC: report.temperatureMinC.unwrap().optional(),
  temperatureMaxC: report.temperatureMaxC.unwrap().optional(),
  fluidLimits: pumpFluidLimitsSchema.nullish(),
  impellerType: optionalText(report.impellerType),
  impellerCount: report.impellerCount.unwrap().unwrap().int().nullish(),
  sealType: optionalText(report.sealType),
  wettedMaterial: optionalText(report.wettedMaterial),
  shaftMaterial: optionalText(report.shaftMaterial),
  impellerMaterial: optionalText(report.impellerMaterial),
  sealMaterial: optionalText(report.sealMaterial),
  installation: optionalText(report.installation),
  maxOperatingPressure: optionalText(report.maxOperatingPressure),
  inletConnection: optionalText(report.inletConnection),
  outletConnection: optionalText(report.outletConnection),
  protectionClass: optionalText(report.protectionClass),
  insulationClass: optionalText(report.insulationClass),
  motorPoles: report.motorPoles.unwrap().unwrap().int().nullish(),
  voltageV: nonnegative,
  voltageDeltaV: voltageRange,
  voltageStarV: voltageRange,
  phases: nonnegative,
  frequencyHz: z.number().finite().positive().nullish(),
  speedRpm: z.number().int().positive().nullish(),
  systemTypes: systemTypes.nullish(),
};

export const pumpSharedCharacteristicsSchema = z.object(sharedShape).refine(
  ({ temperatureMinC, temperatureMaxC }) =>
    temperatureMinC == null || temperatureMaxC == null || temperatureMinC <= temperatureMaxC,
  { path: ['temperatureMaxC'], message: 'Конец диапазона должен быть не меньше начала.' },
);

export type PumpSharedCharacteristics = z.output<typeof pumpSharedCharacteristicsSchema>;
export type PumpSharedField = keyof PumpSharedCharacteristics;
type SharedContainer = 'pumpSelection' | 'specs' | 'curve';
type SharedFieldKind = 'text' | 'number' | 'systemTypes' | 'fluidLimits' | 'textarea';
type SharedFieldDefinition = { key: PumpSharedField; label: string; kind: SharedFieldKind; container?: SharedContainer };

const reportFields = [...selectionTextFields, ...selectionNumberFields] as const;
type ReportField = (typeof reportFields)[number]['key'];
const fromReport = (key: ReportField, kind: SharedFieldKind) => ({
  label: reportFields.find(field => field.key === key)!.label,
  kind,
  container: 'pumpSelection' as const,
});

const definitions: Record<PumpSharedField, Omit<SharedFieldDefinition, 'key'>> = {
  description: fromReport('description', 'textarea'),
  fluid: fromReport('fluid', 'text'),
  temperatureMinC: fromReport('temperatureMinC', 'number'),
  temperatureMaxC: fromReport('temperatureMaxC', 'number'),
  fluidLimits: { label: 'Допустимые среды', kind: 'fluidLimits', container: 'pumpSelection' },
  impellerType: fromReport('impellerType', 'text'),
  impellerCount: fromReport('impellerCount', 'number'),
  sealType: fromReport('sealType', 'text'),
  wettedMaterial: fromReport('wettedMaterial', 'text'),
  shaftMaterial: fromReport('shaftMaterial', 'text'),
  impellerMaterial: fromReport('impellerMaterial', 'text'),
  sealMaterial: fromReport('sealMaterial', 'text'),
  installation: fromReport('installation', 'text'),
  maxOperatingPressure: fromReport('maxOperatingPressure', 'text'),
  inletConnection: fromReport('inletConnection', 'text'),
  outletConnection: fromReport('outletConnection', 'text'),
  protectionClass: fromReport('protectionClass', 'text'),
  insulationClass: fromReport('insulationClass', 'text'),
  motorPoles: fromReport('motorPoles', 'number'),
  voltageV: { label: 'Номинальное напряжение, В', kind: 'number', container: 'specs' },
  voltageDeltaV: { label: 'Напряжение Δ, В', kind: 'text', container: 'specs' },
  voltageStarV: { label: 'Напряжение Y, В', kind: 'text', container: 'specs' },
  phases: { label: 'Количество фаз', kind: 'number', container: 'specs' },
  frequencyHz: { label: 'Частота питания, Гц', kind: 'number', container: 'curve' },
  speedRpm: { label: 'Частота вращения, об/мин', kind: 'number', container: 'curve' },
  systemTypes: { label: 'Тип системы', kind: 'systemTypes' },
};

const keys = Object.keys(definitions) as PumpSharedField[];
export const pumpSharedFieldDefinitions: readonly SharedFieldDefinition[] = keys.map(key => ({ key, ...definitions[key] }));
export const pumpSharedOverrideKeysSchema = z.array(z.enum(keys)).max(keys.length)
  .refine(fields => new Set(fields).size === fields.length);

export type PumpCharacteristicRecord = {
  connectionSize?: string | null;
  systemTypes?: readonly (keyof typeof storedPumpSystemTypes)[] | null;
  characteristicOverrides?: unknown;
  pumpSelection?: object | null;
  specs?: object | null;
  curve?: object | null;
};

type SharedValue = NonNullable<PumpSharedCharacteristics[PumpSharedField]>;
type CharacteristicFolder = { id: number; title: string; sharedCharacteristics?: unknown };
type InheritedPumpCharacteristic = { groupId: number; title: string; value: SharedValue };

export function getSharedPumpValue<K extends PumpSharedField>(record: PumpCharacteristicRecord, key: K) {
  const container = definitions[key].container;
  const values = (container ? record[container] : record) as PumpSharedCharacteristics | null | undefined;
  return values?.[key];
}

function hasValue(value: PumpSharedCharacteristics[PumpSharedField], allowEmptyList: boolean): value is SharedValue {
  return value != null && (typeof value !== 'string' || value.trim() !== '')
    && (allowEmptyList || !Array.isArray(value) || value.length > 0);
}

export function resolvePumpCharacteristics<T extends PumpCharacteristicRecord>(record: T, path: readonly CharacteristicFolder[]) {
  const inherited: Partial<Record<PumpSharedField, InheritedPumpCharacteristic>> = {};
  const parsedOverrides = pumpSharedOverrideKeysSchema.safeParse(record.characteristicOverrides ?? []);
  const overrides = new Set(parsedOverrides.success ? parsedOverrides.data : []);
  const folders = [...path].reverse().flatMap(folder => {
    if (folder.sharedCharacteristics == null) return [];
    const parsed = pumpSharedCharacteristicsSchema.safeParse(folder.sharedCharacteristics);
    return parsed.success ? [{ id: folder.id, title: folder.title, values: parsed.data }] : [];
  });
  const effective: T & PumpCharacteristicRecord = { ...record };
  for (const { key, container } of pumpSharedFieldDefinitions) {
    // Legacy SKU arrays default to []; override keys distinguish a deliberately empty list.
    if (overrides.has(key) || hasValue(getSharedPumpValue(record, key), false)) continue;
    for (const { id, title, values } of folders) {
      const value = values[key];
      if (!hasValue(value, true)) continue;
      inherited[key] = { groupId: id, title, value };
      Object.assign(effective, container ? { [container]: { ...effective[container], [key]: value } } : { [key]: value });
      break;
    }
  }
  return { record: effective, inherited };
}

export function pumpCharacteristicErrors({ systemTypes: types, pumpSelection, curve }: {
  systemTypes?: readonly string[] | null;
  pumpSelection?: { temperatureMinC?: number | null; temperatureMaxC?: number | null } | null;
  curve?: { speedRpm?: number | null; frequencyHz?: number | null; hydraulicsOnly?: boolean | null } | null;
}) {
  const errors: { path: string; message: string }[] = [];
  if (!types?.length || !types.every(isPumpSystemType)) {
    errors.push({ path: 'systemTypes', message: 'Выберите тип системы.' });
  }
  const { temperatureMinC, temperatureMaxC } = pumpSelection ?? {};
  if (temperatureMinC != null && temperatureMaxC != null && temperatureMinC > temperatureMaxC) {
    errors.push({ path: 'pumpSelection.temperatureMaxC', message: 'Проверьте диапазон температуры с учётом общих характеристик.' });
  }
  if (curve?.speedRpm == null || !Number.isInteger(curve.speedRpm) || curve.speedRpm <= 0) {
    errors.push({ path: 'curve.speedRpm', message: 'Укажите частоту вращения.' });
  }
  const frequency = curve?.frequencyHz;
  if (!(frequency != null && Number.isFinite(frequency) && frequency > 0) && !(curve?.hydraulicsOnly && frequency == null)) {
    errors.push({ path: 'curve.frequencyHz', message: 'Укажите частоту питания.' });
  }
  return errors;
}
