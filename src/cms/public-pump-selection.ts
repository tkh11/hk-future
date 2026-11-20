import 'server-only';

import type { PumpIntersections, SystemCurve } from '@/lib/pump-operating-point';
import { checkPumpCandidate, closestPumpsPerRow } from '@/lib/pump-candidates';
import { defaultPumpFluid, type PumpFluid } from '@/lib/pump-fluid';
import { hasPumpMotorReserve } from '@/lib/pump-motor';
import { isPumpFlowOptimal, preparePumpCurve, preparePumpNpsh, preparePumpPowerP2, pumpPerformanceAt, pumpPowerP2At, type PreparedPerformanceCurve, type PreparedPumpCurve, type PumpDuty } from '@/lib/pump-selection';
import type { PumpSystemType } from '@/lib/pump-system-types';
import { prepareFluidPumpCurves } from '@/lib/pump-viscosity';
import { getCMS } from './client';
import type { PumpSelectionRecord } from './payload-types';
import { selectionSpecificationFields } from './pump-selection-data';
import { pumpSelectionProjection } from './pump-selection-fields';
import { pumpGroupPath, pumpModelKey, type PumpSelectionGroupNode } from './pump-selection-groups';
import { resolvePumpCharacteristics } from './pump-shared-characteristics';

type PumpIdentity = { sku: string; name: string };
export type OperatingResult = PumpIdentity & PumpIntersections & {
  rowId: string;
  headMarginM: number;
  meetsDuty: boolean;
  optimal: boolean;
  efficiency: number | null;
  connectionSize: string | null;
  powerKw: number | null;
  speedRpm: number;
  voltageV: number | null;
  voltageDeltaV: string | null;
  voltageStarV: string | null;
  phases: number | null;
  frequencyHz: number | null;
};
export type PumpChart = OperatingResult & {
  curve: PreparedPumpCurve;
  waterCurve?: PreparedPumpCurve;
  efficiencyCurve: PreparedPerformanceCurve | null;
  npshCurve: PreparedPerformanceCurve | null;
  powerP2Curve: PreparedPerformanceCurve | null;
  viscosityCorrected: boolean;
  fluidTemperatureRange?: { minC: number | null; maxC: number | null };
};

type FluidLimits = Pick<NonNullable<PumpSelectionRecord['pumpSelection']>, 'temperatureMinC' | 'temperatureMaxC' | 'fluidLimits'>;

function allowedFluidTemperature(limits: FluidLimits, fluid: PumpFluid) {
  if (fluid.kind === 'custom') return { minC: null, maxC: null };
  const { temperatureC, concentrationPct } = fluid;
  const approval = fluid.kind === 'water' ? undefined : limits.fluidLimits?.find(({ kind }) => kind === fluid.kind);
  if (fluid.kind !== 'water' && (
    concentrationPct === null || approval?.concentrationMinPct == null || approval.concentrationMaxPct == null ||
    concentrationPct < approval.concentrationMinPct || concentrationPct > approval.concentrationMaxPct
  )) return null;
  const min = Math.max(limits.temperatureMinC ?? -Infinity, approval?.temperatureMinC ?? -Infinity);
  const max = Math.min(limits.temperatureMaxC ?? Infinity, approval?.temperatureMaxC ?? Infinity);
  if (temperatureC < min || temperatureC > max) return null;
  return { minC: Number.isFinite(min) ? min : null, maxC: Number.isFinite(max) ? max : null };
}

const published = { _status: { equals: 'published' } } as const;
const publicRead = { draft: false, overrideAccess: false, disableErrors: true, depth: 0, limit: 100, sort: 'id' } as const;
const specificationSelect = Object.fromEntries(selectionSpecificationFields.map(({ key }) => [key, true as const]));

type SharedGroup = PumpSelectionGroupNode & { sharedCharacteristics?: unknown };
export type PumpSpecification = Pick<PumpSelectionRecord, 'id' | 'pumpSelection' | 'specs' | 'curve'> | null;

async function readSpecification(payload: Awaited<ReturnType<typeof getCMS>>, sku: string, groups: SharedGroup[]): Promise<PumpSpecification> {
  const { docs: [doc] } = await payload.find({
    ...publicRead, limit: 1, collection: 'pump-selection-records', context: { pumpSelectionProjection },
    where: { ...published, sku: { equals: sku } },
    select: {
      group: true, characteristicOverrides: true,
      pumpSelection: specificationSelect,
      specs: { netWeightKg: true },
      curve: { nominalCurrentA: true, hydraulicsOnly: true },
    },
  });
  if (!doc || doc.curve?.hydraulicsOnly) return null;
  const { group, characteristicOverrides, ...specification } = doc;
  const groupId = typeof group === 'object' ? group?.id : group;
  const path = groupId == null ? [] : pumpGroupPath(groups, groupId) ?? [];
  const { record: { pumpSelection, specs, curve } } = resolvePumpCharacteristics({ ...specification, characteristicOverrides }, path);
  return { ...specification, pumpSelection, specs, curve };
}

