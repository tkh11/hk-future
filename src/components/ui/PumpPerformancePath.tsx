import { curveSegmentsPath, splitCurveByIntervals, type CurveInterval, type CurveSegment } from '@/lib/curve-interpolation';

export default function PumpPerformancePath({
  segments, className, color, overloadRanges = [], dashedOverload = false, x, y,
}: {
  segments: readonly CurveSegment[];
  className: string;
  color?: string;
  overloadRanges?: readonly CurveInterval[];
  dashedOverload?: boolean;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  if (overloadRanges.length === 0) {
    return <path className={className} d={curveSegmentsPath(segments, x, y)} style={{ stroke: color }} />;
  }

  const { inside: overload, outside: withinRating } = splitCurveByIntervals(segments, overloadRanges);
  return <>
    <path className={className} d={curveSegmentsPath(overload, x, y)} style={{ stroke: color, strokeWidth: 1 }}
      strokeDasharray={dashedOverload ? '5 3' : undefined} />
    {withinRating.length > 0 && <path className={className} d={curveSegmentsPath(withinRating, x, y)}
      style={{ stroke: color, strokeLinecap: 'butt' }} />}
  </>;
}
