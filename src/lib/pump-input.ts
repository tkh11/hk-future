export function readPumpDecimal(value: string): number | null {
  if (value.length > 64) return null;
  const raw = value.trim();
  if (!/^(?:\d+(?:[,.]\d+)?|[,.]\d+)$/.test(raw)) return null;
  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
