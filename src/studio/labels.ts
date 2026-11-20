import type { Role } from '@/cms/access';
import definitions from '@/cms/catalog-definitions.json' with { type: 'json' };

export type Profile = (typeof definitions.profiles)[number]['value'];
export type ReviewState = 'ready' | 'review' | 'blocked';
/** `changed`: the site shows a published version, and a newer draft is waiting. */
export type PublishState = 'draft' | 'published' | 'changed';

export const profiles = definitions.profiles as { value: Profile; label: string }[];
export const profileValues = profiles.map(p => p.value) as [Profile, ...Profile[]];
const profileLabels = new Map(profiles.map(p => [p.value, p.label]));
export const profileLabel = (value?: string | null) => (value ? profileLabels.get(value as Profile) ?? value : '—');

export const roleLabels: Record<Role, string> = { admin: 'Администратор', editor: 'Редактор', publisher: 'Публикующий редактор', analyst: 'Аналитик' };

export const reviewLabels: Record<ReviewState, string> = { ready: 'Проверено', review: 'Проверка', blocked: 'Конфликт' };
export const publishLabels: Record<PublishState, string> = { draft: 'Не на сайте', published: 'На сайте', changed: 'Есть правки' };
export const publishOptions = [{ value: 'published', label: 'На сайте' }, { value: 'draft', label: 'Не на сайте' }];

export const colors = [
  { value: 'green', label: 'Зелёный' }, { value: 'purple', label: 'Фиолетовый' }, { value: 'black', label: 'Чёрный' },
  { value: 'red', label: 'Красный' }, { value: 'blue', label: 'Синий' }, { value: 'azure', label: 'Голубой' },
] as const;
export type Color = (typeof colors)[number]['value'];
const colorLabels = new Map(colors.map(c => [c.value, c.label]));
export const colorLabel = (value?: string | null) => (value ? colorLabels.get(value as Color) ?? value : '—');

type SpecDefinition = { key: string; label: string; unit: string; profiles: string[]; type: string };
const specs = definitions.fields as SpecDefinition[];
export const specFields = specs;
export const specColumns = (profile?: Profile) => (profile ? specs.filter(s => s.profiles.includes(profile)) : []);

// A fixed zone keeps server and browser output identical during hydration.
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const numberFormat = new Intl.NumberFormat('ru-RU');
