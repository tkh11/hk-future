import { ValidationError, type CollectionConfig } from 'payload';
import { canEdit, captureDraftOperation, editors, guardPublication, publishers } from './access';
import { curvePoints } from './pump-curve';
import { pumpSelectionField, pumpSelectionProjection } from './pump-selection-fields';
import { pumpGroupPath } from './pump-selection-groups';
import { motorVoltageRange } from './pump-selection-values';
import { pumpCharacteristicErrors, pumpSharedOverrideKeysSchema, resolvePumpCharacteristics } from './pump-shared-characteristics';
import { preparePumpCurve } from '../lib/pump-selection';
import { storedPumpSystemTypes } from '../lib/pump-system-types';

export const pumpSelectionRecords: CollectionConfig = {
  slug: 'pump-selection-records',
  labels: { singular: 'Насос для подбора', plural: 'Насосы для подбора' },
  lockDocuments: { duration: 300 },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
  access: {
    read: ({ req }) => canEdit(req.user) || (req.context.pumpSelectionProjection === pumpSelectionProjection
      && { _status: { equals: 'published' } }),
    readVersions: editors, create: publishers, update: editors, delete: publishers,
  },
  fields: [
    { name: 'sku', label: 'Артикул', type: 'text', required: true, unique: true, maxLength: 100 },
    { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 200 },
    { name: 'group', label: 'Исполнение', type: 'relationship', relationTo: 'pump-selection-groups', required: true, index: true },
    { name: 'connectionSize', label: 'DN / G', type: 'text', maxLength: 100 },
    {
      name: 'systemTypes', label: 'Тип системы', type: 'select', hasMany: true,
      options: Object.entries(storedPumpSystemTypes).map(([value, label]) => ({ value, label })),
    },
    pumpSelectionField,
    { name: 'characteristicOverrides', label: 'Значения артикула', type: 'json', admin: { hidden: true },
      validate: value => value == null || pumpSharedOverrideKeysSchema.safeParse(value).success || 'Проверьте значения артикула.' },
    { name: 'specs', label: 'Параметры насоса', type: 'group', fields: [
      { name: 'powerKw', label: 'Номинальная мощность, кВт', type: 'number', min: 0 },
      { name: 'voltageV', label: 'Номинальное напряжение, В', type: 'number', min: 0 },
      ...([
        ['voltageDeltaV', 'Напряжение Δ, В'],
        ['voltageStarV', 'Напряжение Y, В'],
      ] as const).map(([name, label]) => ({
        name, label, type: 'text' as const, maxLength: 32,
        validate: (value: unknown) => motorVoltageRange.safeParse(value).success || 'Введите напряжение или диапазон в вольтах.',
      })),
      { name: 'phases', label: 'Количество фаз', type: 'number', min: 0 },
      { name: 'netWeightKg', label: 'Вес нетто, кг', type: 'number', min: 0 },
    ] },
    { name: 'curve', label: 'Характеристика Q–H', type: 'group', fields: [
      { name: 'speedRpm', label: 'Частота вращения, об/мин', type: 'number', min: 1 },
      { name: 'frequencyHz', label: 'Частота питания, Гц', type: 'number', min: 1 },
      { name: 'nominalCurrentA', label: 'Номинальный ток, А', type: 'number', min: 0 },
      { name: 'hydraulicsOnly', label: 'Только гидравлика', type: 'checkbox' },
      { name: 'points', label: 'Точки Q–H', type: 'array', maxRows: 200, fields: [
        { name: 'flow', label: 'Расход, м³/ч', type: 'number', required: true, min: 0 },
        { name: 'head', label: 'Напор, м', type: 'number', required: true, min: 0 },
      ] },
      { name: 'sourceDocument', label: 'Каталог', type: 'relationship', relationTo: 'catalog-documents' },
      { name: 'sourcePage', label: 'Страница PDF', type: 'number', min: 1 },
      { name: 'workbook', label: 'Источник числовых данных', type: 'group', fields: [
        { name: 'filename', label: 'Имя книги Excel', type: 'text' },
        { name: 'sheet', label: 'Лист', type: 'text' },
        { name: 'sha256', label: 'SHA-256 исходного файла', type: 'text' },
      ] },
    ] },
  ],
  hooks: {
    beforeOperation: [captureDraftOperation],
    beforeChange: [guardPublication],
    beforeValidate: [async ({ data, originalDoc, req }) => {
      if (!data || (data._status ?? originalDoc?._status) !== 'published') return data;
      const record = { ...originalDoc, ...data };
      const groups = await req.payload.find({
        collection: 'pump-selection-groups', req, overrideAccess: false, depth: 0, pagination: false,
        select: { title: true, slug: true, parent: true, sharedCharacteristics: true },
      });
      const groupId = typeof record.group === 'object' ? record.group?.id : record.group;
      const path = pumpGroupPath(groups.docs.map(group => ({
        ...group, parent: typeof group.parent === 'object' ? group.parent?.id ?? null : group.parent ?? null,
      })), groupId);
      const { record: effective } = resolvePumpCharacteristics({
        ...record,
        curve: { ...originalDoc?.curve, ...data.curve },
        pumpSelection: { ...originalDoc?.pumpSelection, ...data.pumpSelection },
      }, path ?? []);
      const { curve, pumpSelection: report } = effective;
      const points = curvePoints.safeParse(curve.points);
      const errors = pumpCharacteristicErrors(effective);
      if (path?.length !== 3) errors.push({ path: 'group', message: 'Выберите папку исполнения.' });
      if (!points.success || !preparePumpCurve({
        flowMinM3h: report.flowMinM3h ?? null, flowMaxM3h: report.flowMaxM3h ?? null, points: points.data,
      })) errors.push({ path: 'pumpSelection.flowMinM3h', message: 'Укажите рабочий диапазон расхода, пересекающийся с кривой Q–H.' });
      if (errors.length) throw new ValidationError({ collection: 'pump-selection-records', req, errors });
      return data;
    }],
  },
};
