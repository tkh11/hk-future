export function documentSize(bytes: number) {
  if (!bytes) return 'PDF';
  const size = bytes >= 1024 * 1024 ? bytes / (1024 * 1024) : bytes / 1024;
  return `PDF · ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(size)} ${bytes >= 1024 * 1024 ? 'МБ' : 'КБ'}`;
}
