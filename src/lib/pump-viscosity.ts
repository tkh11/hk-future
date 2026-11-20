import { evaluateCurve } from './curve-interpolation';
import type { PumpFluid } from './pump-fluid';
import {
  preparePumpCurve, preparePumpEfficiency, pumpEfficiencyPeak, pumpPerformanceAt, pumpWorkingRange, type PumpCurveData,
} from './pump-selection';

type FluidCurveInput = PumpCurveData & Readonly<{
  performancePoints: readonly { flow: number; efficiency?: number | null }[];
  speedRpm: number;
  fluid: PumpFluid;
  impellerCount?: number | null;
}>;

function flowsInRange(flows: readonly number[], min: number, max: number, extra?: number) {
  const values = extra === undefined ? [min, max, ...flows] : [min, max, ...flows, extra];
  return [...new Set(values)].filter(flow => flow >= min && flow <= max).sort((a, b) => a - b);
}

/** ANSI/HI 9.6.7-2021 §9.6.7.4.5, water curves for an approved single-stage radial pump. */
export function prepareFluidPumpCurves({ performancePoints, speedRpm, fluid, impellerCount, ...source }: FluidCurveInput) {
  const waterCurve = preparePumpCurve(source);
  if (!waterCurve) return null;
  const efficiencyCurve = preparePumpEfficiency(performancePoints);
  const unchanged = { curve: waterCurve, waterCurve, efficiencyCurve, viscosityCorrected: false };
  if (fluid.kind === 'water') return unchanged;

  const viscosity = fluid.kinematicViscosityMm2S;
  if (!Number.isFinite(viscosity) || viscosity <= 0 || viscosity > 3000 || !Number.isFinite(speedRpm) || speedRpm <= 0) return null;
  if (viscosity <= 1) return unchanged;
  if (impellerCount != null && impellerCount !== 1) return null;
  const peak = pumpEfficiencyPeak(efficiencyCurve);
  if (!peak || !efficiencyCurve || peak.y <= Math.max(efficiencyCurve.first.y, efficiencyCurve.last.y)) return null;
  const { minFlow, maxFlow } = pumpWorkingRange(waterCurve);
  if (peak.x < minFlow || peak.x > maxFlow) return null;
  const peakHead = evaluateCurve(waterCurve.segments, peak.x);
  if (peakHead === null || peakHead <= 0) return null;

  // SI inputs for B: kinematic viscosity in mm²/s, Q in m³/h, H in m per stage, speed in rpm.
  // Applicability: https://webstore.ansi.org/standards/hi/ANSIHI2021
  const specificSpeed = speedRpm * Math.sqrt(peak.x / 3600) / peakHead ** 0.75;
  const b = 16.5 * Math.sqrt(viscosity) * peakHead ** 0.0625 / (peak.x ** 0.375 * speedRpm ** 0.25);
  if (!Number.isFinite(b) || b >= 40 || specificSpeed > 60) return null;
  if (b <= 1) return unchanged;

  const flowFactor = 2.71 ** (-0.165 * Math.log10(b) ** 3.15);
  const efficiencyFactor = b ** (-0.0547 * b ** 0.69);
  // Viscous performance is estimated only within the catalog's allowable operating range.
  const correctedPoints = flowsInRange(source.points.map(({ flow }) => flow), minFlow, maxFlow, peak.x)
    .map(flow => ({
      flow: flow * flowFactor,
      head: evaluateCurve(waterCurve.segments, flow)! * (1 - (1 - flowFactor) * (flow / peak.x) ** 0.75),
    }));
  const correctedCurve = preparePumpCurve({
    points: correctedPoints,
    flowMinM3h: minFlow * flowFactor,
    flowMaxM3h: maxFlow * flowFactor,
  });
  const efficiencyFlows = flowsInRange(
    performancePoints.filter(point => point.efficiency != null).map(point => point.flow),
    Math.max(minFlow, efficiencyCurve.first.x),
    Math.min(maxFlow, efficiencyCurve.last.x),
    peak.x,
  );
  const correctedEfficiency = preparePumpEfficiency(efficiencyFlows.map(flow => ({
    flow: flow * flowFactor,
    efficiency: pumpPerformanceAt(efficiencyCurve, flow)! * efficiencyFactor,
  })));
  return correctedCurve && correctedEfficiency
    ? { curve: correctedCurve, waterCurve, efficiencyCurve: correctedEfficiency, viscosityCorrected: true }
    : null;
}
