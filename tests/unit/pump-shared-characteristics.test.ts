import { describe, expect, it } from 'vitest';
import {
  getSharedPumpValue,
  pumpSharedCharacteristicsSchema,
  pumpSharedFieldDefinitions,
  pumpSharedOverrideKeysSchema,
  resolvePumpCharacteristics,
} from '../../src/cms/pump-shared-characteristics';

const glycol = {
  kind: 'propyleneGlycol',
  temperatureMinC: -10,
  temperatureMaxC: 80,
  concentrationMinPct: 0,
  concentrationMaxPct: 40,
} as const;

const series = { id: 1, title: 'HIP', sharedCharacteristics: {
  description: 'Описание серии', fluid: 'Вода', wettedMaterial: 'Чугун', temperatureMinC: 0,
  voltageV: 380, phases: 3, speedRpm: 2900, frequencyHz: 50, systemTypes: ['heating'], fluidLimits: [glycol],
} };
const row = { id: 2, title: 'HIP 40', sharedCharacteristics: { wettedMaterial: 'Сталь', connectionSize: 'DN 40' } };
const execution = { id: 3, title: 'SSVF', sharedCharacteristics: { wettedMaterial: 'Нержавеющая сталь', description: ' ' } };

describe('pump shared characteristics', () => {
  it('validates sparse shared fields with existing engineering constraints', () => {
    expect(pumpSharedCharacteristicsSchema.parse({})).toEqual({});
    expect(pumpSharedCharacteristicsSchema.parse({ temperatureMinC: 0, fluidLimits: [], systemTypes: [] }))
      .toEqual({ temperatureMinC: 0, fluidLimits: [], systemTypes: [] });
    expect(pumpSharedCharacteristicsSchema.parse({ voltageDeltaV: '220–240', fluidLimits: [glycol] }))
      .toEqual({ voltageDeltaV: '220–240', fluidLimits: [glycol] });
    for (const value of [
      { systemTypes: ['heating', 'heating'] }, { systemTypes: ['unlisted'] }, { voltageStarV: '380 В' },
      { temperatureMinC: -280 }, { temperatureMinC: 80, temperatureMaxC: 20 }, { speedRpm: 0 },
      { frequencyHz: 0 }, { impellerCount: 1.2 }, { motorPoles: 2.5 }, { fluidLimits: [glycol, glycol] },
    ]) expect(pumpSharedCharacteristicsSchema.safeParse(value).success).toBe(false);
    expect(pumpSharedFieldDefinitions.map(({ key }) => key).sort())
      .toEqual(Object.keys(pumpSharedCharacteristicsSchema.shape).sort());
    expect(pumpSharedOverrideKeysSchema.parse(['systemTypes', 'description'])).toEqual(['systemTypes', 'description']);
    expect(pumpSharedOverrideKeysSchema.safeParse(['fluidLimits', 'fluidLimits']).success).toBe(false);
    expect(pumpSharedOverrideKeysSchema.safeParse(['sku']).success).toBe(false);
  });

  it('resolves the closest shared value and preserves the stored SKU engineering data', () => {
    const sku = {
      sku: '77075449', connectionSize: ' ',
      pumpSelection: { description: '', fluid: 'Вода морская', wettedMaterial: null, temperatureMinC: null,
        performancePoints: [{ flow: 6, efficiency: 70, powerP2: null, npsh: 2 }] },
      specs: { powerKw: 7.5, voltageV: 0, netWeightKg: 75 },
      curve: { nominalCurrentA: 14.9, points: [{ flow: 0, head: 55 }, { flow: 32, head: 37 }] },
    };
    const before = structuredClone(sku);
    const path = [series, row, execution];
    const beforePath = structuredClone(path);
    const { record, inherited } = resolvePumpCharacteristics(sku, path);

    expect(record).toEqual({
      sku: '77075449', systemTypes: ['heating'], connectionSize: ' ',
      pumpSelection: { ...sku.pumpSelection, description: 'Описание серии', wettedMaterial: 'Нержавеющая сталь',
        temperatureMinC: 0, fluidLimits: [glycol] },
      specs: { ...sku.specs, phases: 3 },
      curve: { ...sku.curve, speedRpm: 2900, frequencyHz: 50 },
    });
    expect(inherited.wettedMaterial).toEqual({ groupId: 3, title: 'SSVF', value: 'Нержавеющая сталь' });
    expect(inherited.description).toEqual({ groupId: 1, title: 'HIP', value: 'Описание серии' });
    expect(inherited).not.toHaveProperty('connectionSize');
    expect(inherited.fluid).toBeUndefined();
    expect(inherited.voltageV).toBeUndefined();
    expect(getSharedPumpValue(record, 'voltageV')).toBe(0);
    expect(getSharedPumpValue(record, 'speedRpm')).toBe(2900);
    expect(sku).toEqual(before);
    expect(path).toEqual(beforePath);
  });

  it('distinguishes legacy empty arrays from explicit overrides and folder defaults', () => {
    const sku = { systemTypes: [], pumpSelection: { fluidLimits: [], description: '' } };
    const { record: legacy } = resolvePumpCharacteristics(sku, [series]);
    expect(getSharedPumpValue(legacy, 'systemTypes')).toEqual(['heating']);
    expect(getSharedPumpValue(legacy, 'fluidLimits')).toEqual([glycol]);

    const explicit = { ...sku, characteristicOverrides: ['fluidLimits', 'systemTypes', 'description'] };
    const { record, inherited } = resolvePumpCharacteristics(explicit, [series]);
    expect(record).toMatchObject(sku);
    expect(inherited.systemTypes).toBeUndefined();
    expect(inherited.fluidLimits).toBeUndefined();
    expect(inherited.description).toBeUndefined();

    const malformed = { ...sku, characteristicOverrides: { fluidLimits: true } };
    const { record: ignored } = resolvePumpCharacteristics(malformed, [series]);
    expect(getSharedPumpValue(ignored, 'fluidLimits')).toEqual([glycol]);

    const { inherited: folder } = resolvePumpCharacteristics(sku, [series, {
      ...row, sharedCharacteristics: { fluidLimits: [], systemTypes: [] },
    }]);
    expect(folder.fluidLimits).toEqual({ groupId: 2, title: 'HIP 40', value: [] });
    expect(folder.systemTypes).toEqual({ groupId: 2, title: 'HIP 40', value: [] });
  });

  it('keeps the original record values if there is no matching shared folder', () => {
    const sku = { systemTypes: ['drainage'] as const, pumpSelection: { temperatureMinC: 0 } };
    const { record, inherited } = resolvePumpCharacteristics(sku, [{ id: 1, title: 'HIP' }]);
    expect(record).toEqual(sku);
    expect(inherited).toEqual({});
  });
});