export async function selectPublicPumps(
  duty: PumpDuty & { system: PumpSystemType },
  { systemCurve, chartSku, fluid = defaultPumpFluid }: { systemCurve: SystemCurve; chartSku?: string; fluid?: PumpFluid },
) {
  const payload = await getCMS();
  const groups: SharedGroup[] = [];
  for (let page = 1; ; page++) {
    const result = await payload.find({
      ...publicRead, page, collection: 'pump-selection-groups', context: { pumpSelectionProjection },
      select: { title: true, slug: true, parent: true, sharedCharacteristics: true },
    });
    groups.push(...result.docs.map(group => ({
      ...group, parent: typeof group.parent === 'object' ? group.parent?.id ?? null : group.parent ?? null,
    })));
    if (!result.hasNextPage) break;
  }
  let hasData = false;
  const candidates: (OperatingResult & { modelKey: string })[] = [];
  const curves = new Map<string, Pick<PumpChart,
    'curve' | 'waterCurve' | 'efficiencyCurve' | 'npshCurve' | 'viscosityCorrected' | 'fluidTemperatureRange'>>();
  for (let page = 1; ; page++) {
    const result = await payload.find({
      ...publicRead, page, collection: 'pump-selection-records',
      context: { pumpSelectionProjection },
      where: published,
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
    });
    for (const stored of result.docs) {
      if (stored._status !== 'published' || !stored.pumpSelection || !stored.curve?.points) continue;
      const groupId = typeof stored.group === 'object' ? stored.group?.id : stored.group;
      if (groupId == null) continue;
      const path = pumpGroupPath(groups, groupId);
      if (path?.length !== 3) continue;
      const { record: doc } = resolvePumpCharacteristics(stored, path);
      if (!doc.pumpSelection || !doc.curve?.points || !doc.curve.speedRpm || !Number.isInteger(doc.curve.speedRpm) || doc.curve.speedRpm <= 0) continue;
      if (!(doc.curve.frequencyHz && Number.isFinite(doc.curve.frequencyHz) && doc.curve.frequencyHz > 0)
        && !(doc.curve.hydraulicsOnly && doc.curve.frequencyHz == null)) continue;
      const curveData = {
        flowMinM3h: doc.pumpSelection.flowMinM3h ?? null,
        flowMaxM3h: doc.pumpSelection.flowMaxM3h ?? null,
        points: doc.curve.points,
      };
      if (!hasData) hasData = preparePumpCurve(curveData) !== null;
      if (!doc.systemTypes?.includes(duty.system)) continue;
      const fluidTemperatureRange = allowedFluidTemperature(doc.pumpSelection, fluid);
      if (!fluidTemperatureRange) continue;
      const performancePoints = doc.curve.hydraulicsOnly ? [] : doc.pumpSelection.performancePoints ?? [];
      const prepared = prepareFluidPumpCurves({
        ...curveData, performancePoints, speedRpm: doc.curve.speedRpm, fluid,
        impellerCount: doc.pumpSelection.impellerCount,
      });
      if (!prepared) continue;
      const { curve, efficiencyCurve, viscosityCorrected } = prepared;
      const { sku } = doc;
      const name = doc.pumpSelection.modelName?.trim() || doc.title;
      const candidate = checkPumpCandidate(curve, duty, systemCurve);
      if (candidate.status !== 'suitable') continue;
      const { point, headMarginM } = candidate;
      const efficiency = pumpPerformanceAt(efficiencyCurve, point.x);
      const specs = doc.curve.hydraulicsOnly ? null : doc.specs;
      const powerKw = specs?.powerKw ?? null;
      const shaftPower = pumpPowerP2At(curve, efficiencyCurve, point.x, fluid.densityKgM3);
      if (!hasPumpMotorReserve(shaftPower, powerKw)) continue;
      candidates.push({
        sku, name, rowId: String(path[1].id), modelKey: pumpModelKey(name, path[2].title), headMarginM,
        points: [point], coincident: false, meetsDuty: true, efficiency,
        optimal: isPumpFlowOptimal(efficiencyCurve, point.x),
        connectionSize: doc.connectionSize?.trim() || null,
        powerKw, speedRpm: doc.curve.speedRpm,
        voltageV: specs?.voltageV ?? null, phases: specs?.phases ?? null,
        voltageDeltaV: specs?.voltageDeltaV?.trim() || null,
        voltageStarV: specs?.voltageStarV?.trim() || null,
        frequencyHz: doc.curve.hydraulicsOnly ? null : doc.curve.frequencyHz ?? null,
      });
      curves.set(sku, {
        curve, efficiencyCurve, viscosityCorrected, fluidTemperatureRange,
        ...(fluid.kind === 'water' ? {} : { waterCurve: prepared.waterCurve }),
        npshCurve: preparePumpNpsh(performancePoints),
      });
    }
    if (!result.hasNextPage) break;
  }

  const operating = closestPumpsPerRow(candidates);
  const first = operating.at(0);
  const recommended = first;
  const selected = (chartSku ? operating.find(pump => pump.sku === chartSku) : undefined) ?? first;
  const selectedCurves = selected && curves.get(selected.sku);
  const chart: PumpChart | undefined = selected && selectedCurves ? {
    ...selected, ...selectedCurves,
    powerP2Curve: preparePumpPowerP2(
      selectedCurves.curve, selectedCurves.efficiencyCurve, selected.points.map(point => point.x), fluid.densityKgM3,
    ),
  } : undefined;
  const specification = chart ? await readSpecification(payload, chart.sku, groups) : null;
  return { hasData, operating, recommended, chart, specification, fluid };
}
