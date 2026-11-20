import { curveIntervalsAbove, type CurveSegment } from './curve-interpolation';

function isPower(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

export function checkPumpMotor(powerKw: number | null, ratedPowerKw: number | null) {
  if (!isPower(powerKw) || !isPower(ratedPowerKw) || ratedPowerKw === 0) {
    return 'unknown';
  }
  const tolerance = 32 * Number.EPSILON * Math.max(powerKw, ratedPowerKw);
  return powerKw - ratedPowerKw > tolerance ? 'overload' : 'ok';
}

export function hasPumpMotorReserve(powerKw: number | null, ratedPowerKw: number | null): boolean {
  if (!isPower(powerKw) || !isPower(ratedPowerKw) || ratedPowerKw === 0) return false;
  const factor = ratedPowerKw <= 7.5 ? 1.20 : ratedPowerKw <= 40 ? 1.15 : 1.10;
  const requiredPowerKw = powerKw * factor;
  // Equality is excluded, including roundoff in the computed operating point.
  return ratedPowerKw - requiredPowerKw > 32 * Number.EPSILON * ratedPowerKw;
}

export function pumpOverloadRanges(segments: readonly CurveSegment[], ratedPowerKw: number | null) {
  if (!isPower(ratedPowerKw) || ratedPowerKw === 0) return [];
  return curveIntervalsAbove(segments, ratedPowerKw);
}
