// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evaluateCurve } from '@/lib/curve-interpolation';
import { defaultPumpFluid, parsePumpFluidInput, resolvePumpFluid, type PumpFluid } from '@/lib/pump-fluid';
import { preparePumpCurve, preparePumpEfficiency, preparePumpPowerP2, pumpEfficiencyPeak, pumpPerformanceAt, pumpPowerP2At } from '@/lib/pump-selection';
import { prepareFluidPumpCurves } from '@/lib/pump-viscosity';

describe('pump fluid properties', () => {
  it('accepts decimal commas and defaults existing queries to water at 20 °C', () => {
    expect(parsePumpFluidInput('', '', '')).toEqual({ kind: 'water', temperatureC: 20, concentrationPct: null });
    expect(parsePumpFluidInput('propyleneGlycol', '-10,5', '35,5')).toEqual({
      kind: 'propyleneGlycol', temperatureC: -10.5, concentrationPct: 35.5,
    });
    expect(parsePumpFluidInput('ethyleneGlycol', '- 12', '35')).toBeNull();
    expect(parsePumpFluidInput('ethyleneGlycol', '20', '')).toBeNull();
  });

  it('uses liquid water values at the requested temperature', () => {
    expect(defaultPumpFluid.densityKgM3).toBeCloseTo(998.16, 2);
    expect(defaultPumpFluid.kinematicViscosityMm2S).toBeCloseTo(1.0032, 4);
    const hot = resolvePumpFluid({ kind: 'water', temperatureC: 90, concentrationPct: null });
    expect(hot?.densityKgM3).toBeCloseTo(965.29, 2);
    expect(hot?.kinematicViscosityMm2S).toBeCloseTo(0.3257, 4);
    expect(resolvePumpFluid({ kind: 'water', temperatureC: -1, concentrationPct: null })).toBeNull();
    expect(resolvePumpFluid({ kind: 'water', temperatureC: 121, concentrationPct: null })).toBeNull();
  });

  it('matches the published CoolProp ethylene glycol example for 50% by mass at 300 K', () => {
    const fluid = resolvePumpFluid({ kind: 'ethyleneGlycol', temperatureC: 26.85, concentrationPct: 50 });
    expect(fluid?.densityKgM3).toBeCloseTo(1061.1793077, 3);
    expect(fluid?.kinematicViscosityMm2S).toBeCloseTo(2.826, 3);
  });

  it('compares both glycols on the same mass basis and rejects frozen or out-of-range input', () => {
    const conditions = { temperatureC: 20, concentrationPct: 30 };
    const ethylene = resolvePumpFluid({ ...conditions, kind: 'ethyleneGlycol' })!;
    const propylene = resolvePumpFluid({ ...conditions, kind: 'propyleneGlycol' })!;
    expect(propylene.kinematicViscosityMm2S).toBeGreaterThan(ethylene.kinematicViscosityMm2S);
    expect(resolvePumpFluid({ ...conditions, kind: 'propyleneGlycol', temperatureC: -20 })).toBeNull();
    expect(resolvePumpFluid({ ...conditions, kind: 'propyleneGlycol', concentrationPct: 61 })).toBeNull();
    expect(resolvePumpFluid({ ...conditions, kind: 'propyleneGlycol', temperatureC: 101 })).toBeNull();
  });
});

