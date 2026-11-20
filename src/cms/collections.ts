import { APIError, ValidationError, type CollectionConfig, type Field, type GlobalConfig } from 'payload';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { adminOnly, adminField, editors, publishers, publishedOrEditor, guardPublication, captureDraftOperation, roles, canEdit, isAdmin } from './access';
import { contentChanged, contentDeleted, validateCategoryPath, capturePublishedPath } from './hooks';
import { pageBlocks } from './blocks';
import { validateProduct } from './product-validation';
import { articleContentFields, contactContentFields } from './content-fields';
import { disableEmailRecovery } from './email';
import { isOfficeDevelopment } from './env';
import { solutionSchema } from '../content/cms-schemas';
import { seedSourceKey } from './seed-key';
import { extendCatalog } from './catalog-fields';
import { pumpSelectionRecords } from './pump-selection-records';
import { pumpSelectionGroupRecords } from './pump-selection-group-records';

function stripFieldAdmin(field: Field): Field {
  const copy = { ...field } as Field & { admin?: unknown; fields?: Field[]; tabs?: { fields: Field[] }[]; blocks?: { fields: Field[] }[] };
  delete copy.admin;
  if (Array.isArray(copy.fields)) copy.fields = copy.fields.map(stripFieldAdmin);
  if (Array.isArray(copy.tabs)) copy.tabs = copy.tabs.map(tab => ({ ...tab, fields: tab.fields.map(stripFieldAdmin) }));
  if (Array.isArray(copy.blocks)) copy.blocks = copy.blocks.map(block => ({ ...block, fields: block.fields.map(stripFieldAdmin) }));
  return copy;
}
function stripCollectionAdmin(collection: CollectionConfig): CollectionConfig {
  const rest = { ...collection };
  delete rest.admin;
  return { ...rest, fields: collection.fields.map(stripFieldAdmin) };
}
function stripGlobalAdmin(global: GlobalConfig): GlobalConfig {
  const rest = { ...global };
  delete rest.admin;
  return { ...rest, fields: global.fields.map(stripFieldAdmin) };
}

const title: Field = { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 200 };
const slug: Field = { name: 'slug', label: 'Адрес', type: 'text', required: true, index: true, maxLength: 150, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || 'Латинские буквы, цифры и дефисы.' };
const description: Field = { name: 'description', label: 'Описание', type: 'textarea', maxLength: 10000 };
const image: Field = { name: 'image', label: 'Изображение', type: 'upload', relationTo: 'media' };
const versions = { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 };
const contentAccess: CollectionConfig['access'] = { read: publishedOrEditor, create: editors, update: editors, delete: publishers, readVersions: editors };
function contentCollection(slug: string, label: string, fields: Field[]): CollectionConfig {
  return {
    slug, labels: { singular: label, plural: label },
    access: contentAccess, lockDocuments: { duration: 300 }, versions, fields,
    hooks: { beforeOperation: [captureDraftOperation], beforeChange: [guardPublication, capturePublishedPath], afterChange: [contentChanged], afterDelete: [contentDeleted] },
  };
}

const Users: CollectionConfig = {
  slug: 'users', labels: { singular: 'Пользователь', plural: 'Пользователи' },
  hooks: { beforeOperation: [disableEmailRecovery] },
  auth: { maxLoginAttempts: 5, lockTime: 15 * 60 * 1000, tokenExpiration: 2 * 60 * 60, cookies: { sameSite: isOfficeDevelopment() ? 'Strict' : 'Lax', secure: process.env.NODE_ENV === 'production' && !process.env.CMS_SERVER_URL?.startsWith('http://localhost') }, verify: false },
  access: {
    admin: () => false,
    create: adminOnly, delete: adminOnly,
    read: ({ req }) => isAdmin(req.user) || (req.user ? { id: { equals: req.user.id } } : false),
    update: ({ req }) => isAdmin(req.user) || (req.user ? { id: { equals: req.user.id } } : false),
  },
  fields: [{ name: 'name', type: 'text', label: 'Имя' }, { name: 'role', label: 'Роль', type: 'select', options: roles.map(value => ({ value, label: ({ admin: 'Администратор', editor: 'Редактор', publisher: 'Публикующий редактор', analyst: 'Аналитик' })[value] })), required: true, defaultValue: 'editor', saveToJWT: true, access: { create: adminField, update: adminField } }],
};

