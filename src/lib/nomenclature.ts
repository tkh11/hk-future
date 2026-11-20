export const nomenclatureLimits = [10, 20, 50, 100];
export const defaultNomenclatureLimit = nomenclatureLimits[0];

export function nomenclatureLimit(value: unknown) {
  const limit = Number(value);
  return nomenclatureLimits.includes(limit) ? limit : defaultNomenclatureLimit;
}
