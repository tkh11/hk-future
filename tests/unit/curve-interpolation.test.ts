// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { curveIntervalsAbove, evaluateCurveSegment, interpolateCurve, smoothCurvePath, splitCurveByIntervals, type CurveSample, type CurveSegment } from '../../src/lib/curve-interpolation';

function sample(segment: CurveSegment, t: number): CurveSample {
  const s = 1 - t;
  const value = (key: 'x' | 'y') => s ** 3 * segment.start[key] + 3 * s ** 2 * t * segment.control1[key]
    + 3 * s * t ** 2 * segment.control2[key] + t ** 3 * segment.end[key];
  return { x: value('x'), y: value('y') };
}

const hip200 = [
  [0, 38], [160, 37.5], [200, 37.1], [240, 36.5], [280, 35.7],
  [320, 34.7], [360, 33.3], [400, 32], [440, 29.9], [480, 27.7],
].map(([x, y]) => ({ x, y }));
const hip32 = [
  [0, 7.2], [2, 7.1], [3, 7], [4, 6.9], [5, 6.7], [6, 6], [7, 5.4], [8, 4.5], [9, 3.4],
].map(([x, y]) => ({ x, y }));

describe('pump curve interpolation', () => {
  it.each([
    { name: 'HIP 200-32/4', points: hip200 },
    { name: 'HIP 32-6/2R with an uneven head drop', points: hip32 },
  ])('passes through every $name measurement without extending the range or changing values', ({ points }) => {
    const original = structuredClone(points);
    const segments = interpolateCurve(points);
    expect(segments).toHaveLength(points.length - 1);
    segments.forEach((segment, i) => {
      expect(sample(segment, 0)).toEqual(points[i]);
      expect(sample(segment, 1)).toEqual(points[i + 1]);
    });
    expect(points).toEqual(original);
  });

  it('has continuous slopes at measurements even with uneven flow spacing', () => {
    const segments = interpolateCurve(hip200);
    segments.slice(1).forEach((right, i) => {
      const left = segments[i];
      const arriving = (left.end.y - left.control2.y) / (left.end.x - left.control2.x);
      const departing = (right.control1.y - right.start.y) / (right.control1.x - right.start.x);
      expect(arriving).toBeCloseTo(departing, 10);
    });
    const segment = segments[1];
    expect(sample(segment, 0.5).y).not.toBeCloseTo((segment.start.y + segment.end.y) / 2, 5);
  });

  it.each([
    { name: 'HIP decreasing head', points: hip200 },
    { name: 'HIP 32 uneven head drop', points: hip32 },
    { name: 'efficiency peak', points: [[0, 0], [1, 30], [4, 85], [5, 40], [9, 0]].map(([x,y]) => ({x,y})) },
    { name: 'flat intervals', points: [[0, 12], [2, 12], [3, 1], [8, 1], [9, 0]].map(([x,y]) => ({x,y})) },
    { name: 'abrupt endpoint changes', points: [[0, 1], [1, 0], [2, 80], [3, 81]].map(([x,y]) => ({x,y})) },
    { name: 'increasing values', points: [[0, 0], [0.1, 0.01], [20, 99], [21, 100]].map(([x,y]) => ({x,y})) },
  ])('does not overshoot or reverse direction between points: $name', ({ points }) => {
    for (const segment of interpolateCurve(points)) {
      const minimum = Math.min(segment.start.y, segment.end.y), maximum = Math.max(segment.start.y, segment.end.y);
      const direction = Math.sign(segment.end.y - segment.start.y);
      let previous = segment.start.y;
      for (let i = 1; i <= 100; i++) {
        const point = sample(segment, i / 100);
        expect(point.y).toBeGreaterThanOrEqual(minimum - 1e-10);
        expect(point.y).toBeLessThanOrEqual(maximum + 1e-10);
        expect((point.y - previous) * direction).toBeGreaterThanOrEqual(-1e-10);
        previous = point.y;
      }
    }
  });

  it('does not invent curvature from two points', () => {
    const [segment] = interpolateCurve([{x:4,y:7},{x:8,y:4.5}]);
    expect(sample(segment, 0.25).x).toBeCloseTo(5);
    expect(sample(segment, 0.25).y).toBeCloseTo(6.375);
    expect(sample(segment, 0.5).y).toBeCloseTo(5.75);
  });

  it('keeps the exact shape on both sides of a peak above the limit', () => {
    const original = interpolateCurve([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 3, y: 0 }]);
    const ranges = curveIntervalsAbove(original, 1);
    const { outside: normal, inside: above } = splitCurveByIntervals(original, ranges);
    expect(ranges).toHaveLength(1);
    expect(above[0].start).toEqual(normal[0].end);
    expect(above.at(-1)!.end).toEqual(normal[1].start);
    expect(normal).toHaveLength(2);
    expect(normal[0].end.y).toBeCloseTo(1, 12);
    expect(normal[1].start.y).toBeCloseTo(1, 12);
    expect(normal[0].end.x).toBeLessThan(normal[1].start.x);
    normal.forEach((segment, i) => {
      for (const t of [0.2, 0.5, 0.8]) {
        const point = sample(segment, t);
        expect(point.y).toBeCloseTo(evaluateCurveSegment(original[i], point.x), 12);
      }
    });
  });

  it('keeps a segment at the limit and omits an isolated touch from above', () => {
    const fromValues = (values: number[]) => interpolateCurve(values.map((y, x) => ({ x, y })));
    const plateau = fromValues([2, 1, 1, 2]);
    const ranges = curveIntervalsAbove(plateau, 1);
    expect(splitCurveByIntervals(plateau, ranges).outside).toEqual([plateau[1]]);
    expect(curveIntervalsAbove(fromValues([2, 1, 2]), 1)).toEqual([{ from: 0, to: 2 }]);
    const head = interpolateCurve([{ x: -1, y: 24 }, { x: 4, y: 11 }]);
    const parts = splitCurveByIntervals(head, ranges);
    expect(parts.inside.map(s => [s.start.x, s.end.x])).toEqual([[0,1],[2,3]]);
    expect(parts.outside.map(s => [s.start.x, s.end.x])).toEqual([[-1,0],[1,2],[3,4]]);
    for (const segment of [...parts.inside, ...parts.outside]) {
      const midpoint = sample(segment, 0.5);
      expect(midpoint.y).toBeCloseTo(evaluateCurveSegment(head[0], midpoint.x), 12);
    }
  });

  it('rejects invalid coordinates and repeated or unsorted flow', () => {
    for (const points of [
      [{x:0,y:2},{x:0,y:1}], [{x:2,y:2},{x:1,y:1}],
      [{x:0,y:NaN},{x:1,y:1}], [{x:0,y:2},{x:Infinity,y:1}],
    ]) expect(() => interpolateCurve(points)).toThrow(RangeError);
  });

  it('renders cubic SVG segments in the chart coordinate system', () => {
    const path = smoothCurvePath([{x:0,y:0},{x:1,y:1},{x:2,y:4}], x=>x*30, y=>120-y*3);
    expect(path.match(/[A-Za-z]/g)).toEqual(['M', 'C', 'C']);
    const coordinates = path.match(/-?[\d.]+/g)!.map(Number);
    const expected = [0,120,10,120,20,118.5,30,117,40,115.5,50,112,60,108];
    expect(coordinates).toHaveLength(expected.length);
    coordinates.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 10));
    expect(smoothCurvePath([], x=>x, y=>y)).toBe('');
    expect(smoothCurvePath([{x:0,y:0}], x=>x, y=>y)).toBe('');
  });
});