const Categories = contentCollection('categories', 'Категории', [
  seedSourceKey, title, slug, description,
  { name: 'parent', type: 'relationship', relationTo: 'categories', label: 'Родительская категория' },
  { name: 'path', label: 'Полный путь (рассчитывается автоматически)', type: 'text', unique: true, index: true, access: { create: () => false, update: () => false } },
  { name: 'sortOrder', label: 'Порядок', type: 'number', defaultValue: 0 },
  { name: 'art', label: 'Иконка раздела', type: 'select', options: [{label:'Трубы',value:'pipes'},{label:'Многослойные трубы',value:'layers'},{label:'Насосы',value:'pump'},{label:'Циркуляция',value:'circulation'},{label:'Скважина',value:'borehole'},{label:'Дренаж',value:'drainage'},{label:'Насосная станция',value:'station'},{label:'Автоматика',value:'automation'},{label:'Вспомогательное оборудование',value:'auxiliary'}], defaultValue: 'pipes', required: true },
  image, { name: 'imagePath', label: 'Исходное изображение', type: 'text', access: { create: adminField, update: adminField } },
  { name: 'tone', label: 'Оформление', type: 'select', options: [{label:'Светлое',value:'light'}] },
]);
Categories.hooks!.beforeValidate = [validateCategoryPath];

