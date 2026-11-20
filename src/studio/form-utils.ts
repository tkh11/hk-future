/** URL suggestions are opt-in for existing documents; never derive SKU / 1C IDs. */
export function suggestSlug(title: string): string {
  const alphabet: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
  return [...title.toLowerCase()].map(char => alphabet[char] ?? char).join('').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,150).replace(/-+$/g, '');
}

/** Immutable update of existing content only. IDs/order/other branches stay intact. */
export function updateContentAtPath<T>(content: T, path: readonly (string | number)[], value: unknown): T {
  if (!path.length) return value as T;
  const [key, ...rest] = path;
  if (['__proto__', 'constructor', 'prototype'].includes(String(key))) throw new Error('Недопустимое поле.');
  if (content === null || typeof content !== 'object') throw new Error('Содержимое не загружено.');
  const next = Array.isArray(content) ? [...content] : { ...content };
  const record = next as Record<string | number, unknown>;
  record[key] = updateContentAtPath(record[key], rest, value);
  return next as T;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Only fields that changed since the last save are sent, so a stale tab cannot overwrite untouched fields. */
export function changedFields<T extends object>(saved: T, current: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(current) as (keyof T)[]) if (!same(saved[key], current[key])) patch[key] = current[key];
  return patch;
}
