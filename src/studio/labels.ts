import definitions from '@/cms/catalog-definitions.json';

export type Profile = (typeof definitions.profiles)[number]['value'];
export type ReviewState = 'ready' | 'review' | 'blocked';
/** `changed`: the site shows a published version, and a newer draft is waiting. */
export type PublishState = 'draft' | 'published' | 'changed';

export const profiles = definitions.profiles as { value: Profile; label: string }[];
export const profileValues = profiles.map(p => p.value) as [Profile, ...Profile[]];
const profileLabels = new Map(profiles.map(p => [p.value, p.label]));
export const profileLabel = (value?: string | null) => (value ? profileLabels.get(value as Profile) ?? value : '—');

export const reviewLabels: Record<ReviewState, string> = { ready: 'Проверено', review: 'Проверка', blocked: 'Конфликт' };
export const publishLabels: Record<PublishState, string> = { draft: 'Не на сайте', published: 'На сайте', changed: 'Есть правки' };
export const publishOptions = [{ value: 'published', label: 'На сайте' }, { value: 'draft', label: 'Не на сайте' }];

type SpecDefinition = { key: string; label: string; unit: string; profiles: string[]; type: string };
const specs = definitions.fields as SpecDefinition[];
export const specColumns = (profile?: Profile) => (profile ? specs.filter(s => s.profiles.includes(profile)) : []);

// A fixed zone keeps server and browser output identical during hydration.
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const numberFormat = new Intl.NumberFormat('ru-RU');
