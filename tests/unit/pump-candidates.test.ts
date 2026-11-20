// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkPumpCandidate, closestPumpsPerRow } from '@/lib/pump-candidates';
import { evaluateCurve } from '@/lib/curve-interpolation';
import { fromM3h, toM3h } from '@/lib/flow-units';
import { checkPumpMotor, hasPumpMotorReserve } from '@/lib/pump-motor';
import { createSystemCurve } from '@/lib/pump-operating-point';
import { isPumpFlowOptimal, preparePumpCurve, preparePumpEfficiency } from '@/lib/pump-selection';

const flatCurve = (head: number, min = 4, max = 12, lastSample = max) => preparePumpCurve({
  flowMinM3h: min, flowMaxM3h: max, points: [{ flow: min, head }, { flow: lastSample, head }],
})!;
const check = (flow: number, head: number, curve = flatCurve(9)) => {
  const duty = { flowM3h: flow, requiredHeadM: head };
  return checkPumpCandidate(curve, duty, createSystemCurve(duty, 0)!);
};

describe('pump candidate boundaries', () => {
  it('requires flow strictly above the individual minimum', () => {
    expect(check(4, 8).status).toBe('outside-selection-range');
    expect(check(4.001, 8).status).toBe('suitable');
  });

  it('accepts the full working flow including its upper end', () => {
    const curve = flatCurve(9, 4, 9.4);
    expect(check(8.5, 9, curve).status).toBe('suitable');
    expect(check(9.4, 9, curve).status).toBe('suitable');
    expect(check(9.401, 9, curve).status).toBe('outside-working-range');
  });

  it.each(['ls', 'lmin'] as const)('keeps the selection boundary after conversion to %s', unit => {
    const convert = (value: number) => toM3h(Number(fromM3h(value, unit).toPrecision(15)), unit);
    const curve = flatCurve(9, 10, 80);
    expect(check(convert(10), 8, curve).status).not.toBe('suitable');
    expect(check(convert(10.001), 8, curve).status).toBe('suitable');
    expect(check(convert(80), 9, curve).status).toBe('suitable');
    expect(check(convert(80.001), 9, curve).status).toBe('outside-working-range');
  });

  it('allows flow converted a machine digit above the rated maximum', () => {
    const flow = toM3h(8.333333333333334, 'ls');
    expect(flow).toBeGreaterThan(30);
    expect(check(flow, 9, flatCurve(9, 4, 30))).toMatchObject({ status: 'suitable', point: { x: 30, y: 9 } });
  });

  it('accepts head equal to the total requested head', () => {
    const result = check(8, 9);
    expect(result).toMatchObject({ status: 'suitable', point: { y: 9 }, headMarginM: 0 });
    if (result.status === 'suitable') expect(result.point.x).toBeCloseTo(8, 12);
    expect(check(8, 9.1).status).toBe('insufficient-head');
    expect(check(8, 8.9).status).toBe('suitable');
  });

  it('accepts the same available head after converting the flow', () => {
    const curve = preparePumpCurve({ flowMinM3h: 10, flowMaxM3h: 80,
      points: [{ flow: 10, head: 20 }, { flow: 50, head: 15 }, { flow: 80, head: 5 }],
    })!;
    const head = evaluateCurve(curve.segments, 44.3)!;
    const converted = toM3h(Number(fromM3h(44.3, 'ls').toPrecision(15)), 'ls');
    expect(check(converted, head, curve)).toMatchObject({ status: 'suitable', headMarginM: 0 });
    expect(check(converted, head + 0.001, curve).status).toBe('insufficient-head');
  });

  it('keeps static head within the requested total', () => {
    const duty = { flowM3h: 5, requiredHeadM: 13 };
    const system = createSystemCurve(duty, 2)!;
    expect(system.coefficient).toBeCloseTo(0.44);
    const result = checkPumpCandidate(flatCurve(13), duty, system);
    expect(result).toMatchObject({ status: 'suitable', point: { y: 13 }, headMarginM: 0 });
    if (result.status === 'suitable') expect(result.point.x).toBeCloseTo(5, 12);
    expect(checkPumpCandidate(flatCurve(12.99), duty, system).status).toBe('insufficient-head');
  });

  it('requires a unique actual intersection inside the full working range', () => {
    const actualAtMax = check(8, 8, flatCurve(18));
    expect(actualAtMax).toMatchObject({ status: 'suitable', point: { x: 12, y: 18 } });
    expect(check(8, 8, flatCurve(20)).status).toBe('no-operating-point');
  });

  it('does not apply the 15% reserve to the actual operating flow', () => {
    const result = check(8, 8, flatCurve(16));
    expect(result.status).toBe('suitable');
    if (result.status === 'suitable') {
      expect(result.point.x).toBeGreaterThan(0.85 * 12);
      expect(result.point.x).toBeLessThan(12);
    }
  });

  it('does not extrapolate requested or actual points beyond saved curve samples', () => {
    expect(check(8, 8, flatCurve(9, 4, 12, 7)).status).toBe('incomplete-data');
    expect(check(8, 8, flatCurve(12.5, 4, 12, 9)).status).toBe('no-operating-point');
  });

  it('rejects an ambiguous operating point', () => {
    const curve = preparePumpCurve({ flowMinM3h: 0, flowMaxM3h: 4, points: [{ flow: 0, head: 1 }, { flow: 4, head: 17 }] })!;
    const duty = { flowM3h: 2, requiredHeadM: 8 };
    expect(checkPumpCandidate(curve, duty, createSystemCurve(duty, 4)!)).toMatchObject({ status: 'ambiguous-operating-point' });
  });

  it('returns a reason for invalid input', () => {
    const system = { staticHeadM: 0, coefficient: 0.125 };
    expect(checkPumpCandidate(flatCurve(9), { flowM3h: NaN, requiredHeadM: 8 }, system).status).toBe('invalid-input');
  });
});

