import { z } from 'zod';
import * as pageCopy from './solution-pages';

// CMS copy is plain text. Keep engineering notation (≤, < 10, °C) intact,
// while refusing markup and control characters before it reaches storage.
export const plainContentText = z.string().max(12000).refine(
  value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value) && !/<(?:\/?[a-z][^>]*|!--[\s\S]*?)>/i.test(value),
  'Используйте обычный текст без HTML-разметки.',
);
const assetURL = z.string().max(2048).refine(value => {
  if (!value || /[\s\\\u0000-\u001f]/u.test(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//');
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, 'Укажите путь /… или адрес http(s) без учётных данных.');
const text = plainContentText;
const productDescription = z.object({
  id: text, label: text, title: text, text, image: assetURL, alt: text,
  detail: text.optional(), badge: assetURL.optional(),
});
const stringObject = <T extends Record<string, string>>(sample: T) => z.object(Object.fromEntries(Object.keys(sample).map(key => [key, text])) as { [K in keyof T]: typeof text });
const propertyRows = z.array(z.tuple([text, text])).max(100);
const completeIDs = (rows: { id: string }[], count: number) => rows.length === count && new Set(rows.map(row => row.id)).size === count;

/** Shared by server writes and public reads; fixed model IDs cannot disappear. */
export const solutionSchema = z.object({
  dcHero: stringObject(pageCopy.dcHero), fireHero: stringObject(pageCopy.fireHero),
  dcIntro: stringObject(pageCopy.dcIntro), fireIntro: stringObject(pageCopy.fireIntro),
  dcProducts: z.object({
    heading: text, headingAccent: text, description: text, pipeTitle: text, pipeDescription: text,
    pumpTitle: text, pumpTitleSecondLine: text, pumpDescription: text, projectNote: text,
    ctaTitle: text, ctaTitleSecondLine: text, pipeProperties: propertyRows, pumpProperties: propertyRows,
  }),
  firePageProducts: stringObject(pageCopy.firePageProducts),
  coolingProducts: z.array(productDescription.extend({ id: z.enum(['pipes', 'pumps', 'valves']) })).length(3)
    .refine(rows => completeIDs(rows, 3), 'Нужны ровно по одному описанию pipes, pumps и valves.'),
  fireProducts: z.array(productDescription.extend({ id: z.enum(['station', 'pipework', 'sprinkler', 'hydrants', 'flange']) })).length(5)
    .refine(rows => completeIDs(rows, 5), 'Нужны все пять элементов системы пожаротушения без повторов.'),
  fireStations: z.array(z.object({ id: z.enum(['fpa', 'fpv']), name: text, application: text, description: text })).length(2)
    .refine(rows => completeIDs(rows, 2), 'Нужны описания fpa и fpv без повторов.'),
});
export type SolutionContent = z.infer<typeof solutionSchema>;
