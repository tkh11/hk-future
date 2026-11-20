import type { CurveSample } from './curve-interpolation';
import { findPumpIntersections, type PumpIntersections, type SystemCurve } from './pump-operating-point';
import { checkPumpHead, type PreparedPumpCurve, type PumpDuty } from './pump-selection';

type CandidateCheck =
  | { status: 'suitable'; point: CurveSample; headMarginM: number }
  | { status: 'invalid-input' | 'outside-working-range' | 'incomplete-data' | 'insufficient-head'
      | 'outside-selection-range' | 'no-operating-point' | 'ambiguous-operating-point' | 'insufficient-flow' };

export function checkPumpCandidate(
  curve: PreparedPumpCurve, duty: PumpDuty, system: SystemCurve, intersections?: PumpIntersections,
): CandidateCheck {
  const head = checkPumpHead(curve, duty);
  if (head.status !== 'sufficient-head') return { status: head.status };

  const minFlowTolerance = 32 * Number.EPSILON * Math.max(curve.flowMinM3h, duty.flowM3h);
  if (duty.flowM3h - curve.flowMinM3h <= minFlowTolerance) {
    return { status: 'outside-selection-range' };
  }

  const { points, coincident } = intersections ?? findPumpIntersections(curve, system);
  if (coincident || points.length > 1) return { status: 'ambiguous-operating-point' };
  const point = points[0];
  if (!point) return { status: 'no-operating-point' };
  // Small head errors can move a numerical intersection farther along a flat curve.
  const tolerance = 512 * Number.EPSILON * Math.max(point.x, duty.flowM3h);
  if (point.x + tolerance < duty.flowM3h) return { status: 'insufficient-flow' };
  return { status: 'suitable', point, headMarginM: head.headMarginM };
}

export function closestPumpsPerRow<T extends { rowId: string; modelKey: string; headMarginM: number; sku: string; optimal?: boolean }>(pumps: readonly T[]): T[] {
  const models = new Map<string, Set<string>>();
  const closest = [...pumps].sort((a, b) => a.headMarginM - b.headMarginM || a.sku.localeCompare(b.sku));
  return closest.filter(pump => {
    const selected = models.get(pump.rowId) ?? new Set<string>();
    if (selected.size >= 2 && !selected.has(pump.modelKey)) return false;
    selected.add(pump.modelKey);
    models.set(pump.rowId, selected);
    return true;
  }).sort((a, b) => Number(!!b.optimal) - Number(!!a.optimal));
}
