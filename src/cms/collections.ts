import { APIError, ValidationError, type CollectionConfig, type Field, type GlobalConfig } from 'payload';
import path from 'node:path';
import { adminOnly, adminField, editors, publishers, publishedOrEditor, guardPublication, captureDraftOperation, roles, canEdit, isAdmin } from './access';
import { contentChanged, contentDeleted, validateCategoryPath, capturePublishedPath } from './hooks';
import { pageBlocks } from './blocks';
import { validateProduct } from './product-validation';
import { articleContentFields, contactContentFields } from './content-fields';
import { disableEmailRecovery } from './email';
import { solutionSchema } from '../content/cms-schemas';
import { seedSourceKey } from './seed-key';

const title: Field = { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 200 };
const slug: Field = { admin: { description: 'Предлагается по названию для новой записи. Изменение адреса существующей записи создаёт перенаправление, где оно поддерживается.', components: { Field: '@/cms/components/SlugField#default' } }, name: 'slug', label: 'Адрес', type: 'text', required: true, index: true, maxLength: 150, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || 'Латинские буквы, цифры и дефисы.' };
const description: Field = { name: 'description', label: 'Описание', type: 'textarea', maxLength: 10000 };
const image: Field = { name: 'image', label: 'Изображение', type: 'upload', relationTo: 'media' };
const versions = { drafts: { autosave: { interval: 1500, showSaveDraftButton: true } }, maxPerDoc: 30 };
const contentAccess: CollectionConfig['access'] = { read: publishedOrEditor, create: editors, update: editors, delete: publishers, readVersions: editors };
function contentCollection(slug: string, label: string, fields: Field[]): CollectionConfig {
  return {
    slug, labels: { singular: label, plural: label }, admin: { useAsTitle: 'title', hideAPIURL: true, group: 'Контент', defaultColumns: ['title', '_status', 'updatedAt'],
      components: { edit: { beforeDocumentControls: ['@/cms/components/EditorStatus#default'], SaveDraftButton: '@/cms/components/SaveDraftControl#default', PreviewButton: '@/cms/components/PublicationControls#PreviewControl', PublishButton: '@/cms/components/PublicationControls#PublishControl', UnpublishButton: '@/cms/components/PublicationControls#UnpublishControl' } },
      preview: (data) => `/api/preview?collection=${slug}&id=${data.id}`,
      livePreview: { url: ({ data }) => `/api/preview?collection=${slug}&id=${data.id}`, breakpoints: [{ label: 'Desktop', name: 'desktop', width: 1440, height: 900 }, { label: 'Mobile', name: 'mobile', width: 390, height: 844 }] },
    },
    access: contentAccess, lockDocuments: { duration: 300 }, versions, fields,
    hooks: { beforeOperation: [captureDraftOperation], beforeChange: [guardPublication, capturePublishedPath], afterChange: [contentChanged], afterDelete: [contentDeleted] },
  };
}