const Products = contentCollection('products', 'Товары', [
  { type: 'tabs', tabs: [
    { label: 'Основное', fields: [title,
      { name: 'sku', label: 'Артикул', type: 'text', required: true, unique: true, maxLength: 100 },
      description,
      { name: 'category', label: 'Категория', type: 'relationship', relationTo: 'categories', required: true },
      { type: 'collapsible', label: 'Служебное', fields: [
        { ...slug, unique: true },
        { name: 'externalId', label: 'Идентификатор в 1С / другой системе', type: 'text', unique: true, maxLength: 100 },
      ] },
    ] },
    { label: 'Изображения', fields: [] },
    { label: 'Характеристики', fields: [] },
    { label: 'Документы', fields: [] },
    { label: 'Проверка', fields: [] },
  ] },
]);
Products.hooks!.beforeValidate = [validateProduct];
const Pages = contentCollection('pages', 'Страницы', [seedSourceKey, title,
  { name: 'path', label: 'Адрес страницы', type: 'text', unique: true, required: true, hooks: { beforeValidate: [({ value }) => typeof value === 'string' && value !== '/' ? value.replace(/\/+$/, '') : value] }, validate: (v: unknown) => typeof v === 'string' && /^\/(?:[a-z0-9-]+\/?)*$/.test(v) && !/^\/(?:admin|api|catalog|products|articles|docs)(?:\/|$)/.test(v) || 'Допустим путь страницы; системные разделы зарезервированы.' },
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
Media.upload = {
  staticDir: process.env.CMS_UPLOAD_DIR || path.resolve('.local/uploads'),
  mimeTypes: ['image/jpeg','image/png','image/webp','application/pdf','video/mp4'],
  filesRequiredOnCreate: true, crop: false, focalPoint: false,
  imageSizes: [
    { name: 'thumb', width: 160, height: 160, position: 'centre', withoutEnlargement: true },
    { name: 'card', width: 640, withoutEnlargement: true },
    { name: 'wide', width: 1200, withoutEnlargement: true },
  ],
};
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
Media.hooks!.beforeValidate = [async ({ req, data }) => {
  const file = req.file;
  if (file) {
    const bytes = file.data;
    const valid = file.mimetype === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.mimetype === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : file.mimetype === 'image/webp' ? bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'
      : file.mimetype === 'application/pdf' ? bytes.toString('ascii',0,5) === '%PDF-'
      : file.mimetype === 'video/mp4' && bytes.toString('ascii',4,8) === 'ftyp';
    const limit = file.mimetype === 'application/pdf' ? 256 * 1024 * 1024 : 32 * 1024 * 1024;
    if (!valid || file.size > limit) throw new Error('Недопустимый файл или превышен допустимый размер.');
    if(file.mimetype==='application/pdf'){
      const sha256=createHash('sha256').update(bytes).digest('hex');
      const same=await req.payload.count({collection:'media',where:{sha256:{equals:sha256}},req,overrideAccess:true});
      if(same.totalDocs)throw new ValidationError({collection:'media',req,errors:[{path:'file',message:'Этот PDF уже загружен. Выберите существующий файл из библиотеки.'}]});
      data={...data,sha256};
    }
  }
  return data;
}];

const Redirects: CollectionConfig = { slug: 'redirects', labels: { singular: 'Перенаправление', plural: 'Перенаправления' }, access: { read: () => true, create: adminOnly, update: adminOnly, delete: adminOnly }, fields: [{ name: 'from', type: 'text', required: true, unique: true }, { name: 'to', type: 'text', required: true, validate: (v: unknown) => typeof v === 'string' && /^\/[a-z0-9/-]*$/.test(v) || 'Только локальный путь.' }] };
const ImportBatches: CollectionConfig = { slug: 'import-batches', labels: { singular: 'Пакет импорта', plural: 'История импорта' }, access: {
  read: ({ req }) => isAdmin(req.user) || (canEdit(req.user) && req.user ? { actorId: { equals: String(req.user.id) } } : false),
  create: ({ req }) => canEdit(req.user) && req.context.catalogImport === true,
  update: ({ req }) => canEdit(req.user) && req.context.catalogImport === true && !!req.user && ({ actorId: { equals: String(req.user.id) } }),
  delete: adminOnly,
}, fields: [
  { name: 'batchId', type: 'text', required: true, unique: true, index: true },
  { name: 'filename', type: 'text', required: true }, { name: 'actorId', type: 'text', required: true }, { name: 'status', type: 'select', options: ['preview','applied','failed'], defaultValue: 'preview' }, { name: 'data', type: 'json', required: true },
] };

const catalogExtensions = extendCatalog(Products, Media, contentCollection);
export const collections: CollectionConfig[] = [Users, Categories, Products, ...catalogExtensions, pumpSelectionGroupRecords, pumpSelectionRecords, Pages, Articles, Media, Redirects, ImportBatches].map(stripCollectionAdmin);

function contentGlobal(slug: string, label: string): GlobalConfig {
  return { slug, label, access: { read: () => true, update: publishers, readVersions: editors }, versions: { max: 30 }, fields: [{ name: 'content', label: 'Содержимое', type: 'json', required: true }] };
}
const globalsConfig: GlobalConfig[] = [{ ...contentGlobal('contacts', 'Контакты'), fields: [{ name: 'content', label: 'Контактная информация', type: 'group', fields: contactContentFields }] }, { ...contentGlobal('solution-content', 'Тексты решений'), fields: [{ name: 'content', type: 'json', required: true, label: 'Тексты решений' }], hooks: { beforeValidate: [({ data, originalDoc, req }) => {
    const parsed = solutionSchema.safeParse(data?.content === undefined ? originalDoc?.content : data.content);
    if (!parsed.success) throw new ValidationError({ global: 'solution-content', req, errors: parsed.error.issues.map(issue => ({ path: ['content', ...issue.path].join('.'), message: issue.message })) });
    return { ...data, content: parsed.data };
  }] } },
  { ...contentGlobal('navigation', 'Меню сайта'), access: { read: () => true, update: publishers, readVersions: editors }, versions: { max: 30 }, fields: [{ name: 'items', label: 'Пункты меню', type: 'array', fields: [{ name: 'label', label: 'Название пункта', type: 'text', required: true }, { name: 'href', label: 'Ссылка', type: 'text', required: true, validate: (v: unknown) => typeof v === 'string' && /^\/(?!\/)/.test(v) || 'Только относительный путь сайта.' }] }] },
  { ...contentGlobal('site-settings', 'Настройки сайта'), access: { read: () => true, update: adminOnly, readVersions: adminOnly }, versions: { max: 30 }, fields: [{ name: 'title', type: 'text', defaultValue: 'HEISSKRAFT' }, { name: 'description', type: 'textarea' }] },
];
export const globals: GlobalConfig[] = globalsConfig.map(stripGlobalAdmin);
