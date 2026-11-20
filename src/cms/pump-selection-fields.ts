import type { Field, FieldAccess } from 'payload';
import { canEdit } from './access';
import { pumpSelectionSchema, fromPumpSelection, selectionTextFields, selectionNumberFields, selectionMediaFields } from './pump-selection-data';
import { pumpFluidLabels, pumpGlycolKinds } from '../lib/pump-fluid';

export const pumpSelectionProjection = Symbol.for('heisskraft.published-pump-selection');

const readPrivate = { read: ({ req }: { req: { user?: Parameters<typeof canEdit>[0] } }) => canEdit(req.user) };

const canReadProjection: FieldAccess = ({ req }) =>
  canEdit(req.user) || req.context.pumpSelectionProjection === pumpSelectionProjection;
const readProjection = { read: canReadProjection };

export const pumpSelectionField = {
  name: 'pumpSelection', label: 'Программа подбора', type: 'group',
  validate: value => {
    try { return pumpSelectionSchema.safeParse(fromPumpSelection(value)).success || 'Проверьте данные программы подбора.'; }
    catch { return 'Проверьте диапазоны, параметры и порядок точек.'; }
  },
  fields: [
    ...selectionTextFields.map((f): Field => f.key === 'description' || f.key === 'sourceNotes'
      ? { name: f.key, label: f.label, type: 'textarea', access: f.key === 'description' ? readProjection : readPrivate }
      : { name: f.key, label: f.label, type: 'text', ...(f.key === 'modelName' ? {} : { access: readProjection }) }),
    ...selectionNumberFields.map((f): Field => ({
      name: f.key, label: f.label, type: 'number', min: f.min,
      ...(f.key === 'flowMinM3h' || f.key === 'flowMaxM3h' ? {} : { access: readProjection }),
    })),
    ...selectionMediaFields.map((f): Field => ({ name: f.key, label: f.label, type: 'upload', relationTo: 'media', access: readPrivate, filterOptions: { mimeType: f.key === 'sourcePdf' ? { equals: 'application/pdf' } : { contains: 'image/' } } })),
    { name: 'fluidLimits', dbName: 'pump_fluid_limits', label: 'Допустимые среды', type: 'array', maxRows: pumpGlycolKinds.length,
      defaultValue: [], access: readProjection, fields: [
        { name: 'kind', label: 'Среда', type: 'select', required: true,
          options: pumpGlycolKinds.map(value => ({ value, label: pumpFluidLabels[value] })) },
        { name: 'temperatureMinC', label: 'Температура от, °C', type: 'number', required: true, min: -273.15 },
        { name: 'temperatureMaxC', label: 'Температура до, °C', type: 'number', required: true, min: -273.15 },
        { name: 'concentrationMinPct', label: 'Концентрация от, % масс.', type: 'number', required: true, min: 0, max: 60 },
        { name: 'concentrationMaxPct', label: 'Концентрация до, % масс.', type: 'number', required: true, min: 0, max: 60 },
      ],
    },
    { name: 'performancePoints', dbName: 'pump_selection_perf', label: 'КПД и NPSHr', type: 'array', maxRows: 200,
      access: readProjection, fields: [
      { name: 'flow', label: 'Расход, м³/ч', type: 'number', required: true, min: 0 },
      { name: 'efficiency', label: 'КПД, %', type: 'number', min: 0, max: 100 },
      { name: 'powerP2', label: 'Мощность P2, кВт', type: 'number', min: 0, admin: { hidden: true } },
      { name: 'npsh', label: 'NPSHr, м', type: 'number', min: 0 },
    ] },
  ],
} satisfies Field;
