const previousPumpSystemTypes = {
  heating: 'Отопление',
  waterSupply: 'Водоснабжение',
  cooling: 'Охлаждение',
  airConditioning: 'Кондиционирование',
} as const;

export const pumpSystemTypes = {
  heating: previousPumpSystemTypes.heating,
  waterSupply: previousPumpSystemTypes.waterSupply,
  sewerage: 'Канализация',
  drainage: 'Дренаж',
  wellWaterSupply: 'Подача воды из скважин',
} as const;

export type PumpSystemType = keyof typeof pumpSystemTypes;

export function isPumpSystemType(value: string): value is PumpSystemType {
  return Object.hasOwn(pumpSystemTypes, value);
}

// Keep earlier selections readable in saved drafts and versions.
export const storedPumpSystemTypes = { ...previousPumpSystemTypes, ...pumpSystemTypes };
