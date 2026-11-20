import { z } from 'zod';

export const curvePoint = z.object({
  flow: z.number().finite().nonnegative(),
  head: z.number().finite().nonnegative(),
});

export const curvePoints = z.array(curvePoint).min(2, 'Укажите минимум две точки.').max(200)
  .refine(points => points.every((point, i) => i === 0 || point.flow > points[i - 1].flow),
    'Расход должен возрастать от строки к строке без повторов.');

export type CurvePoint = z.infer<typeof curvePoint>;
