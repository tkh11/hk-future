// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../docs/pump-selection/hip32-ssvf-fixture.json';
import { pumpSelectionProjection } from '@/cms/pump-selection-fields';
import { selectPublicPumps } from '@/cms/public-pump-selection';
import { defaultPumpFluid, resolvePumpFluid } from '@/lib/pump-fluid';
import { createSystemCurve } from '@/lib/pump-operating-point';

const { find, records, specifications } = vi.hoisted(() => ({ find: vi.fn(), records: vi.fn(), specifications: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/cms/client', () => ({ getCMS: async () => ({ find }) }));
const groups = [
  { id: 1, title: 'HIP', slug: 'hip', parent: null },
  { id: 2, title: 'HIP 32', slug: 'hip-32', parent: 1 },
  { id: 3, title: 'SSVF', slug: 'ssvf', parent: 2 },
  { id: 4, title: 'HIP 40', slug: 'hip-40', parent: 1 },
  { id: 5, title: 'SSVF', slug: 'ssvf', parent: 4 },
  { id: 6, title: 'HIP 50', slug: 'hip-50', parent: 1 },
  { id: 7, title: 'SSVF', slug: 'ssvf', parent: 6 },
  { id: 8, title: 'Other', slug: 'other', parent: null },
  { id: 9, title: 'Other row', slug: 'row', parent: 8 },
  { id: 10, title: 'Execution', slug: 'execution', parent: 9 },
  { id: 11, title: 'CSEF', slug: 'csef', parent: 2 },
];

const record = (sku: string, head: number, performancePoints: { flow: number; efficiency?: number | null; npsh?: number | null; powerP2?: number | null }[] = [
  { flow: 4, efficiency: 65 }, { flow: 12, efficiency: 65 },
], systemTypes = ['heating']) => ({
  sku, title: sku, _status: 'published', systemTypes, connectionSize: 'DN 32',
  group: sku.startsWith('40-') ? 5 : sku.startsWith('50-') ? 7 : sku === 'OTHER' ? 10 : 3,
  pumpSelection: { flowMinM3h: 4, flowMaxM3h: 12, sourceNotes: 'Private', performancePoints },
  specs: { powerKw: 2.2, voltageV: 380, phases: 3 },
  curve: { speedRpm: 2900, frequencyHz: 50, points: [{ flow: 4, head }, { flow: 12, head }] },
});
const duty = { flowM3h: 8, requiredHeadM: 8, system: 'heating' as const };
const systemCurve = createSystemCurve(duty, 0)!;
const close = record('CLOSE', 9, [
  { flow: 4, efficiency: 60, npsh: 1.39, powerP2: 8 },
  { flow: 12, efficiency: 60, npsh: 1.90, powerP2: 8 },
]);
const next = { ...record('NEXT', 10.125, [{ flow: 4, efficiency: 65 }, { flow: 12, efficiency: 65 }]),
  specs: { ...close.specs, powerKw: 0.55 } };
const higherEta = { ...record('HIGHER-ETA', 12.5, [{ flow: 4, efficiency: 90 }, { flow: 12, efficiency: 90 }]),
  specs: { ...close.specs, powerKw: 0.55 } };
const lowHead = record('LOW-HEAD', 4.5, [{ flow: 6, efficiency: 98 }]);

describe('public pump selection', () => {
  beforeEach(() => {
    records.mockReset();
    specifications.mockReset().mockResolvedValue({ docs: [] });
    find.mockReset().mockImplementation(options => options.collection === 'pump-selection-groups'
      ? Promise.resolve({ docs: groups }) : options.where.sku ? specifications(options) : records(options));
  });

  it('chooses the two closest head curves rather than the most efficient larger pump', async () => {
    records.mockResolvedValueOnce({ docs: [higherEta, lowHead, next, close, record('WATER', 9, [], ['waterSupply'])] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.operating.map(({ sku }) => sku)).toEqual(['CLOSE', 'NEXT']);
    expect(result.recommended).toMatchObject({ sku: 'CLOSE', headMarginM: 1, rowId: '2', efficiency: 60 });
    expect(result.chart).toMatchObject({
      sku: 'CLOSE', powerKw: 2.2, speedRpm: 2900, voltageV: 380, phases: 3, frequencyHz: 50,
    });
    expect(result.chart).not.toHaveProperty('sourceNotes');
    expect(find).toHaveBeenCalledTimes(3);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'pump-selection-records', draft: false, overrideAccess: false,
      context: { pumpSelectionProjection },
      where: { _status: { equals: 'published' } },
      select: {
        sku: true, title: true, group: true, connectionSize: true, _status: true, systemTypes: true, characteristicOverrides: true,
        pumpSelection: {
          modelName: true, flowMinM3h: true, flowMaxM3h: true,
          temperatureMinC: true, temperatureMaxC: true, fluidLimits: true, impellerCount: true,
          performancePoints: { flow: true, efficiency: true, npsh: true },
        },
        specs: { powerKw: true, voltageV: true, voltageDeltaV: true, voltageStarV: true, phases: true },
        curve: { points: true, speedRpm: true, frequencyHz: true, hydraulicsOnly: true },
      },
    }));
  });

  it('keeps up to two matches in each row and alternatives from other series', async () => {
    const tooLarge = record('50-A', 9.1);
    tooLarge.pumpSelection.flowMinM3h = 9;
    records.mockResolvedValueOnce({ docs: [higherEta, next, close,
      record('40-C', 12), record('40-A', 9.5), record('40-B', 11), tooLarge, record('OTHER', 9.25)] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.operating.map(({ sku }) => sku)).toEqual(['CLOSE', 'OTHER', '40-A', 'NEXT', '40-B']);
  });

  it('marks and orders optimal pumps only after selecting the two nearest models', async () => {
    const efficiency = [{ flow: 4, efficiency: 30 }, { flow: 10, efficiency: 80 }, { flow: 12, efficiency: 65 }];
    records.mockResolvedValueOnce({ docs: [
      record('CLOSER', 8, efficiency), record('UPPER', 18, efficiency),
      record('AT-PEAK', 12.5, efficiency), record('LOWER', 8.5 ** 2 / 8, efficiency), record('40-NO-ETA', 9, []),
    ] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.operating.map(({ sku, optimal }) => [sku, optimal])).toEqual([
      ['LOWER', true], ['CLOSER', false],
    ]);
    expect(result.chart?.sku).toBe('LOWER');
  });

  it('keeps suitable executions of two distinct models and checks each execution independently', async () => {
    records.mockResolvedValueOnce({ docs: [
      { ...record('6-S', 9), title: 'HIP 32-6/2 R SSVF' },
      { ...record('6-C', 9.1), title: 'HIP 32-6/2 R', group: 11 },
      { ...record('10-S', 10), title: 'HIP 32-10/2 SSVF' },
      { ...record('10-C', 10.1), title: 'HIP 32-10/2', group: 11 },
      { ...record('10-WATER', 10), title: 'HIP 32-10/2 SSVF', systemTypes: ['waterSupply'] },
      { ...record('10-LOW', 7), title: 'HIP 32-10/2 SSVF' },
      { ...record('14-S', 11), title: 'HIP 32-14/2 SSVF' },
    ] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.operating.map(({ sku }) => sku)).toEqual(['6-S', '6-C', '10-S', '10-C']);
  });

  it('uses systems assigned to each published pump, including multiple systems', async () => {
    records.mockResolvedValue({ docs: [{ ...close, systemTypes: ['heating', 'drainage'] }, { ...next, systemTypes: [] }] });
    const drainage = await selectPublicPumps({ ...duty, system: 'drainage' }, { systemCurve });
    expect(drainage.operating.map(({ sku }) => sku)).toEqual(['CLOSE']);
    await expect(selectPublicPumps({ ...duty, system: 'sewerage' }, { systemCurve }))
      .resolves.toMatchObject({ hasData: true, operating: [] });
  });

  it('uses published folder characteristics for selection and the specification with SKU exceptions', async () => {
    const tree = groups.map(group => group.id === 1 ? {
      ...group, sharedCharacteristics: {
        systemTypes: ['heating'], temperatureMinC: 0, temperatureMaxC: 80,
        description: 'Общее описание', wettedMaterial: 'Чугун', voltageV: 380, phases: 3, frequencyHz: 50,
      }, sharedCharacteristicsDraft: { systemTypes: [], description: 'Черновик' },
    } : group.id === 2 ? { ...group, sharedCharacteristics: { speedRpm: 2900, connectionSize: 'DN 40' } } : group);
    find.mockImplementation(options => options.collection === 'pump-selection-groups'
      ? Promise.resolve({ docs: tree }) : options.where.sku ? specifications(options) : records(options));
    records.mockResolvedValue({ docs: [{
      ...close, systemTypes: [], curve: { ...close.curve, speedRpm: null, frequencyHz: null },
      specs: { ...close.specs, voltageV: null, phases: null },
    }] });
    specifications.mockResolvedValue({ docs: [{
      group: 3, characteristicOverrides: ['wettedMaterial'], pumpSelection: { wettedMaterial: 'Нержавеющая сталь' },
    }] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.chart).toMatchObject({ sku: 'CLOSE', speedRpm: 2900, voltageV: 380, phases: 3, frequencyHz: 50, connectionSize: 'DN 32' });
    expect(result.specification).toMatchObject({ pumpSelection: { description: 'Общее описание', wettedMaterial: 'Нержавеющая сталь' } });
    const hotWater = resolvePumpFluid({ kind: 'water', temperatureC: 90, concentrationPct: null })!;
    await expect(selectPublicPumps(duty, { systemCurve, fluid: hotWater })).resolves.toMatchObject({ operating: [] });
  });

  it('opens a shortlisted curve and ignores an excluded curve requested by URL', async () => {
    records.mockResolvedValue({ docs: [close, next, higherEta, lowHead] });
    const result = await selectPublicPumps(duty, { systemCurve, chartSku: 'NEXT' });
    expect(result.recommended?.sku).toBe('CLOSE');
    expect(result.chart).toMatchObject({ sku: 'NEXT', efficiency: 65 });
    await expect(selectPublicPumps(duty, { systemCurve, chartSku: 'HIGHER-ETA' })).resolves.toMatchObject({ chart: { sku: 'CLOSE' } });
    await expect(selectPublicPumps(duty, { systemCurve, chartSku: 'LOW-HEAD' })).resolves.toMatchObject({ chart: { sku: 'CLOSE' } });
  });

  it('reads only the selected pump specification from the published projection', async () => {
    records.mockResolvedValueOnce({ docs: [close, next] });
    const data = {
      pumpSelection: { fluid: 'Вода', temperatureMinC: 0, wettedMaterial: 'Чугун' },
      specs: { netWeightKg: 25 },
      curve: { nominalCurrentA: 1.1 },
    };
    specifications.mockResolvedValueOnce({ docs: [data] });

    const { specification } = await selectPublicPumps(duty, { systemCurve, chartSku: 'NEXT' });
    expect(specification).toEqual(data);
    expect(specifications).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      draft: false, overrideAccess: false, context: { pumpSelectionProjection },
      where: { _status: { equals: 'published' }, sku: { equals: 'NEXT' } },
      select: expect.objectContaining({ pumpSelection: expect.objectContaining({ description: true, fluid: true, wettedMaterial: true }) }),
    }));
    const projection = specifications.mock.calls[0][0].select.pumpSelection;
    for (const key of ['sourceNotes', 'sourcePdf', 'photo', 'drawing', 'performancePoints']) {
      expect(projection).not.toHaveProperty(key);
    }
  });

  it('calculates displayed P2 from head and efficiency instead of stored catalog P2', async () => {
    records.mockResolvedValueOnce({ docs: [close] });
    const { chart } = await selectPublicPumps(duty, { systemCurve });
    expect(chart?.powerP2Curve?.first.y).toBeCloseTo(defaultPumpFluid.densityKgM3 * 9.80665 * 4 * 9 / (3_600_000 * 0.6), 12);
    expect(chart?.npshCurve?.segments).toHaveLength(1);
    expect(chart?.points[0].x).toBeCloseTo(Math.sqrt(72), 12);
  });

  it('checks the motor with the density of the selected fluid before shortlisting', async () => {
    const pump = { ...close, specs: { ...close.specs, powerKw: 0.41 } };
    records.mockResolvedValue({ docs: [pump] });
    const warmWater = resolvePumpFluid({ kind: 'water', temperatureC: 90, concentrationPct: null })!;
    await expect(selectPublicPumps(duty, { systemCurve })).resolves.toMatchObject({ hasData: true, operating: [] });
    const { chart } = await selectPublicPumps(duty, { systemCurve, fluid: warmWater });
    expect(chart?.sku).toBe('CLOSE');
    expect(chart?.points[0].x).toBeCloseTo(Math.sqrt(72), 12);
    expect(chart?.powerP2Curve?.first.y).toBeCloseTo(warmWater.densityKgM3 * 9.80665 * 4 * 9 / (3_600_000 * 0.6), 12);
  });

  it('rejects exact reserve equality at actual flow even if requested flow would qualify', async () => {
    const actualFlow = Math.sqrt(72);
    const exactRating = 1.2 * defaultPumpFluid.densityKgM3 * 9.80665 * actualFlow * 9 / (3_600_000 * 0.6);
    records.mockResolvedValueOnce({ docs: [
      { ...close, sku: 'EQUAL', specs: { ...close.specs, powerKw: exactRating } },
      { ...close, sku: 'ABOVE', specs: { ...close.specs, powerKw: exactRating + 0.00001 } },
    ] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.operating.map(({ sku }) => sku)).toEqual(['ABOVE']);
    expect(result.chart?.points[0].x).toBeCloseTo(actualFlow, 12);
  });

  it('uses only manual viscosity and density for a custom fluid, independent of glycol approvals or sheet metadata', async () => {
    const pump = { ...close, pumpSelection: { ...close.pumpSelection, temperatureMinC: 0, temperatureMaxC: 75,
      performancePoints: [{ flow: 4, efficiency: 50 }, { flow: 8, efficiency: 65 }, { flow: 12, efficiency: 50 }],
    } };
    records.mockResolvedValue({ docs: [pump] });
    const fluid = {
      kind: 'custom' as const, name: 'Масло', concentrationPct: null, temperatureC: null, densityKgM3: 900, kinematicViscosityMm2S: 12,
    };
    const { chart } = await selectPublicPumps(duty, { systemCurve, fluid });
    expect(chart).toMatchObject({ sku: 'CLOSE', viscosityCorrected: true });
    const withMetadata = await selectPublicPumps(duty, { systemCurve, fluid: {
      ...fluid, name: 'Другая марка', temperatureC: 200, concentrationPct: 95,
    } });
    expect(withMetadata.chart).toEqual(chart);
    const denser = await selectPublicPumps(duty, { systemCurve, fluid: { ...fluid, densityKgM3: 990 } });
    expect(denser.chart?.curve).toEqual(chart!.curve);
    expect(denser.chart?.powerP2Curve?.last.y).toBeCloseTo(1.1 * chart!.powerP2Curve!.last.y, 8);
    const thin = await selectPublicPumps(duty, { systemCurve, fluid: { ...fluid, kinematicViscosityMm2S: 1 } });
    expect(thin.chart?.curve).toEqual(chart!.waterCurve);
  });

  it('corrects the selected glycol curves and keeps their original water Q–H and NPSHr references', async () => {
    const pump = {
      ...close, specs: { ...close.specs, powerKw: 1 },
      curve: { ...close.curve, points: [{ flow: 0, head: 9 }, ...close.curve.points, { flow: 14, head: 8 }] },
      pumpSelection: {
        ...close.pumpSelection, temperatureMinC: -10, temperatureMaxC: 75, impellerCount: 1,
        fluidLimits: [
          { kind: 'propyleneGlycol', temperatureMinC: -10, temperatureMaxC: 80, concentrationMinPct: 20, concentrationMaxPct: 40 },
          { kind: 'ethyleneGlycol', temperatureMinC: -10, temperatureMaxC: 80, concentrationMinPct: 20, concentrationMaxPct: 40 },
        ],
        performancePoints: [
          { flow: 4, efficiency: 48, npsh: 1.2 }, { flow: 8, efficiency: 65, npsh: 2 }, { flow: 12, efficiency: 54, npsh: 3 },
        ],
      },
    };
    records.mockResolvedValue({ docs: [pump, record('WATER-ONLY', 10)] });
    const water = await selectPublicPumps(duty, { systemCurve });
    expect(water.chart).toMatchObject({
      sku: 'CLOSE', viscosityCorrected: false, fluidTemperatureRange: { minC: -10, maxC: 75 },
    });
    expect(water.chart).not.toHaveProperty('waterCurve');
    expect(water.chart?.npshCurve?.segments).toHaveLength(2);
    for (const kind of ['propyleneGlycol', 'ethyleneGlycol'] as const) {
      const glycol = resolvePumpFluid({ kind, temperatureC: 20, concentrationPct: 30 })!;
      const result = await selectPublicPumps(duty, { systemCurve, fluid: glycol });
      expect(result.operating.map(({ sku }) => sku)).toEqual(['CLOSE']);
      expect(result.chart).toMatchObject({
        viscosityCorrected: true, npshCurve: water.chart?.npshCurve, fluidTemperatureRange: { minC: -10, maxC: 75 },
      });
      expect(result.chart?.points[0].x).toBeLessThan(Math.sqrt(72));
      expect(result.chart?.waterCurve).toEqual(water.chart?.curve);
      expect(result.chart?.curve).not.toEqual(result.chart?.waterCurve);
    }
    const warmGlycol = resolvePumpFluid({ kind: 'ethyleneGlycol', temperatureC: 75, concentrationPct: 20 })!;
    const uncorrected = await selectPublicPumps(duty, { systemCurve, fluid: warmGlycol });
    expect(uncorrected.chart).toMatchObject({
      viscosityCorrected: false, waterCurve: water.chart?.curve, npshCurve: water.chart?.npshCurve,
    });
    expect(uncorrected.chart?.waterCurve).toEqual(uncorrected.chart?.curve);
    const tooConcentrated = resolvePumpFluid({ kind: 'propyleneGlycol', temperatureC: 20, concentrationPct: 45 })!;
    await expect(selectPublicPumps(duty, { systemCurve, fluid: tooConcentrated })).resolves.toMatchObject({ operating: [] });
    records.mockResolvedValue({ docs: [pump] });
    const tooHot = resolvePumpFluid({ kind: 'water', temperatureC: 90, concentrationPct: null })!;
    await expect(selectPublicPumps(duty, { systemCurve, fluid: tooHot })).resolves.toMatchObject({ operating: [] });
  });

  it('requires enough efficiency data at the actual working point to check P2', async () => {
    records.mockResolvedValueOnce({ docs: [record('NO-ETA', 12.5, [{ flow: 8, efficiency: 78 }, { flow: 9, efficiency: 80 }])] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.operating).toEqual([]);
  });

  it('excludes hydraulic-only records and pumps missing a nominal rating', async () => {
    records.mockResolvedValueOnce({ docs: [
      { ...close, curve: { ...close.curve, hydraulicsOnly: true, frequencyHz: null } },
      { ...next, specs: { ...next.specs, powerKw: null } },
    ] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.operating).toEqual([]);
  });

  it('excludes drafts and records with missing or invalid mode data', async () => {
    records.mockResolvedValueOnce({ docs: [
      { ...close, _status: 'draft' },
      { ...higherEta, curve: { ...higherEta.curve, speedRpm: 0 } },
      { ...higherEta, curve: { ...higherEta.curve, frequencyHz: null } },
      { ...close, group: null },
    ] });
    await expect(selectPublicPumps(duty, { systemCurve })).resolves.toMatchObject({ hasData: false, operating: [] });
  });

  it('distinguishes no suitable pumps from an empty published dataset', async () => {
    records.mockResolvedValueOnce({ docs: [lowHead] }).mockResolvedValueOnce({ docs: [] });
    await expect(selectPublicPumps(duty, { systemCurve })).resolves.toMatchObject({ hasData: true, operating: [], chart: undefined });
    await expect(selectPublicPumps(duty, { systemCurve })).resolves.toMatchObject({ hasData: false, operating: [] });
  });

  it('chooses the pair after reading every page of published data', async () => {
    records.mockResolvedValueOnce({ docs: [higherEta, next], hasNextPage: true })
      .mockResolvedValueOnce({ docs: [close], hasNextPage: false });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.operating.map(({ sku }) => sku)).toEqual(['CLOSE', 'NEXT']);
    expect(records).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));
  });

  it('selects the nearest HIP 32 models with sufficient motor reserve from the Studio fixture', async () => {
    records.mockResolvedValueOnce({ docs: fixture.variants.map(({ sku, report, specs, curve }) => ({
      sku, group: 3, title: report.modelName, _status: 'published', systemTypes: ['heating'], pumpSelection: report, specs, curve,
    })) });
    const requested = { flowM3h: 4.5, requiredHeadM: 15, system: 'heating' as const };
    const result = await selectPublicPumps(requested, { systemCurve: createSystemCurve(requested, 0)! });
    expect(result.operating.map(({ sku }) => sku)).toEqual(['77015401', '77015402']);
    expect(result.recommended?.efficiency).toBeGreaterThan(0);
  });

  it('keeps total head at 13 m when static head is 2 m', async () => {
    records.mockResolvedValue({ docs: [record('CLOSE', 14), record('NEXT', 15.5), record('LOW-HEAD', 12)] });
    const requested = { flowM3h: 5, requiredHeadM: 13, system: 'heating' as const };
    const system = createSystemCurve(requested, 2)!;
    const result = await selectPublicPumps(requested, { systemCurve: system });
    expect(system.coefficient).toBeCloseTo(0.44, 12);
    expect(result.operating.map(({ sku }) => sku)).toEqual(['CLOSE', 'NEXT']);
    expect(result.operating[0].headMarginM).toBe(1);
    expect(result.operating[0].points[0].x).toBeCloseTo(Math.sqrt(12 / 0.44), 10);
  });

  it('uses new Studio rows, arbitrary SKUs, DN and per-pump speed without code allowlists', async () => {
    records.mockResolvedValue({ docs: [{
      ...record('NEW-ANY-123', 9), group: 10, connectionSize: 'G 1½',
      curve: { ...close.curve, speedRpm: 1450, frequencyHz: 60 },
      privateField: 'must not escape',
    }] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.chart).toMatchObject({ sku: 'NEW-ANY-123', rowId: '9', connectionSize: 'G 1½', speedRpm: 1450, frequencyHz: 60 });
    expect(result.chart).not.toHaveProperty('privateField');
    expect(find).toHaveBeenCalledTimes(3);
  });

  it('reads every group page before resolving rows', async () => {
    find.mockImplementation(options => options.collection === 'pump-selection-groups'
      ? Promise.resolve(options.page === 1 ? { docs: groups.slice(0, 2), hasNextPage: true } : { docs: groups.slice(2), hasNextPage: false })
      : options.where.sku ? specifications(options) : records(options));
    records.mockResolvedValue({ docs: [close] });
    const result = await selectPublicPumps(duty, { systemCurve });
    expect(result.chart?.rowId).toBe('2');
    expect(find).toHaveBeenCalledTimes(4);
  });
});
