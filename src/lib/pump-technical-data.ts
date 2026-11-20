import type { PumpChart, PumpSpecification } from '@/cms/public-pump-selection';
import { selectionSections, selectionSpecificationFields } from '@/cms/pump-selection-data';
import { evaluateCurve } from './curve-interpolation';
import { flowUnitLabels, fromM3h, type FlowUnit } from './flow-units';
import { pumpFluidLabels, pumpFluidTemperatureRange, type PumpFluid } from './pump-fluid';
import { pumpEfficiencyPeak, pumpPowerP2At, pumpWorkingRange } from './pump-selection';

type Section = typeof selectionSections[number];
type Row = [label: string, value: string | number | null | undefined];
const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 });
const calculatedFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 });
const motorTypeByPowerKw = new Map([
  [0.75, '80M'], [1.1, '80M'], [1.5, '90S'], [2.2, '90L'], [3, '100L'],
  [4, '112M'], [5.5, '132S'], [7.5, '132S'], [11, '160M'], [15, '160M'],
  [18.5, '160L'], [22, '180M'], [30, '200L'], [37, '200L'], [45, '225M'],
  [55, '250M'], [75, '280S'], [90, '280M'], [110, '315S'], [132, '315M'],
  [160, '315L'], [185, '315L'], [200, '315L'], [220, '355M'], [250, '355M'],
  [280, '355L'], [315, '355L'],
]);
const formattedFields = new Set([
  'temperatureMinC', 'temperatureMaxC', 'flowMinM3h', 'flowMaxM3h', 'headAtMinFlowM', 'headAtMaxFlowM',
  'inletConnection', 'outletConnection',
]);

function measurement(value: Row[1], unit: string, format = numberFormat) {
  if (value == null || value === '') return null;
  return `${typeof value === 'number' ? format.format(value) : value} ${unit}`;
}

function range(min: number | null | undefined, max: number | null | undefined, unit: string, signed = false) {
  const format = (value: number) => `${signed && value > 0 ? '+' : ''}${numberFormat.format(value)}`;
  if (min == null && max == null) return null;
  if (min === max && min != null) return `${format(min)} ${unit}`;
  return [min == null ? '' : `от ${format(min)}`, max == null ? '' : `до ${format(max)}`, unit].filter(Boolean).join(' ');
}

export type PumpTechnicalData = {
  description: string;
  sections: { title: string; rows: [label: string, value: string][] }[];
};

function workingHeadRow(headStart: number | null | undefined, headEnd: number | null | undefined): Row {
  return headStart != null && headEnd != null
    ? ['Напор', range(Math.min(headStart, headEnd), Math.max(headStart, headEnd), 'м')]
    : [headStart != null ? 'Напор при начальном расходе' : 'Напор при конечном расходе', measurement(headStart ?? headEnd, 'м')];
}

