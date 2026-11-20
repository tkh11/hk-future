import { evaluateCurveSegment, type CurveSample } from './curve-interpolation';
import { pumpWorkingRange, type PreparedPumpCurve, type PumpDuty } from './pump-selection';

export type SystemCurve = Readonly<{ staticHeadM: number; coefficient: number }>;
export type PumpIntersections = {
  points: CurveSample[];
  coincident: boolean;
};

export function createSystemCurve({ flowM3h, requiredHeadM }: PumpDuty, staticHeadM: number): SystemCurve | null {
  if (!Number.isFinite(flowM3h) || flowM3h <= 0 || !Number.isFinite(requiredHeadM)
    || !Number.isFinite(staticHeadM) || staticHeadM < 0 || staticHeadM > requiredHeadM) return null;
  const coefficient = (requiredHeadM - staticHeadM) / flowM3h / flowM3h;
  return Number.isFinite(coefficient) ? { staticHeadM, coefficient } : null;
}

export function systemHeadAt(system: SystemCurve, flow: number): number {
  return system.staticHeadM + system.coefficient * flow * flow;
}

// Roots of the derivative of the cubic residual, in local segment coordinates.
function turningPoints(d0: number, d1: number, d2: number, d3: number) {
  const a = (d3 - d2) - 2 * (d2 - d1) + (d1 - d0);
  const b = 2 * ((d2 - d1) - (d1 - d0));
  const c = d1 - d0;
  if (a === 0) return b === 0 ? [] : [-c / b];
  const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c));
  const aa = a / scale, bb = b / scale, cc = c / scale;
  const discriminant = bb * bb - 4 * aa * cc;
  if (discriminant < 0) return [];
  const q = -(bb + (bb < 0 ? -1 : 1) * Math.sqrt(discriminant)) / 2;
  return q === 0 ? [0] : [q / aa, cc / q];
}

/** Split each cubic at its extrema to detect crossings and tangencies without extrapolation. */
export function findPumpIntersections(curve: PreparedPumpCurve, system: SystemCurve): PumpIntersections {
  const { minFlow, maxFlow } = pumpWorkingRange(curve);
  const points: CurveSample[] = [];
  let coincident = false;
  const add = (flow: number, head: number) => {
    if (points.at(-1)?.x !== flow) points.push({ x: flow, y: head });
  };

  for (const segment of curve.segments) {
    const { start, control1, control2, end } = segment;
    const low = Math.max(minFlow, start.x), high = Math.min(maxFlow, end.x);
    if (low > high) continue;
    const width = end.x - start.x;
    const startHead = systemHeadAt(system, start.x), endHead = systemHeadAt(system, end.x);
    if (!Number.isFinite(endHead)) continue;
    const firstControl = startHead + 2 * (system.coefficient * start.x * (width / 3));
    const secondControl = endHead - 2 * (system.coefficient * (width / 3) * end.x);
    const residuals = [start.y - startHead, control1.y - firstControl, control2.y - secondControl, end.y - endHead] as const;
    const tolerance = 32 * Number.EPSILON * Math.max(1, endHead, start.y, control1.y, control2.y, end.y);
    if (low < high && residuals.every(value => Math.abs(value) <= tolerance)) {
      coincident = true;
      continue;
    }

    const difference = (flow: number) => evaluateCurveSegment(segment, flow) - systemHeadAt(system, flow);
    const critical = turningPoints(...residuals)
      .map(t => start.x + t * width).filter(flow => flow > low && flow < high).sort((a, b) => a - b);
    const bounds = [low, ...new Set(critical), high];
    let left = bounds[0], leftValue = difference(left);
    if (Math.abs(leftValue) <= tolerance) add(left, evaluateCurveSegment(segment, left));
    for (const right of bounds.slice(1)) {
      const rightValue = difference(right);
      if (Math.abs(rightValue) <= tolerance) add(right, evaluateCurveSegment(segment, right));
      else if (Math.abs(leftValue) > tolerance && Math.sign(leftValue) !== Math.sign(rightValue)) {
        let lo = left, hi = right;
        for (let i = 0; i < 52; i++) {
          const mid = lo + (hi - lo) / 2;
          if (Math.sign(difference(mid)) === Math.sign(leftValue)) lo = mid;
          else hi = mid;
        }
        const flow = lo + (hi - lo) / 2;
        add(flow, evaluateCurveSegment(segment, flow));
      }
      left = right;
      leftValue = rightValue;
    }
  }
  return { points, coincident };
}
