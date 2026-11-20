import { APIError, ValidationError, type CollectionConfig } from 'payload';
import { canEdit, publishers } from './access';
import { pumpSelectionProjection } from './pump-selection-fields';
import { pumpGroupPath, pumpGroupSlug, type PumpSelectionGroupNode } from './pump-selection-groups';
import { pumpSharedCharacteristicsSchema } from './pump-shared-characteristics';

function validateCharacteristics(value: unknown) {
  if (value && typeof value === 'object' && Object.hasOwn(value, 'connectionSize')) {
    return 'Укажите диаметр присоединения в карточке насоса.';
  }
  return value == null || pumpSharedCharacteristicsSchema.safeParse(value).success || 'Проверьте общие характеристики.';
}

export const pumpSelectionGroupRecords: CollectionConfig = {
  slug: 'pump-selection-groups',
  labels: { singular: 'Папка насосов', plural: 'Папки насосов' },
  access: {
    read: ({ req }) => canEdit(req.user) || req.context.pumpSelectionProjection === pumpSelectionProjection,
    create: publishers, update: publishers, delete: publishers,
  },
  indexes: [{ fields: ['parent', 'slug'], unique: true }],
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 200 },
    { name: 'slug', label: 'Адрес', type: 'text', required: true, maxLength: 100,
      validate: (value: unknown) => typeof value === 'string' && /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(value)
        && !/^\d+$/.test(value) || 'Укажите адрес из букв, цифр и дефисов.' },
    { name: 'parent', label: 'Родительская папка', type: 'relationship', relationTo: 'pump-selection-groups', index: true },
    { name: 'sharedCharacteristics', label: 'Опубликованные характеристики', type: 'json', validate: validateCharacteristics },
    { name: 'sharedCharacteristicsDraft', label: 'Черновик характеристик', type: 'json', validate: validateCharacteristics,
      access: { read: ({ req }) => canEdit(req.user) } },
  ],
  hooks: {
    beforeValidate: [async ({ data, originalDoc, req }) => {
      if (!data) return data;
      const record = { ...originalDoc, ...data };
      const parent = typeof record.parent === 'object' ? record.parent?.id ?? null : record.parent ?? null;
      const slug = record.slug?.trim() || pumpGroupSlug(record.title ?? '');
      const result = await req.payload.find({
        collection: 'pump-selection-groups', req, overrideAccess: false, depth: 0, pagination: false,
        select: { title: true, slug: true, parent: true },
      });
      const groups: PumpSelectionGroupNode[] = result.docs.map(group => ({
        ...group, parent: typeof group.parent === 'object' ? group.parent?.id ?? null : group.parent ?? null,
      }));
      const id = originalDoc?.id ?? -1;
      const previousPath = originalDoc && pumpGroupPath(groups, id);
      const proposed = [...groups.filter(group => group.id !== id), { id, title: record.title, slug, parent }];
      const path = pumpGroupPath(proposed, id);
      const errors = [];
      if (!path || proposed.some(group => !pumpGroupPath(proposed, group.id))) {
        errors.push({ path: 'parent', message: 'Допустимы три уровня папок без циклов.' });
      } else if (previousPath && previousPath.length !== path.length) {
        errors.push({ path: 'parent', message: 'Уровень папки изменить нельзя.' });
      }
      if (groups.some(group => group.id !== id && group.parent === parent && group.slug === slug)) {
        errors.push({ path: 'slug', message: 'Такой адрес уже занят в этой папке.' });
      }
      if (errors.length) throw new ValidationError({ collection: 'pump-selection-groups', req, errors });
      return { ...data, parent, slug };
    }],
    beforeDelete: [async ({ id, req }) => {
      const children = await req.payload.find({
        collection: 'pump-selection-groups', req, overrideAccess: false, depth: 0, limit: 1,
        where: { parent: { equals: id } }, select: { title: true },
      });
      const records = await req.payload.find({
        collection: 'pump-selection-records', req, overrideAccess: false, draft: false, depth: 0, limit: 1,
        where: { group: { equals: id } }, select: { title: true },
      });
      const versions = await req.payload.findVersions({
        collection: 'pump-selection-records', req, overrideAccess: false, depth: 0, limit: 1,
        where: { 'version.group': { equals: id } },
      });
      if (children.docs.length || records.docs.length || versions.docs.length) {
        throw new APIError('Папка содержит насосы, версии или вложенные папки.', 400);
      }
    }],
  },
};