describe('motor reserve at actual flow', () => {
  it.each([
    [3, 1.20], [7.5, 1.20], [7.501, 1.15], [37, 1.15], [40, 1.15], [40.001, 1.10], [75, 1.10],
  ])('requires strict headroom for a %s kW motor', (rated, factor) => {
    const limit = rated / factor;
    expect(hasPumpMotorReserve(limit - 0.00001, rated)).toBe(true);
    expect(hasPumpMotorReserve(limit, rated)).toBe(false);
    expect(hasPumpMotorReserve(limit + 0.00001, rated)).toBe(false);
    expect(checkPumpMotor(limit, rated)).toBe('ok');
    expect(checkPumpMotor(rated, rated)).toBe('ok');
    expect(checkPumpMotor(rated + 0.00001, rated)).toBe('overload');
  });

  it('requires known shaft and rated powers', () => {
    for (const power of [null, NaN, Infinity, -1]) {
      expect(hasPumpMotorReserve(power, 7.5)).toBe(false);
      expect(hasPumpMotorReserve(5, power)).toBe(false);
    }
    expect(hasPumpMotorReserve(5, 0)).toBe(false);
  });
});

describe('pairs within each hydraulic row', () => {
  it('keeps two per row, one when only one qualifies, with stable ties', () => {
    const pumps = [
      { rowId: 'a', modelKey: '3', sku: 'A3', headMarginM: 3 },
      { rowId: 'a', modelKey: '2', sku: 'A2', headMarginM: 1 },
      { rowId: 'b', modelKey: '1', sku: 'B1', headMarginM: 2 },
      { rowId: 'a', modelKey: '1', sku: 'A1', headMarginM: 1 },
    ];
    expect(closestPumpsPerRow(pumps).map(pump => pump.sku)).toEqual(['A1', 'A2', 'B1']);
    expect(pumps[0].sku).toBe('A3');
  });

  it('keeps executions of the two nearest models without allowing optimal pumps to extend the list', () => {
    const pumps = [
      { rowId: '32', modelKey: '6', sku: '6-SSVF', headMarginM: 1.7, optimal: true },
      { rowId: '32', modelKey: '6', sku: '6-CSEF', headMarginM: 1.8, optimal: true },
      { rowId: '32', modelKey: '10', sku: '10-CSEF', headMarginM: 5.1, optimal: false },
      { rowId: '32', modelKey: '14', sku: '14-SSVF', headMarginM: 10.7, optimal: true },
      { rowId: '32', modelKey: '10', sku: '10-SSVF', headMarginM: 5.2, optimal: true },
      { rowId: '32', modelKey: '50', sku: '50-SSVF', headMarginM: 48.7, optimal: true },
      { rowId: '40', modelKey: '8', sku: '8-SSVF', headMarginM: 5.2, optimal: false },
      { rowId: '40', modelKey: '14', sku: '14-CSEF', headMarginM: 10.5, optimal: false },
      { rowId: '40', modelKey: '16', sku: '16-SSVF', headMarginM: 16.7, optimal: true },
    ];
    expect(closestPumpsPerRow(pumps).map(pump => pump.sku)).toEqual([
      '6-SSVF', '6-CSEF', '10-SSVF', '10-CSEF', '8-SSVF', '14-CSEF',
    ]);
  });
});

it('uses the middle of an efficiency plateau and includes both optimal flow limits', () => {
  const curve = preparePumpEfficiency([
    { flow: 4, efficiency: 30 }, { flow: 9, efficiency: 80 },
    { flow: 11, efficiency: 80 }, { flow: 14, efficiency: 60 },
  ]);
  expect([8.499, 8.5, 10, 12, 12.001].map(flow => isPumpFlowOptimal(curve, flow)))
    .toEqual([false, true, true, true, false]);
  expect(isPumpFlowOptimal(null, 10)).toBe(false);
});
