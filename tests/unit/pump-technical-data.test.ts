// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { PumpChart, PumpSpecification } from '@/cms/public-pump-selection';
import { getPumpTechnicalData } from '@/lib/pump-technical-data';
import { defaultPumpFluid, resolvePumpFluid, type PumpFluid } from '@/lib/pump-fluid';
import { preparePumpCurve, preparePumpEfficiency } from '@/lib/pump-selection';

const chart: PumpChart = {
  name: 'HIP 32-10/2 SSVF', sku: '77005423', rowId: '32', headMarginM: 1,
  points: [{ x: 6, y: 9 }], coincident: false, meetsDuty: true, optimal: true,
  efficiency: 57, connectionSize: 'DN 32', powerKw: 0.37, speedRpm: 2900,
  voltageV: 380, voltageDeltaV: null, voltageStarV: null, phases: 3, frequencyHz: 50,
  curve: preparePumpCurve({
    flowMinM3h: 4, flowMaxM3h: 9,
    points: [{ flow: 4, head: 10 }, { flow: 9, head: 6 }],
  })!,
  efficiencyCurve: null, npshCurve: null, powerP2Curve: null, viscosityCorrected: false,
};
const specification: NonNullable<PumpSpecification> = {
  id: 1,
  pumpSelection: {
    description: '  Описание насоса\nВторая строка.  ',
    fluid: 'Вода', temperatureMinC: 0, temperatureMaxC: 110,
    impellerType: 'Закрытое', sealMaterial: 'SSVF', volumeM3: 0.077,
  },
  specs: { netWeightKg: 20.5 },
  curve: { nominalCurrentA: 1.2 },
};