export function getPumpTechnicalData(
  chart: PumpChart, specification: PumpSpecification, flowUnit: FlowUnit = 'm3h', sheetFluid?: PumpFluid,
): PumpTechnicalData {
  const data = specification?.pumpSelection;
  const flow = (value: number | null | undefined) => value == null ? value : fromM3h(value, flowUnit);
  const flowLabel = flowUnitLabels[flowUnit];
  const storedRows = (title: Section): Row[] => selectionSpecificationFields
    .filter(field => field.section === title && !formattedFields.has(field.key))
    .map(({ key, label }) => key === 'volumeM3'
      ? ['Объём', measurement(data?.volumeM3, 'м³')] : [label, data?.[key]]);
  const speed: Row = ['Частота вращения', measurement(chart.speedRpm, 'об/мин')];
  const voltage = [chart.voltageDeltaV && `${chart.voltageDeltaV} Δ`, chart.voltageStarV && `${chart.voltageStarV} Y`]
    .filter(Boolean).join('/') || (chart.voltageV == null ? '' : numberFormat.format(chart.voltageV));
  const phases = chart.phases == null ? '' : numberFormat.format(chart.phases);
  const electricalRows: Row[] = [
    ['Частота питания', measurement(chart.frequencyHz, 'Гц')],
    voltage ? ['Номинальное напряжение', `${phases ? `${phases} × ` : ''}${voltage} В`] : ['Количество фаз', chart.phases],
    ['Номинальный ток', measurement(specification?.curve?.nominalCurrentA, 'А')],
  ];
  const netWeight: Row = ['Вес нетто', measurement(specification?.specs?.netWeightKg, 'кг')];
  const ports = /^HBP\b/i.test(chart.name) ? /^DN\s*(\d+)\s*\/\s*(\d+)$/i.exec(chart.connectionSize ?? '') : null;
  const inlet = data?.inletConnection?.trim() || (ports ? `DN ${ports[2]}` : null);
  const outlet = data?.outletConnection?.trim() || (ports ? `DN ${ports[1]}` : null);
  const connections: Row[] = inlet || outlet
    ? [['Вход насоса', inlet], ['Выход насоса', outlet]] : [['Диаметр присоединения', chart.connectionSize]];
  const extraRows: Partial<Record<Section, Row[]>> = {
    'Технические данные': [
      ['Температура', range(data?.temperatureMinC, data?.temperatureMaxC, '°C', true)],
      ['Расход', range(flow(data?.flowMinM3h), flow(data?.flowMaxM3h), flowLabel)],
      workingHeadRow(data?.headAtMinFlowM, data?.headAtMaxFlowM),
    ],
    'Монтаж': connections,
    'Электродвигатель': [
      ['Номинальная мощность', measurement(chart.powerKw, 'кВт')],
      ...electricalRows, speed,
    ],
    'Прочее': [netWeight],
  };

  let sections: { title: string; rows: Row[] }[] = [
    { title: 'Спецификация', rows: [['Наименование', chart.name], ['Артикул', chart.sku]] },
    ...selectionSections.filter(title => title !== 'Описание').map(title => ({
      title,
      rows: [
        ...storedRows(title),
        ...(title === 'Электродвигатель' && !specification ? [] : extraRows[title] ?? []),
      ],
    })),
  ];
  if (sheetFluid) {
    const temperatureRange = chart.fluidTemperatureRange ?? { minC: data?.temperatureMinC, maxC: data?.temperatureMaxC };
    const fluidRange = pumpFluidTemperatureRange(sheetFluid);
    const fluidTemperature = fluidRange && range(
      Math.max(temperatureRange.minC ?? fluidRange.minC, fluidRange.minC),
      Math.min(temperatureRange.maxC ?? fluidRange.maxC, fluidRange.maxC), '°C', true,
    );
    const nominalFlow = pumpEfficiencyPeak(chart.efficiencyCurve)?.x;
    const nominalHead = nominalFlow === undefined ? null : evaluateCurve(chart.curve.segments, nominalFlow);
    const actualPoint = chart.points.length === 1 && !chart.coincident ? chart.points[0] : null;
    const requiredPower = actualPoint ? pumpPowerP2At(
      chart.curve, chart.efficiencyCurve, actualPoint.x, sheetFluid.densityKgM3,
    ) : null;
    const { minFlow, maxFlow } = pumpWorkingRange(chart.curve);
    const flowRange = chart.viscosityCorrected
      ? range(flow(minFlow), flow(maxFlow), flowLabel)
      : range(flow(data?.flowMinM3h), flow(data?.flowMaxM3h), flowLabel);
    const [headLabel, headRange] = chart.viscosityCorrected
      ? workingHeadRow(evaluateCurve(chart.curve.segments, minFlow), evaluateCurve(chart.curve.segments, maxFlow))
      : workingHeadRow(data?.headAtMinFlowM, data?.headAtMaxFlowM);
    const motorType = (chart.powerKw === null ? undefined : motorTypeByPowerKw.get(chart.powerKw)) ?? data?.motorType;
    sections = [
      { title: 'Жидкость', rows: [
        ['Рабочая жидкость', sheetFluid.kind === 'custom' ? sheetFluid.name : pumpFluidLabels[sheetFluid.kind]],
        ['Диапазон температур жидкости', fluidTemperature],
        ['Концентрация', measurement(sheetFluid.concentrationPct, '% масс.')],
        ['Температура жидкости', measurement(sheetFluid.temperatureC, '°C')],
        ['Плотность', measurement(sheetFluid.densityKgM3, 'кг/м³', calculatedFormat)],
        ['Кинематическая вязкость', measurement(sheetFluid.kinematicViscosityMm2S, 'мм²/с', calculatedFormat)],
      ] },
      { title: 'Технические характеристики', rows: [
        speed,
        ['Номинальный расход', measurement(nominalHead === null ? null : flow(nominalFlow), flowLabel, calculatedFormat)],
        ['Номинальный напор', measurement(nominalHead, 'м', calculatedFormat)],
        ['Рабочий диапазон расхода', flowRange],
        [headLabel === 'Напор' ? 'Рабочий диапазон напора' : headLabel, headRange],
        ...storedRows('Конструкция'),
      ] },
      { title: 'Материалы', rows: storedRows('Материалы') },
      { title: 'Монтаж', rows: [...storedRows('Монтаж'), ...connections] },
      { title: 'Данные электрооборудования', rows: specification ? [
        ['Наименование двигателя', data?.motorName],
        ['Код двигателя', data?.motorCode],
        ['Тип двигателя', motorType],
        ['Номинальная мощность двигателя', measurement(chart.powerKw, 'кВт')],
        ['Требуемая мощность P2', measurement(requiredPower, 'кВт', calculatedFormat)],
        ...electricalRows,
        ['Количество полюсов', data?.motorPoles],
        ['Степень защиты', data?.protectionClass],
        ['Класс изоляции', data?.insulationClass],
      ] : [] },
      { title: 'Другое', rows: [netWeight, ...storedRows('Прочее')] },
    ];
  }

  return {
    description: specification?.pumpSelection?.description?.trim() ?? '',
    sections: sections.flatMap(({ title, rows }) => {
      const filled = rows.flatMap(([label, value]): [string, string][] =>
        value == null || (typeof value === 'string' && value.trim() === '')
          ? [] : [[label, typeof value === 'number' ? numberFormat.format(value) : value]]);
      return filled.length ? [{ title, rows: filled }] : [];
    }),
  };
}
