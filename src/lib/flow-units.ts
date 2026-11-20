export const flowUnitLabels = { m3h: 'м³/ч', ls: 'л/с', lmin: 'л/мин' } as const;
export type FlowUnit = keyof typeof flowUnitLabels;

const cubicMetresPerHour = { m3h: 1, ls: 3.6, lmin: 0.06 } as const;

export function parseFlowUnit(value: unknown): FlowUnit {
  return typeof value === 'string' && Object.hasOwn(flowUnitLabels, value) ? value as FlowUnit : 'm3h';
}

export function toM3h(value: number, unit: FlowUnit): number {
  return value * cubicMetresPerHour[unit];
}

export function fromM3h(value: number, unit: FlowUnit): number {
  return value / cubicMetresPerHour[unit];
}