describe('shared pump technical data', () => {
  it('keeps zero values, Russian number formatting and description paragraphs', () => {
    const data = getPumpTechnicalData(chart, specification);
    const rows = data.sections.flatMap(section => section.rows);
    expect(data.description).toBe('Описание насоса\nВторая строка.');
    expect(rows).toContainEqual(['Температура', 'от 0 до +110 °C']);
    expect(rows).toContainEqual(['Объём', '0,077 м³']);
    expect(rows).toContainEqual(['Номинальная мощность', '0,37 кВт']);
    expect(rows).toContainEqual(['Вес нетто', '20,5 кг']);
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  it('combines ranges and converts flow units in the shared web and PDF data', () => {
    const data = getPumpTechnicalData(chart, {
      ...specification,
      pumpSelection: { ...specification.pumpSelection, temperatureMinC: -10, temperatureMaxC: 105,
        flowMinM3h: 3.6, flowMaxM3h: 7.2, headAtMinFlowM: 12, headAtMaxFlowM: 4 },
    }, 'ls');
    const rows = data.sections.flatMap(section => section.rows);
    expect(rows).toContainEqual(['Температура', 'от -10 до +105 °C']);
    expect(rows).toContainEqual(['Расход', 'от 1 до 2 л/с']);
    expect(rows).toContainEqual(['Напор', 'от 4 до 12 м']);
    expect(rows).toContainEqual(['Номинальный ток', '1,2 А']);
    expect(rows).toContainEqual(['Номинальное напряжение', '3 × 380 В']);
    expect(rows.some(([label]) => label === 'Количество фаз')).toBe(false);
    expect(rows).toContainEqual(['Частота питания', '50 Гц']);
    expect(rows.filter(([label]) => label.startsWith('Температура'))).toHaveLength(1);
    expect(rows.filter(([label]) => label.startsWith('Расход'))).toHaveLength(1);
  });

  it('keeps one-sided ranges and the meaning of a single measured head', () => {
    const rows = getPumpTechnicalData(chart, {
      id: 1, pumpSelection: { temperatureMaxC: 105, flowMinM3h: 3.6, headAtMinFlowM: 12 },
    }, 'lmin').sections.flatMap(section => section.rows);
    expect(rows).toContainEqual(['Температура', 'до +105 °C']);
    expect(rows).toContainEqual(['Расход', 'от 60 л/мин']);
    expect(rows).toContainEqual(['Напор при начальном расходе', '12 м']);
  });

  it('omits empty rows and sections rather than creating blank characteristics', () => {
    const data = getPumpTechnicalData({ ...chart, connectionSize: null }, {
      id: 1, pumpSelection: { description: '  ', fluid: '', impellerType: '  ', sealMaterial: null },
    });
    expect(data.description).toBe('');
    expect(data.sections.map(section => section.title)).toEqual(['Спецификация', 'Электродвигатель']);
    expect(data.sections.flatMap(section => section.rows).some(([, value]) => value.trim() === '')).toBe(false);
  });

  it('does not supply motor characteristics when the public specification is unavailable', () => {
    const data = getPumpTechnicalData(chart, null);
    expect(data.description).toBe('');
    expect(data.sections).toEqual([
      { title: 'Спецификация', rows: [['Наименование', chart.name], ['Артикул', chart.sku]] },
      { title: 'Монтаж', rows: [['Диаметр присоединения', 'DN 32']] },
    ]);
  });

  it('uses the selected pump identity and its execution-specific characteristics', () => {
    const selected = { ...chart, name: 'HIP 40-14/2', sku: '77005304', connectionSize: 'DN 40' };
    const data = getPumpTechnicalData(selected, {
      ...specification, pumpSelection: { ...specification.pumpSelection, modelName: 'Unselected pump', sealMaterial: 'CSEF' },
    });
    expect(data.sections[0].rows).toEqual([['Наименование', 'HIP 40-14/2'], ['Артикул', '77005304']]);
    expect(data.sections.flatMap(section => section.rows)).toContainEqual(['Материал уплотнения', 'CSEF']);
    expect(JSON.stringify(data)).not.toContain('Unselected pump');
  });

  it('uses Studio mounting values and displays the motor supply on one row on the web and in the PDF', () => {
    const selected = { ...chart, name: 'HBP 50-160/165', connectionSize: 'DN 50/65', voltageDeltaV: '380–420', voltageStarV: '660–720' };
    const withMounting = { ...specification, pumpSelection: {
      ...specification.pumpSelection, maxOperatingPressure: 'PN10', inletConnection: 'DN65/PN16', outletConnection: 'DN50/PN16',
    } };
    for (const fluid of [undefined, defaultPumpFluid]) {
      const { sections } = getPumpTechnicalData(selected, withMounting, 'm3h', fluid);
      expect(sections.find(({ title }) => title === 'Монтаж')?.rows).toEqual([
        ['Максимальное рабочее давление', 'PN10'], ['Вход насоса', 'DN65/PN16'], ['Выход насоса', 'DN50/PN16'],
      ]);
      const rows = sections.flatMap(section => section.rows);
      expect(rows.filter(([label]) => /напряжение|фаз/i.test(label))).toEqual([
        ['Номинальное напряжение', '3 × 380–420 Δ/660–720 Y В'],
      ]);
    }
  });
});

describe('downloadable pump data sheet', () => {
  it('prints the custom fluid name, entered properties and optional reference conditions', () => {
    const sheet = getPumpTechnicalData(chart, specification, 'm3h', {
      kind: 'custom', name: 'Масло И-20А', densityKgM3: 890, kinematicViscosityMm2S: 32.5,
      temperatureC: 40, concentrationPct: 100,
    });
    expect(sheet.sections[0].rows).toEqual([
      ['Рабочая жидкость', 'Масло И-20А'], ['Концентрация', '100 % масс.'], ['Температура жидкости', '40 °C'],
      ['Плотность', '890 кг/м³'], ['Кинематическая вязкость', '32,5 мм²/с'],
    ]);
  });

  it.each([[0.75, '80M'], [4, '112M'], [22, '180M'], [315, '355L'], [0.37, 'MGH'], [null, 'MGH']])(
    'uses the motor type for %s kW and falls back to the saved type', (powerKw, type) => {
      const sheet = getPumpTechnicalData({ ...chart, powerKw }, {
        ...specification, pumpSelection: { ...specification.pumpSelection, motorType: 'MGH' },
      }, 'm3h', defaultPumpFluid);
      expect(sheet.sections.find(({ title }) => title === 'Данные электрооборудования')?.rows)
        .toContainEqual(['Тип двигателя', type]);
    },
  );

  it('orders the sections and uses the selected fluid, nominal duty and actual shaft power', () => {
    const selected: PumpChart = {
      ...chart, name: 'HBP 50-160/165', connectionSize: 'DN 50/65',
      points: [{ x: 9, y: 6 }],
      fluidTemperatureRange: { minC: -10, maxC: 90 },
      curve: preparePumpCurve({ flowMinM3h: 3.6, flowMaxM3h: 10.8, points: [{ flow: 0, head: 12 }, { flow: 18, head: 0 }] })!,
      efficiencyCurve: preparePumpEfficiency([{ flow: 3.6, efficiency: 40 }, { flow: 7.2, efficiency: 60 }, { flow: 9, efficiency: 45 }]),
    };
    const mixture: PumpFluid = {
      kind: 'propyleneGlycol', temperatureC: 7, concentrationPct: 50, densityKgM3: 1049, kinematicViscosityMm2S: 11.9,
    };
    const data = getPumpTechnicalData(selected, specification, 'ls', mixture);
    expect(data.sections.map(section => section.title)).toEqual([
      'Жидкость', 'Технические характеристики', 'Материалы', 'Монтаж', 'Данные электрооборудования', 'Другое',
    ]);
    expect(data.sections[0].rows).toEqual([
      ['Рабочая жидкость', 'Раствор пропиленгликоля'],
      ['Диапазон температур жидкости', 'от -10 до +90 °C'],
      ['Концентрация', '50 % масс.'],
      ['Температура жидкости', '7 °C'],
      ['Плотность', '1 049 кг/м³'],
      ['Кинематическая вязкость', '11,9 мм²/с'],
    ]);
    expect(data.sections[1].rows).toEqual([
      ['Частота вращения', '2 900 об/мин'], ['Номинальный расход', '2 л/с'], ['Номинальный напор', '7,2 м'],
      ['Тип рабочего колеса', 'Закрытое'],
    ]);
    expect(data.sections[3].rows).toEqual([['Вход насоса', 'DN 65'], ['Выход насоса', 'DN 50']]);
    expect(data.sections[4].rows.slice(0, 2)).toEqual([
      ['Номинальная мощность двигателя', '0,37 кВт'], ['Требуемая мощность P2', '0,343 кВт'],
    ]);
  });

  it('omits missing nominal figures and avoids a single P2 for multiple working points', () => {
    const multiplePoints = { ...chart, points: [{ x: 4, y: 10 }, { x: 9, y: 6 }] };
    const data = getPumpTechnicalData(multiplePoints, specification, 'm3h', defaultPumpFluid);
    const labels = data.sections.flatMap(section => section.rows.map(([label]) => label));
    for (const label of ['Концентрация', 'Номинальный расход', 'Номинальный напор', 'Требуемая мощность P2']) {
      expect(labels).not.toContain(label);
    }
    expect(labels).toContain('Номинальная мощность двигателя');
  });

  it('limits the PDF temperature range to liquid temperatures supported for the selected medium', () => {
    const wideApproval = { ...chart, fluidTemperatureRange: { minC: -30, maxC: 125 } };
    const liquidRange = (fluid: PumpFluid) => getPumpTechnicalData(wideApproval, specification, 'm3h', fluid)
      .sections.find(section => section.title === 'Жидкость')?.rows;
    expect(liquidRange(defaultPumpFluid)).toContainEqual(['Диапазон температур жидкости', 'от 0 до +120 °C']);
    const glycol = resolvePumpFluid({ kind: 'propyleneGlycol', temperatureC: 20, concentrationPct: 30 })!;
    expect(liquidRange(glycol)).toContainEqual(['Диапазон температур жидкости', 'от -12,7 до +100 °C']);
  });
});
