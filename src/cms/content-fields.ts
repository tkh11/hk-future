import type { Field, TextField, TextareaField } from 'payload';

const text = (name: string, label: string, maxLength = 240, required = true): TextField => ({ name, label, type: 'text', maxLength, required });
const paragraph = (name: string, label: string, maxLength = 6000): TextareaField => ({ name, label, type: 'textarea', required: true, maxLength });
const safeRelative = (value: unknown) => typeof value === 'string' && /^\/(?!\/)[^\\\u0000-\u0020]*$/.test(value);
const safeHTTP = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};
const url = (name: string, label: string, local = false): Field => ({
  name, label, type: 'text', required: true, maxLength: 2048,
  validate: (value: unknown) => (local ? safeRelative(value) : safeHTTP(value)) || (local ? 'Укажите относительный путь сайта, начиная с /.' : 'Укажите полный адрес http:// или https://.'),
});

/** A typed group preserves the existing public Article.content shape. */
export const articleContentFields: Field[] = [
  { name: 'title', type: 'text' },
  { name: 'slug', type: 'text' },
  text('category', 'Тема статьи', 120),
  paragraph('description', 'Описание для поиска', 1200),
  paragraph('lead', 'Вступление'),
  { name: 'readingMinutes', label: 'Время чтения, минут', type: 'number', required: true, min: 1, max: 180, defaultValue: 5 },
  { name: 'sections', label: 'Разделы', type: 'array', required: true, minRows: 1, maxRows: 40, fields: [
    text('heading', 'Заголовок'),
    { name: 'paragraphs', label: 'Абзацы', type: 'text', hasMany: true, required: true, minRows: 1, maxRows: 40, maxLength: 12000 },
  ] },
  { name: 'faq', label: 'Частые вопросы', type: 'array', maxRows: 30, defaultValue: [], fields: [text('question', 'Вопрос', 600), paragraph('answer', 'Ответ')] },
  { name: 'sources', label: 'Источники', type: 'array', maxRows: 30, defaultValue: [], fields: [text('title', 'Название источника', 300), url('url', 'Адрес источника')] },
  { name: 'related', label: 'Связанные статьи (адреса без /articles/)', type: 'text', hasMany: true, maxRows: 12, defaultValue: [],
    validate: (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item)) || 'Используйте адреса статей: латинские буквы, цифры и дефисы.' },
  url('catalogHref', 'Ссылка на раздел каталога', true),
  url('selectionHref', 'Ссылка на подбор оборудования', true),
  { name: 'date', label: 'Дата материала', type: 'text', required: true, maxLength: 10, validate: (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) || 'Дата в формате ГГГГ-ММ-ДД.' },
  { type: 'collapsible', label: 'Редакционные данные', fields: [
    { ...text('query', 'Поисковый запрос', 500, false), defaultValue: '' },
    { name: 'wordstat', label: 'Частота запроса', type: 'number', min: 0, defaultValue: 0 },
    { ...text('seed', 'Исходная тема', 1000, false), defaultValue: '' },
    { ...text('status', 'Редакционная отметка', 120, false), defaultValue: 'draft' },
    { ...text('language', 'Язык', 10), defaultValue: 'ru' },
    { ...text('wordstatSource', 'Источник частоты запроса', 2000, false), defaultValue: '' },
  ] },
];

export const contactContentFields: Field[] = [
  text('phone', 'Телефон', 80),
  { name: 'phoneHref', label: 'Ссылка для звонка', type: 'text', required: true, maxLength: 80, validate: (value: unknown) => typeof value === 'string' && /^tel:\+?[\d ()-]+$/.test(value) || 'Укажите телефон в формате tel:+74952584542.' },
  { name: 'email', label: 'E-mail офиса', type: 'email', required: true },
  { name: 'serviceEmail', label: 'E-mail сервисного центра', type: 'email', required: true },
  text('serviceExtensions', 'Добавочные сервисного центра', 120),
  text('address', 'Полный почтовый адрес', 1000),
  text('region', 'Индекс и регион', 300), text('locality', 'Населённый пункт', 300), text('street', 'Улица и здание', 300),
  text('hours', 'Часы работы', 120),
  { name: 'mapEmbed', label: 'Встраиваемая Яндекс Карта', type: 'text', required: true, maxLength: 2048, validate: (value: unknown) => {
    if (!safeHTTP(value)) return 'Укажите адрес Яндекс Карты.';
    const target = new URL(value as string);
    return target.hostname === 'yandex.ru' && target.pathname === '/map-widget/v1/' || 'Допустим только https://yandex.ru/map-widget/v1/.';
  } },
  { name: 'messengers', label: 'Мессенджеры', type: 'array', maxRows: 6, defaultValue: [], fields: [
    text('name', 'Название', 80), url('href', 'Ссылка'),
    { name: 'icon', label: 'Путь или HTTPS-адрес иконки', type: 'text', required: true, maxLength: 2048, validate: (value: unknown) => safeRelative(value) || safeHTTP(value) || 'Допустим путь /icons/… или http(s)-адрес изображения.' },
  ] },
];