describe('hydraulic and shaft power corrections', () => {
  const source = {
    points: [{ flow: 0, head: 99 }, { flow: 66, head: 87.3 }, { flow: 110, head: 77 }, { flow: 132, head: 69.7 }],
    flowMinM3h: 66,
    flowMaxM3h: 132,
    performancePoints: [{ flow: 66, efficiency: 55 }, { flow: 110, efficiency: 68 }, { flow: 132, efficiency: 61 }],
    speedRpm: 2950,
    impellerCount: 1,
  };
  // Reproduces the SI performance example using its stated viscosity and reference density.
  const viscousExample: PumpFluid = {
    kind: 'ethyleneGlycol', temperatureC: 20, concentrationPct: 60,
    densityKgM3: 900, kinematicViscosityMm2S: 120,
  };

  it('preserves water hydraulics and scales shaft power and its graph by density', () => {
    const water = prepareFluidPumpCurves({ ...source, fluid: defaultPumpFluid })!;
    expect(water.viscosityCorrected).toBe(false);
    expect(evaluateCurve(water.curve.segments, 110)).toBe(77);
    const curve = preparePumpCurve({
      flowMinM3h: 30, flowMaxM3h: 90, points: [{ flow: 30, head: 20 }, { flow: 90, head: 20 }],
    })!;
    const efficiency = preparePumpEfficiency([{ flow: 30, efficiency: 70 }, { flow: 90, efficiency: 70 }])!;
    expect(pumpPowerP2At(curve, efficiency, 50, 1000)).toBeCloseTo(3.89, 2);
    const denserPower = pumpPowerP2At(curve, efficiency, 50, 1050);
    expect(denserPower).toBeCloseTo(4.09, 2);
    const graph = preparePumpPowerP2(curve, efficiency, [50], 1050);
    expect(evaluateCurve(graph!.segments, 50)).toBe(denserPower);
  });

  it('keeps the power curve close to the formula between widely spaced efficiency points', () => {
    const curve = preparePumpCurve({
      flowMinM3h: 5, flowMaxM3h: 15, points: [{ flow: 5, head: 20 }, { flow: 15, head: 20 }],
    })!;
    const efficiency = preparePumpEfficiency([{ flow: 5, efficiency: 8 }, { flow: 15, efficiency: 64 }])!;
    const graph = preparePumpPowerP2(curve, efficiency, [], 1000)!;
    const flow = 7.5;
    const expected = 1000 * 9.80665 * flow * 20 / (3_600_000 * 0.22);
    expect(evaluateCurve(graph.segments, flow)).toBeCloseTo(expected, 3);
  });

  it('does not interpolate shaft power through zero efficiency at positive flow', () => {
    const curve = preparePumpCurve({
      flowMinM3h: 1, flowMaxM3h: 3, points: [{ flow: 1, head: 10 }, { flow: 3, head: 10 }],
    })!;
    const efficiency = preparePumpEfficiency([
      { flow: 1, efficiency: 50 }, { flow: 2, efficiency: 0 }, { flow: 3, efficiency: 50 },
    ]);
    const graph = preparePumpPowerP2(curve, efficiency, [1.5, 2, 2.5], 1000)!;
    expect(pumpPerformanceAt(graph, 2)).toBeNull();
    for (const flow of [1.5, 2.5]) {
      expect(pumpPerformanceAt(graph, flow)).toBe(pumpPowerP2At(curve, efficiency, flow, 1000));
    }
  });

  it('matches the HI example at BEP and applies the correction through the entire working range', () => {
    const corrected = prepareFluidPumpCurves({ ...source, fluid: viscousExample })!;
    expect(corrected.viscosityCorrected).toBe(true);
    const peak = pumpEfficiencyPeak(corrected.efficiencyCurve)!;
    expect(peak.x).toBeCloseTo(103.15, 2);
    expect(peak.y).toBeCloseTo(50.2, 1);
    expect(evaluateCurve(corrected.curve.segments, peak.x)).toBeCloseTo(72.21, 2);
    expect(corrected.curve.flowMinM3h).toBeCloseTo(61.89, 2);
    expect(corrected.curve.flowMaxM3h).toBeCloseTo(123.78, 2);
    expect(evaluateCurve(corrected.curve.segments, 0)).toBeNull();
  });

  it('rejects viscosity correction for multistage pumps or without a bracketed water BEP', () => {
    expect(prepareFluidPumpCurves({ ...source, fluid: viscousExample, impellerCount: 2 })).toBeNull();
    expect(prepareFluidPumpCurves({
      ...source, fluid: viscousExample, performancePoints: source.performancePoints.slice(0, 2),
    })).toBeNull();
    expect(prepareFluidPumpCurves({
      ...source, fluid: viscousExample, speedRpm: 100_000,
    })).toBeNull();
  });
});