const Users: CollectionConfig = {
  slug: 'users', labels: { singular: 'Пользователь', plural: 'Пользователи' },
  hooks: { beforeOperation: [disableEmailRecovery] },
  auth: { maxLoginAttempts: 5, lockTime: 15 * 60 * 1000, tokenExpiration: 2 * 60 * 60, cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' && !process.env.CMS_SERVER_URL?.startsWith('http://localhost') }, verify: false },
  admin: { useAsTitle: 'email', group: 'Настройки' },
  access: {
    admin: ({ req }) => !!req.user,
    create: adminOnly, delete: adminOnly,
    read: ({ req }) => isAdmin(req.user) || (req.user ? { id: { equals: req.user.id } } : false),
    update: ({ req }) => isAdmin(req.user) || (req.user ? { id: { equals: req.user.id } } : false),
  },
  fields: [{ name: 'name', type: 'text', label: 'Имя' }, { name: 'role', label: 'Роль', type: 'select', options: roles.map(value => ({ value, label: ({ admin: 'Администратор', editor: 'Редактор', publisher: 'Публикующий редактор', analyst: 'Аналитик' })[value] })), required: true, defaultValue: 'editor', saveToJWT: true, access: { create: adminField, update: adminField } }],
};

const Categories = contentCollection('categories', 'Категории', [
  seedSourceKey, title, slug, description,
  { name: 'parent', type: 'relationship', relationTo: 'categories', label: 'Родительская категория' },
  { name: 'path', label: 'Полный путь (рассчитывается автоматически)', type: 'text', unique: true, index: true, admin: { readOnly: true }, access: { create: () => false, update: () => false } },
  { name: 'sortOrder', label: 'Порядок', type: 'number', defaultValue: 0 },
  { name: 'art', label: 'Иконка раздела', type: 'select', options: [{label:'Трубы',value:'pipes'},{label:'Многослойные трубы',value:'layers'},{label:'Насосы',value:'pump'},{label:'Циркуляция',value:'circulation'},{label:'Скважина',value:'borehole'},{label:'Дренаж',value:'drainage'},{label:'Насосная станция',value:'station'},{label:'Автоматика',value:'automation'},{label:'Вспомогательное оборудование',value:'auxiliary'}], defaultValue: 'pipes', required: true },
  image, { name: 'imagePath', label: 'Исходное изображение', type: 'text', admin: { readOnly: true }, access: { create: adminField, update: adminField } },
  { name: 'tone', label: 'Оформление', type: 'select', options: [{label:'Светлое',value:'light'}] },
]);
Categories.hooks!.beforeValidate = [validateCategoryPath];

const ProductSeries = contentCollection('product-series', 'Серии продукции', [title, { ...slug, unique: true }, description, { name: 'category', label: 'Категория', type: 'relationship', relationTo: 'categories', required: true }, image]);
const Products = contentCollection('products', 'Товары', [
  { type: 'tabs', tabs: [
    { label: 'Основное', fields: [title,
      { name: 'sku', label: 'Артикул', type: 'text', required: true, unique: true, maxLength: 100, admin: { description: 'Укажите артикул производителя. Он не меняется автоматически.' } },
      description,
      { name: 'category', label: 'Категория', type: 'relationship', relationTo: 'categories', required: true, admin: { description: 'Выберите раздел каталога, в котором появится товар.' } },
      { name: 'series', label: 'Серия', type: 'relationship', relationTo: 'product-series', admin: { description: 'Необязательно. Серия должна относиться к выбранной категории.' } },
      { type: 'collapsible', label: 'Дополнительные настройки', admin: { initCollapsed: true }, fields: [
        { ...slug, unique: true },
        { name: 'externalId', label: 'Идентификатор в 1С / другой системе', type: 'text', unique: true, maxLength: 100, admin: { description: 'Заполняется при интеграции. Не меняйте без согласования с ответственным за обмен данными.' } },
      ] },
    ] },
    { label: 'Изображения', fields: [{ ...image, admin: { description: 'Выберите фотографию товара. Чтобы заменить файл, загрузите новую запись: опубликованное изображение останется доступным.' } }] },
    { label: 'Характеристики', fields: [{ name: 'attributes', label: 'Характеристики', type: 'array', maxRows: 100, fields: [
      { name: 'label', label: 'Название характеристики', type: 'text', required: true, admin: { placeholder: 'Рабочее давление' } },
      { name: 'key', label: 'Код характеристики', type: 'text', required: true, admin: { description: 'Постоянный код без пробелов, например pressure. Не повторяйте коды в одном товаре.' } },
      { name: 'valueType', label: 'Тип значения', type: 'select', options: [{label:'Текст',value:'text'},{label:'Число',value:'number'},{label:'Да / нет',value:'boolean'}], required: true },
      { name: 'textValue', label: 'Значение', type: 'text', admin: { condition: (_, sibling) => sibling.valueType === 'text' } },
      { name: 'numberValue', label: 'Значение', type: 'number', admin: { condition: (_, sibling) => sibling.valueType === 'number' } },
      { name: 'booleanValue', label: 'Да', type: 'checkbox', admin: { condition: (_, sibling) => sibling.valueType === 'boolean' } },
      { name: 'unit', label: 'Единица измерения', type: 'text', admin: { placeholder: 'бар' } },
    ] }] },
    { label: 'Документы', fields: [{ name: 'documents', label: 'Документы', type: 'relationship', relationTo: 'media', hasMany: true, admin: { description: 'Инструкции, сертификаты и другие документы. Файлы публикуются отдельно от товара.' } }] },
    { label: 'Проверка', fields: [{ name: 'review', type: 'ui', admin: { components: { Field: '@/cms/components/EditorStatus#ProductReview' } } }] },
  ] },
]);
Products.hooks!.beforeValidate = [validateProduct];
const Pages = contentCollection('pages', 'Страницы', [seedSourceKey, title,
  { name: 'path', label: 'Адрес страницы', type: 'text', admin: { components: { Cell: '@/cms/components/PagePathCell#default' } }, unique: true, required: true, hooks: { beforeValidate: [({ value }) => typeof value === 'string' && value !== '/' ? value.replace(/\/+$/, '') : value] }, validate: (v: unknown) => typeof v === 'string' && /^\/(?:[a-z0-9-]+\/?)*$/.test(v) && !/^\/(?:admin|api|catalog|products|articles)(?:\/|$)/.test(v) || 'Допустим путь страницы; системные разделы зарезервированы.' },
  { name: 'blocks', label: 'Блоки страницы', type: 'blocks', blocks: pageBlocks, maxRows: 50 },
]);
const Articles = contentCollection('articles', 'Статьи', [seedSourceKey, title, { ...slug, unique: true }, { name: 'content', label: 'Содержание статьи', type: 'group', fields: articleContentFields }]);
Articles.hooks!.beforeValidate = [({ data, originalDoc }) => {
  if (!data) return data;
  data.content = { ...(originalDoc?.content ?? {}), ...(data.content ?? {}), title: data.title ?? originalDoc?.title, slug: data.slug ?? originalDoc?.slug };
  return data;
}];

const Media = contentCollection('media', 'Медиа', [
  { name: 'title', label: 'Название', type: 'text' }, { name: 'alt', label: 'Альтернативный текст', type: 'text', required: true },
]);
// A file must be created together with its bytes. Payload otherwise creates an
// empty autosaved document on opening /create, conflicting with immutable uploads.
Media.versions = { drafts: { autosave: false }, maxPerDoc: 30 };
Media.upload = { staticDir: process.env.CMS_UPLOAD_DIR || path.resolve('.local/uploads'), mimeTypes: ['image/jpeg','image/png','image/webp','application/pdf','video/mp4'], filesRequiredOnCreate: true, crop: false, focalPoint: false };
Media.hooks!.beforeOperation!.push(({ operation, args, req }) => {
  // Payload can write/delete upload bytes before beforeChange runs, including
  // when only a draft is being saved. A media document therefore owns immutable
  // bytes: upload a new document and publish the changed relationship instead.
  if (operation === 'create' && 'overwriteExistingFiles' in args) args.overwriteExistingFiles = false;
  if (operation !== 'update') return;
  const data = 'data' in args ? args.data : undefined;
  if (req.file || req.query?.uploadEdits || data?.focalX != null || data?.focalY != null) {
    throw new APIError('Для замены или обработки файла создайте новую запись в медиатеке.', 400);
  }
});
Media.hooks!.beforeValidate = [({ req, data }) => {
  const file = req.file;
  if (file) {
    const bytes = file.data;
    const valid = file.mimetype === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.mimetype === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : file.mimetype === 'image/webp' ? bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'
      : file.mimetype === 'application/pdf' ? bytes.toString('ascii',0,5) === '%PDF-'
      : file.mimetype === 'video/mp4' && bytes.toString('ascii',4,8) === 'ftyp';
    if (!valid || file.size > 32 * 1024 * 1024) throw new Error('Недопустимый файл или размер более 32 МБ.');
  }
  return data;
}];

const Redirects: CollectionConfig = { slug: 'redirects', labels: { singular: 'Перенаправление', plural: 'Перенаправления' }, admin: { group: 'Настройки' }, access: { read: () => true, create: adminOnly, update: adminOnly, delete: adminOnly }, fields: [{ name: 'from', type: 'text', required: true, unique: true }, { name: 'to', type: 'text', required: true, validate: (v: unknown) => typeof v === 'string' && /^\/[a-z0-9/-]*$/.test(v) || 'Только локальный путь.' }] };
const ImportBatches: CollectionConfig = { slug: 'import-batches', labels: { singular: 'Пакет импорта', plural: 'История импорта' }, admin: { group: 'Каталог', useAsTitle: 'filename' }, access: {
  read: ({ req }) => isAdmin(req.user) || (canEdit(req.user) && req.user ? { actorId: { equals: String(req.user.id) } } : false),
  create: ({ req }) => canEdit(req.user) && req.context.catalogImport === true,
  update: ({ req }) => canEdit(req.user) && req.context.catalogImport === true && !!req.user && ({ actorId: { equals: String(req.user.id) } }),
  delete: adminOnly,
}, fields: [
  { name: 'batchId', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
  { name: 'filename', type: 'text', required: true }, { name: 'actorId', type: 'text', required: true }, { name: 'status', type: 'select', options: ['preview','applied','failed'], defaultValue: 'preview' }, { name: 'data', type: 'json', required: true },
] };

for (const collection of [Categories, ProductSeries, Products]) collection.admin!.group = 'Каталог';
Pages.admin!.group = 'Страницы сайта';
Pages.admin!.defaultColumns = ['title', 'path', '_status', 'updatedAt'];
Articles.admin!.group = 'Новости и статьи';
Media.admin!.group = 'Файлы';

export const collections: CollectionConfig[] = [Users, Categories, ProductSeries, Products, Pages, Articles, Media, Redirects, ImportBatches];

function contentGlobal(slug: string, label: string): GlobalConfig {
  return { slug, label, admin: { hideAPIURL: true, group: 'Контакты и меню', description: 'Изменения применятся сразу после сохранения. Предыдущие значения доступны в истории версий.', components: { elements: { beforeDocumentControls: ['@/cms/components/EditorStatus#default'] } } }, access: { read: () => true, update: publishers, readVersions: editors }, versions: { max: 30 }, fields: [{ name: 'content', label: 'Содержимое', type: 'json', required: true }] };
}
export const globals: GlobalConfig[] = [{ ...contentGlobal('contacts', 'Контакты'), fields: [{ name: 'content', label: 'Контактная информация', type: 'group', fields: contactContentFields }] }, { ...contentGlobal('solution-content', 'Тексты решений'), fields: [{ name: 'content', type: 'json', required: true, label: 'Тексты решений', admin: { components: { Field: '@/cms/components/SolutionEditor#default' } } }], hooks: { beforeValidate: [({ data, originalDoc, req }) => {
    const parsed = solutionSchema.safeParse(data?.content === undefined ? originalDoc?.content : data.content);
    if (!parsed.success) throw new ValidationError({ global: 'solution-content', req, errors: parsed.error.issues.map(issue => ({ path: ['content', ...issue.path].join('.'), message: issue.message })) });
    return { ...data, content: parsed.data };
  }] } },
  { ...contentGlobal('navigation', 'Меню сайта'), access: { read: () => true, update: publishers, readVersions: editors }, versions: { max: 30 }, fields: [{ name: 'items', label: 'Пункты меню', type: 'array', fields: [{ name: 'label', label: 'Название пункта', type: 'text', required: true }, { name: 'href', label: 'Ссылка', type: 'text', required: true, validate: (v: unknown) => typeof v === 'string' && /^\/(?!\/)/.test(v) || 'Только относительный путь сайта.' }] }] },
  { ...contentGlobal('site-settings', 'Настройки сайта'), access: { read: () => true, update: adminOnly, readVersions: adminOnly }, versions: { max: 30 }, fields: [{ name: 'title', type: 'text', defaultValue: 'HEISSKRAFT' }, { name: 'description', type: 'textarea' }] },
];
