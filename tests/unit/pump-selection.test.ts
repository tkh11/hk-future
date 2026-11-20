// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fixture from '../../docs/pump-selection/hip32-ssvf-fixture.json';
import { checkPumpHead, preparePumpCurve } from '../../src/lib/pump-selection';

const variants = new Map(fixture.variants.map(variant => [
  variant.sku,
  preparePumpCurve({ ...variant.report, points: variant.curve.points }),
]));

function check(sku: string, flowM3h: number, requiredHeadM: number) {
  const curve = variants.get(sku);
  if (!curve) throw new Error(`Missing or invalid fixture curve for ${sku}`);
  return checkPumpHead(curve, { flowM3h, requiredHeadM });
}

describe('HIP 32 SSVF head check', () => {
  it.each([
    { sku: '77005422', headAt4: 6.9, headAt8: 4.5, lastFlow: 9, lastHead: 3.4 },
    { sku: '77005423', headAt4: 10.5, headAt8: 8, lastFlow: 9, lastHead: 6 },
    { sku: '77005403', headAt4: 16, headAt8: 14, lastFlow: 12.5, lastHead: 9.5 },
    { sku: '77015401', headAt4: 19, headAt8: 17.5, lastFlow: 12, lastHead: 16 },
    { sku: '77015402', headAt4: 24.5, headAt8: 24, lastFlow: 16, lastHead: 18 },
    { sku: '77025403', headAt4: 29, headAt8: 28, lastFlow: 16, lastHead: 23 },
    { sku: '77035404', headAt4: 34, headAt8: 33, lastFlow: 16, lastHead: 28 },
    { sku: '77045424', headAt4: 43, headAt8: 41, lastFlow: 16, lastHead: 36 },
    { sku: '77055425', headAt4: 54, headAt8: 53, lastFlow: 16, lastHead: 48 },
  ])('uses the saved Q–H nodes and includes both working boundaries for $sku', ({
    sku, headAt4, headAt8, lastFlow, lastHead,
  }) => {
    for (const [flowM3h, headM] of [[4, headAt4], [8, headAt8], [lastFlow, lastHead]]) {
      expect(check(sku, flowM3h, headM)).toEqual({
        status: 'sufficient-head',
        requiredHeadM: headM,
        availableHeadM: headM,
        headMarginM: 0,
      });
    }
    expect(check(sku, 3.99, 8)).toEqual({ status: 'outside-working-range' });
  });

  it('evaluates PCHIP between nodes and returns the head surplus', () => {
    // At the midpoint between Q = 4 and Q = 8, Hermite interpolation
    // adds half the difference of the two PCHIP slopes to the linear midpoint.
    const expectedHead = 9.25 + (-5 / 24 + 50 / 47) / 2;
    const result = check('77005423', 6, 9.5);
    expect(result.status).toBe('sufficient-head');
    if (result.status !== 'sufficient-head') throw new Error('Expected sufficient head');
    expect(result.requiredHeadM).toBe(9.5);
    expect(result.availableHeadM).toBeCloseTo(expectedHead, 12);
    expect(result.headMarginM).toBeCloseTo(expectedHead - 9.5, 12);
  });

  it('returns a deficit when the available head falls short', () => {
    expect(check('77005423', 8, 8.125)).toEqual({
      status: 'insufficient-head',
      requiredHeadM: 8.125,
      availableHeadM: 8,
      headMarginM: -0.125,
    });
  });

  it('distinguishes missing Q–H coverage from flow outside the catalog range', () => {
    expect(check('77005423', 9.4, 6)).toEqual({
      status: 'incomplete-data',
      reason: 'outside-curve-range',
    });
    expect(check('77005423', 9.41, 6)).toEqual({ status: 'outside-working-range' });
    expect(check('77055425', 16.01, 6)).toEqual({ status: 'outside-working-range' });
  });

  it('uses the Q–H curve of HIP 32-14/2 with no efficiency or P2 data', () => {
    const variant = fixture.variants.find(({ sku }) => sku === '77005403');
    expect(variant?.report.performancePoints).toEqual([]);
    expect(check('77005403', 8, 13)).toMatchObject({ status: 'sufficient-head', availableHeadM: 14 });
  });

  it.each([
    { flowM3h: -1, requiredHeadM: 8 },
    { flowM3h: NaN, requiredHeadM: 8 },
    { flowM3h: Infinity, requiredHeadM: 8 },
    { flowM3h: 8, requiredHeadM: -1 },
    { flowM3h: 8, requiredHeadM: NaN },
    { flowM3h: 8, requiredHeadM: Infinity },
  ])('rejects invalid input %o', duty => {
    expect(check('77005423', duty.flowM3h, duty.requiredHeadM)).toEqual({ status: 'invalid-input' });
  });
});

describe('pump curve preparation', () => {
  const limits = { flowMinM3h: 4, flowMaxM3h: 8 };
  const points = [{ flow: 5, head: 10 }, { flow: 9, head: 6 }];

  it('clips each side of the working range to the applicable bound', () => {
    const curve = preparePumpCurve({ ...limits, points });
    expect(checkPumpHead(curve, { flowM3h: 4, requiredHeadM: 7 })).toEqual({
      status: 'incomplete-data',
      reason: 'outside-curve-range',
    });
    expect(checkPumpHead(curve, { flowM3h: 5, requiredHeadM: 7 })).toMatchObject({
      status: 'sufficient-head',
      availableHeadM: 10,
    });
    expect(checkPumpHead(curve, { flowM3h: 8, requiredHeadM: 7 })).toMatchObject({
      status: 'sufficient-head',
      availableHeadM: 7,
    });
    expect(checkPumpHead(curve, { flowM3h: 9, requiredHeadM: 7 })).toEqual({ status: 'outside-working-range' });
  });

  it.each([
    { ...limits, points: [] },
    { ...limits, points: points.slice(0, 1) },
    { ...limits, points: [points[0], { flow: 5, head: 8 }] },
    { ...limits, points: [points[1], points[0]] },
    { ...limits, points: [points[0], { flow: 9, head: NaN }] },
    { ...limits, points: [points[0], { flow: 9, head: -1 }] },
    { ...limits, points, flowMaxM3h: 3 },
    { ...limits, points, flowMaxM3h: 4.5 },
    { ...limits, points, flowMaxM3h: null },
  ])('reports unavailable calculations for invalid or missing data %o', data => {
    const curve = preparePumpCurve(data);
    expect(checkPumpHead(curve, { flowM3h: 6, requiredHeadM: 7 })).toEqual({
      status: 'incomplete-data',
      reason: 'invalid-curve-data',
    });
  });
});
