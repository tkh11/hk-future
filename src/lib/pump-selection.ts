import { evaluateCurve, interpolateCurve, type CurveSample, type CurveSegment } from './curve-interpolation';

export type PumpCurveData = Readonly<{
  flowMinM3h: number | null;
  flowMaxM3h: number | null;
  points: readonly Readonly<{ flow: number; head: number }>[];
}>;

export type PreparedPumpCurve = Readonly<{
  flowMinM3h: number;
  flowMaxM3h: number;
  segments: readonly CurveSegment[];
}>;

export type PumpDuty = Readonly<{
  flowM3h: number;
  requiredHeadM: number;
}>;

export type PumpHeadCheck =
  | { status: 'invalid-input' }
  | { status: 'outside-working-range' }
  | { status: 'incomplete-data'; reason: 'invalid-curve-data' | 'outside-curve-range' }
  | {
      status: 'sufficient-head' | 'insufficient-head';
      requiredHeadM: number;
      availableHeadM: number;
      headMarginM: number;
    };

function isNonnegativeNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

/** Prepare once per set of saved Q–H points and working limits. */
export function preparePumpCurve({ flowMinM3h, flowMaxM3h, points }: PumpCurveData): PreparedPumpCurve | null {
  if (!isNonnegativeNumber(flowMinM3h) || !isNonnegativeNumber(flowMaxM3h) || flowMinM3h > flowMaxM3h) {
    return null;
  }
  if (points.length < 2 || points.some(({ flow, head }) => !isNonnegativeNumber(flow) || !isNonnegativeNumber(head))) {
    return null;
  }
  if (points[0].flow > flowMaxM3h || points[points.length - 1].flow < flowMinM3h) return null;

  try {
    const segments = interpolateCurve(points.map(({ flow, head }) => ({ x: flow, y: head })));
    if (segments.some(({ control1, control2 }) => !Number.isFinite(control1.y) || !Number.isFinite(control2.y))) {
      return null;
    }
    return { flowMinM3h, flowMaxM3h, segments };
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

export function checkPumpHead(curve: PreparedPumpCurve | null, { flowM3h, requiredHeadM }: PumpDuty): PumpHeadCheck {
  if (!isNonnegativeNumber(flowM3h) || !isNonnegativeNumber(requiredHeadM)) return { status: 'invalid-input' };
  if (!curve) return { status: 'incomplete-data', reason: 'invalid-curve-data' };
  // Converting a user-entered flow to m³/h can round the inclusive upper endpoint upward.
  if (flowM3h > curve.flowMaxM3h && flowM3h - curve.flowMaxM3h <= 32 * Number.EPSILON * curve.flowMaxM3h) {
    flowM3h = curve.flowMaxM3h;
  }
  if (flowM3h < curve.flowMinM3h || flowM3h > curve.flowMaxM3h) return { status: 'outside-working-range' };

  const availableHeadM = evaluateCurve(curve.segments, flowM3h);
  if (availableHeadM === null) return { status: 'incomplete-data', reason: 'outside-curve-range' };

  const difference = availableHeadM - requiredHeadM;
  const tolerance = 64 * Number.EPSILON * Math.max(1, availableHeadM, requiredHeadM);
  const headMarginM = Math.abs(difference) <= tolerance ? 0 : difference;
  return {
    status: headMarginM >= 0 ? 'sufficient-head' : 'insufficient-head',
    requiredHeadM,
    availableHeadM,
    headMarginM,
  };
}

export type PreparedPerformanceCurve = Readonly<{
  first: CurveSample;
  last: CurveSample;
  segments: readonly CurveSegment[];
}>;

function preparePerformanceCurve(samples: CurveSample[]): PreparedPerformanceCurve | null {
  const first = samples[0], last = samples.at(-1);
  if (!first || !last) return null;
  try {
    return { first, last, segments: interpolateCurve(samples) };
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

export function preparePumpEfficiency(points: readonly { flow: number; efficiency?: number | null }[]) {
  return preparePerformanceCurve(points.flatMap(({ flow, efficiency }) =>
    typeof efficiency === 'number' && Number.isFinite(efficiency) && efficiency >= 0 && efficiency <= 100
      ? [{ x: flow, y: efficiency }] : []));
}

export function pumpEfficiencyPeak(efficiency: PreparedPerformanceCurve | null) {
  if (!efficiency?.segments.length) return null;

  // Interpolation preserves the maximum of the source points.
  let peakStart = efficiency.first, peakEnd = peakStart;
  for (const { start, end } of efficiency.segments) {
    if (end.y > peakStart.y) peakStart = peakEnd = end;
    else if (end.y === peakStart.y && start.x === peakEnd.x) peakEnd = end;
  }
  const nominalFlow = peakStart.x + (peakEnd.x - peakStart.x) / 2;
  return peakStart.y > 0 && nominalFlow > 0 ? { x: nominalFlow, y: peakStart.y } : null;
}

export function isPumpFlowOptimal(efficiency: PreparedPerformanceCurve | null, actualFlow: number) {
  const peak = pumpEfficiencyPeak(efficiency);
  if (!peak) return false;
  const ratio = actualFlow / peak.x;
  const tolerance = 32 * Number.EPSILON;
  return ratio >= 0.85 - tolerance && ratio <= 1.20 + tolerance;
}

export function preparePumpNpsh(points: readonly { flow: number; npsh?: number | null }[]) {
  return preparePerformanceCurve(points.flatMap(({ flow, npsh }) =>
    typeof npsh === 'number' && isNonnegativeNumber(npsh) ? [{ x: flow, y: npsh }] : []));
}

export function pumpPowerP2At(
  curve: PreparedPumpCurve, efficiency: PreparedPerformanceCurve | null, flow: number, densityKgM3: number,
) {
  if (flow <= 0 || !Number.isFinite(densityKgM3) || densityKgM3 <= 0) return null;
  const head = evaluateCurve(curve.segments, flow);
  const eta = pumpPerformanceAt(efficiency, flow);
  if (head === null || eta === null || eta <= 0) return null;
  // Q: m³/h → m³/s, η: % → fraction, P: W → kW.
  const power = densityKgM3 * 9.80665 * (flow / 3600) * head / (eta / 100) / 1000;
  return Number.isFinite(power) ? power : null;
}

export function preparePumpPowerP2(
  curve: PreparedPumpCurve, efficiency: PreparedPerformanceCurve | null, extraFlows: readonly number[], densityKgM3: number,
) {
  if (!efficiency) return null;
  const flows = new Set([
    curve.segments[0].start.x, ...curve.segments.map(segment => segment.end.x),
    efficiency.first.x, ...efficiency.segments.map(segment => segment.end.x),
  ]);
  for (const flow of extraFlows) {
    if (![...flows].some(sample => Math.abs(sample - flow) <= 32 * Number.EPSILON * Math.abs(flow))) flows.add(flow);
  }
  const knots = [...flows].sort((a, b) => a - b).map(x => ({
    x, y: pumpPowerP2At(curve, efficiency, x, densityKgM3),
  }));
  const first = knots.findIndex(knot => knot.y !== null);
  if (first === -1) return null;
  const last = knots.findLastIndex(knot => knot.y !== null);
  // Power is a ratio of the Q–H and efficiency curves. Sample the formula
  // between their knots, breaking the graph where efficiency is zero.
  let samples: CurveSample[] = [];
  const parts: PreparedPerformanceCurve[] = [];
  const finishPart = () => {
    const part = preparePerformanceCurve(samples);
    if (part) parts.push(part);
    samples = [];
  };
  for (let index = first; index <= last; index++) {
    const knot = knots[index];
    const previous = index > first ? knots[index - 1] : undefined;
    if (previous) {
      for (let step = 1; step < 16; step++) {
        const flow = previous.x + (knot.x - previous.x) * (step / 16);
        if (flow <= (samples.at(-1)?.x ?? previous.x) || flow >= knot.x) continue;
        const power = pumpPowerP2At(curve, efficiency, flow, densityKgM3);
        if (power !== null) samples.push({ x: flow, y: power });
      }
    }
    if (knot.y === null) finishPart();
    else samples.push({ x: knot.x, y: knot.y });
  }
  finishPart();
  const firstPart = parts[0], lastPart = parts.at(-1);
  return firstPart && lastPart
    ? { first: firstPart.first, last: lastPart.last, segments: parts.flatMap(part => part.segments) }
    : null;
}

/** Evaluate a performance curve at the given flow, without extrapolation. */
export function pumpPerformanceAt(curve: PreparedPerformanceCurve | null, flow: number): number | null {
  if (!curve || !Number.isFinite(flow)) return null;
  // An intersection can round just past an endpoint.
  const endpoint = [curve.first, curve.last].find(sample =>
    Math.abs(sample.x - flow) <= 32 * Number.EPSILON * Math.max(Math.abs(sample.x), Math.abs(flow)));
  return endpoint?.y ?? evaluateCurve(curve.segments, flow);
}

export function pumpWorkingRange(curve: PreparedPumpCurve) {
  return {
    minFlow: Math.max(curve.flowMinM3h, curve.segments[0].start.x),
    maxFlow: Math.min(curve.flowMaxM3h, curve.segments[curve.segments.length - 1].end.x),
  };
}
