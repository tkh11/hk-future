// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fixture from '../../docs/pump-selection/hip32-ssvf-fixture.json';
import { createSystemCurve, findPumpIntersections, systemHeadAt } from '../../src/lib/pump-operating-point';
import { preparePumpCurve } from '../../src/lib/pump-selection';

const duty = { flowM3h: 8, requiredHeadM: 8 };
const forSku = (sku: string) => {
  const { curve, report } = fixture.variants.find(variant => variant.sku === sku)!;
  return preparePumpCurve({ ...report, points: curve.points })!;
};

describe('pump system curves', () => {
  it('passes through the requested point with the given static head', () => {
    const system = createSystemCurve(duty, 6)!;
    expect(systemHeadAt(system, 0)).toBe(6);
    expect(systemHeadAt(system, 8)).toBe(8);
    expect(systemHeadAt(system, 12)).toBe(10.5);
  });

  it('rejects an impossible static component and zero design flow', () => {
    expect(createSystemCurve(duty, 8.01)).toBeNull();
    expect(createSystemCurve(duty, -1)).toBeNull();
    expect(createSystemCurve({ ...duty, flowM3h: 0 }, 0)).toBeNull();
  });
});

describe('pump operating points', () => {
  it('finds one point at a saved node shared by two segments', () => {
    expect(findPumpIntersections(forSku('77005423'), createSystemCurve(duty, 0)!))
      .toEqual({ points: [{ x: 8, y: 8 }], coincident: false });
  });

  it.each([
    { staticHead: 0, flow: 9.953714044, head: 12.384552909 },
    { staticHead: 6, flow: 11.806156081, head: 10.355791294 },
  ])('moves the HIP 32-14/2 operating point at static head $staticHead', ({ staticHead, flow, head }) => {
    const result = findPumpIntersections(forSku('77005403'), createSystemCurve(duty, staticHead)!);
    expect(result.points).toHaveLength(1);
    expect(result.points[0].x).toBeCloseTo(flow, 8);
    expect(result.points[0].y).toBeCloseTo(head, 8);
  });

  it('uses inclusive working limits and never extrapolates beyond the saved samples', () => {
    const curve = forSku('77005423');
    expect(findPumpIntersections(curve, createSystemCurve({ flowM3h: 4, requiredHeadM: 10.5 }, 0)!).points)
      .toEqual([{ x: 4, y: 10.5 }]);
    expect(findPumpIntersections(curve, createSystemCurve({ flowM3h: 3, requiredHeadM: 12 }, 0)!).points).toEqual([]);
    expect(findPumpIntersections(curve, createSystemCurve({ flowM3h: 9.4, requiredHeadM: 6 }, 0)!).points).toEqual([]);
  });

  it('finds a tangent where the curves do not change order', () => {
    const curve = preparePumpCurve({ flowMinM3h: 1, flowMaxM3h: 3, points: [{ flow: 1, head: 4 }, { flow: 3, head: 12 }] })!;
    expect(findPumpIntersections(curve, createSystemCurve({ flowM3h: 2, requiredHeadM: 8 }, 4)!))
      .toEqual({ points: [{ x: 2, y: 8 }], coincident: false });
  });

  it('finds two crossings in one segment even when both endpoints are below the system curve', () => {
    const curve = preparePumpCurve({ flowMinM3h: 0, flowMaxM3h: 4, points: [{ flow: 0, head: 1 }, { flow: 4, head: 17 }] })!;
    const { points } = findPumpIntersections(curve, createSystemCurve({ flowM3h: 2, requiredHeadM: 8 }, 4)!);
    expect(points).toHaveLength(2);
    expect(points[0].x).toBeCloseTo(1, 10);
    expect(points[1].x).toBeCloseTo(3, 10);
  });

  it('distinguishes coincident curves from a unique operating point', () => {
    const curve = preparePumpCurve({ flowMinM3h: 4, flowMaxM3h: 9, points: [{ flow: 4, head: 8 }, { flow: 9, head: 8 }] })!;
    expect(findPumpIntersections(curve, createSystemCurve(duty, 8)!)).toEqual({ points: [], coincident: true });
  });
});
