export type CurveSample = Readonly<{ x: number; y: number }>;
export type CurveSegment = Readonly<{
  start: CurveSample;
  control1: CurveSample;
  control2: CurveSample;
  end: CurveSample;
}>;

function endpointSlope(h0: number, h1: number, d0: number, d1: number) {
  const slope = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(slope) !== Math.sign(d0)) return 0;
  if (Math.sign(d0) !== Math.sign(d1) && Math.abs(slope) > 3 * Math.abs(d0)) return 3 * d0;
  return slope;
}

/**
 * Shape-preserving cubic Hermite interpolation (PCHIP), expressed as Bézier
 * segments. Passes through the source samples without adding extrema or
 * extrapolating outside their range. Two samples define a straight segment.
 * https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.PchipInterpolator.html
 */
export function interpolateCurve(points: readonly CurveSample[]): CurveSegment[] {
  if (points.some((p, i) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || (i > 0 && p.x <= points[i - 1].x))) {
    throw new RangeError('Curve samples must be finite with strictly increasing x.');
  }
  if (points.length < 2) return [];

  const intervals = points.slice(1).map((p, i) => p.x - points[i].x);
  const secants = points.slice(1).map((p, i) => (p.y - points[i].y) / intervals[i]);
  const slopes = [secants[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const before = secants[i - 1], after = secants[i];
    if (before === 0 || after === 0 || Math.sign(before) !== Math.sign(after)) {
      slopes.push(0);
    } else {
      const w1 = 2 * intervals[i] + intervals[i - 1];
      const w2 = intervals[i] + 2 * intervals[i - 1];
      slopes.push((w1 + w2) / (w1 / before + w2 / after));
    }
  }
  const last = secants.length - 1;
  slopes.push(secants[last]);
  if (points.length > 2) {
    slopes[0] = endpointSlope(intervals[0], intervals[1], secants[0], secants[1]);
    slopes[points.length - 1] = endpointSlope(intervals[last], intervals[last - 1], secants[last], secants[last - 1]);
  }

  return points.slice(1).map((end, i) => {
    const start = points[i], third = intervals[i] / 3;
    return {
      start, end,
      control1: { x: start.x + third, y: start.y + slopes[i] * third },
      control2: { x: end.x - third, y: end.y - slopes[i + 1] * third },
    };
  });
}

/** Evaluate the same Bézier segments used by the chart, within the sampled range. */
export function evaluateCurve(segments: readonly CurveSegment[], x: number): number | null {
  const segment = segments.find(({ start, end }) => x >= start.x && x <= end.x);
  return segment ? evaluateCurveSegment(segment, x) : null;
}

export function evaluateCurveSegment(segment: CurveSegment, x: number): number {
  const { start, control1, control2, end } = segment;
  if (x === start.x) return start.y;
  if (x === end.x) return end.y;

  // The control points divide the x interval into thirds, so x varies linearly with t.
  const t = (x - start.x) / (end.x - start.x);
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const a = lerp(start.y, control1.y);
  const b = lerp(control1.y, control2.y);
  const c = lerp(control2.y, end.y);
  return lerp(lerp(a, b), lerp(b, c));
}

export type CurveInterval = { from: number; to: number };

/** PCHIP segments are monotone, so each can cross the limit at most once. */
export function curveIntervalsAbove(segments: readonly CurveSegment[], limit: number): CurveInterval[] {
  const intervals: CurveInterval[] = [];
  for (const segment of segments) {
    const { start, end } = segment;
    if (start.y <= limit && end.y <= limit) continue;
    let from = start.x, to = end.x;
    if (Math.min(start.y, end.y) < limit) {
      let lo = from, hi = to;
      for (let i = 0; i < 48; i++) {
        const mid = (lo + hi) / 2;
        if ((evaluateCurveSegment(segment, mid) > limit) === (start.y > limit)) lo = mid;
        else hi = mid;
      }
      const crossing = (lo + hi) / 2;
      if (start.y > limit) to = crossing;
      else from = crossing;
    }
    const previous = intervals.at(-1);
    if (previous && previous.to === from) previous.to = to;
    else intervals.push({ from, to });
  }
  return intervals;
}

function splitAtX(segment: CurveSegment, x: number): [CurveSegment, CurveSegment] {
  const { start, control1, control2, end } = segment;
  const t = (x - start.x) / (end.x - start.x);
  const lerp = (a: CurveSample, b: CurveSample) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const a = lerp(start, control1), b = lerp(control1, control2), c = lerp(control2, end);
  const left = lerp(a, b), right = lerp(b, c);
  const crossing = { x, y: left.y + (right.y - left.y) * t };
  return [{ start, control1: a, control2: left, end: crossing }, { start: crossing, control1: right, control2: c, end }];
}

/** Split a curve at the boundaries of sorted, disjoint x intervals, preserving its shape and gaps. */
export function splitCurveByIntervals(segments: readonly CurveSegment[], intervals: readonly CurveInterval[]) {
  const inside: CurveSegment[] = [], outside: CurveSegment[] = [];
  for (const segment of segments) {
    let rest: CurveSegment | null = segment;
    for (const { from, to } of intervals) {
      if (from >= rest.end.x) break;
      if (to <= rest.start.x) continue;
      if (from > rest.start.x) {
        const [before, after] = splitAtX(rest, from);
        outside.push(before);
        rest = after;
      }
      if (to >= rest.end.x) {
        inside.push(rest);
        rest = null;
        break;
      }
      const [before, after] = splitAtX(rest, to);
      inside.push(before);
      rest = after;
    }
    if (rest) outside.push(rest);
  }
  return { inside, outside };
}

/** Project into chart coordinates only after interpolation in data units. */
export function smoothCurvePath(
  points: readonly CurveSample[],
  x: (value: number) => number,
  y: (value: number) => number,
): string {
  return curveSegmentsPath(interpolateCurve(points), x, y);
}

export function curveSegmentsPath(
  segments: readonly CurveSegment[],
  x: (value: number) => number,
  y: (value: number) => number,
): string {
  const coordinate = (point: CurveSample) => `${x(point.x)},${y(point.y)}`;
  return segments.map(({ start, control1, control2, end }, index) => {
    const previous = segments[index - 1]?.end;
    const move = previous?.x === start.x && previous.y === start.y ? '' : `M${coordinate(start)} `;
    return `${move}C${coordinate(control1)} ${coordinate(control2)} ${coordinate(end)}`;
  }).join(' ');
}
