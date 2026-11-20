import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PumpChart } from '@/cms/public-pump-selection';
import { preparePumpCurve, preparePumpEfficiency, preparePumpNpsh } from '@/lib/pump-selection';
import { defaultPumpFluid, pumpFluidLabels, type PumpFluid } from '@/lib/pump-fluid';
import { createSystemCurve } from '@/lib/pump-operating-point';
import PumpSelectionResults from '@/app/(frontend)/selection/pumps/PumpSelectionResults';
import FlowRateField from '@/app/(frontend)/selection/pumps/FlowRateField';

const { pdf } = vi.hoisted(() => ({ pdf: vi.fn() }));
vi.mock('@/app/(frontend)/selection/pumps/PumpPdfButton', () => ({ default: ({ data }: { data: unknown }) =>
  <button onClick={() => pdf(data)}>Скачать техлист PDF</button> }));

const duty = { flowM3h: 6, requiredHeadM: 8, system: 'heating' as const };
const system = createSystemCurve(duty, 0)!;
const performance = [{ flow: 0, efficiency: 50, npsh: 1 }, { flow: 10, efficiency: 60, npsh: 2 }];
const chart: PumpChart = {
  sku: 'SELECTED', name: 'HIP выбранный', rowId: 'hip-32', headMarginM: 2, meetsDuty: true,
  points: [{ x: Math.sqrt(45), y: 10 }], coincident: false, optimal: false, efficiency: 55,
  connectionSize: 'DN 32', powerKw: 0.75, speedRpm: 2900, voltageV: 380,
  voltageDeltaV: null, voltageStarV: null, phases: 3, frequencyHz: 50,
  curve: preparePumpCurve({flowMinM3h: 2, flowMaxM3h: 10, points: [{flow:0,head:10},{flow:10,head:10}]})!,
  efficiencyCurve: preparePumpEfficiency(performance), npshCurve: preparePumpNpsh(performance), powerP2Curve:null,
  viscosityCorrected: false,
};
const query = {flow:'6',head:'8',staticHead:'0',system:'heating',mode:'quick',flowUnit:'m3h' as const};
function result(fluid: PumpFluid = defaultPumpFluid, selectionChart = chart) {
  const selected = { ...selectionChart, modelKey: selectionChart.name };
  return render(<PumpSelectionResults results={{hasData:true,chart:selectionChart,operating:[selected],recommended:selected,specification:null,fluid}}
    duty={duty} system={system} flowUnit="m3h" query={query} />);
}

describe('selected pump recalculation', () => {
  it('rebuilds the selected pump in litres per second and exports the updated point and unit', async () => {
    const user=userEvent.setup(); result();
    const design=within(screen.getByRole('region',{name:'Расчетная точка'}));
    const form=within(design.getByRole('form',{name:'Изменить рабочую точку'}));
    expect(within(screen.getByRole('tabpanel',{name:'График'})).queryByRole('form')).toBeNull();
    expect(screen.getAllByRole('form',{name:'Изменить рабочую точку'})).toHaveLength(1);
    await user.selectOptions(form.getByLabelText('Единицы расхода'),'ls');
    await user.clear(form.getByLabelText('Расход, л/с'));
    await user.type(form.getByLabelText('Расход, л/с'),'1,5');
    await user.clear(form.getByLabelText('Расчётный напор, м'));
    await user.type(form.getByLabelText('Расчётный напор, м'),'10');
    await user.clear(form.getByLabelText('Статический напор, м'));
    await user.type(form.getByLabelText('Статический напор, м'),'2');
    await user.click(screen.getByRole('button',{name:'Скачать техлист PDF'}));
    expect(pdf).toHaveBeenLastCalledWith(expect.objectContaining({
      design: expect.arrayContaining([['Расход','6 м³/ч'],['Напор','8 м'],['Статический напор','0 м']]),
    }));
    await user.click(form.getByRole('button',{name:'Перестроить'}));
    expect(design.getByLabelText('Расход, л/с')).toHaveValue('1,5');
    expect(design.getByLabelText('Расчётный напор, м')).toHaveValue('10');
    const actual=within(screen.getByRole('region',{name:'Фактическая рабочая точка'}));
    expect(actual.getByText('1,5')).toBeVisible();
    expect(actual.getByText('NPSHr, м')).toBeVisible();
    expect(screen.getByRole('heading',{name:'Характеристика HIP выбранный'})).toBeVisible();
    expect(screen.getByRole('link',{name:'График HIP выбранный'})).toHaveAttribute('aria-current','location');
    expect(screen.getAllByText('Q, л/с')).toHaveLength(2);
    await user.click(screen.getByRole('button',{name:'Скачать техлист PDF'}));
    expect(pdf).toHaveBeenLastCalledWith(expect.objectContaining({sku:'SELECTED',
      design: expect.arrayContaining([['Расход','1,5 л/с'],['Напор','10 м'],['Статический напор','2 м']]),
      actual: expect.arrayContaining([['Расход фактический','1,5 л/с'],['Напор фактический','10 м'],['NPSHr','1,54 м']]),
    }));
  });

  it('keeps the pump when the new system has no intersection in its working range', async () => {
    const user=userEvent.setup(); result();
    const input=within(screen.getByRole('form',{name:'Изменить рабочую точку'})).getByLabelText('Расчётный напор, м');
    await user.clear(input); await user.type(input,'1');
    await user.click(screen.getByRole('button',{name:'Перестроить'}));
    expect(within(screen.getByRole('region',{name:'Фактическая рабочая точка'})).getByText('Не найдена')).toBeVisible();
    expect(screen.getByRole('heading',{name:'Характеристика HIP выбранный'})).toBeVisible();
    expect(screen.getByRole('link',{name:'График HIP выбранный'})).toHaveAttribute('aria-current','location');
  });

  it('rejects static head above total head and retains the previous result', async () => {
    const user=userEvent.setup(); result();
    const input=within(screen.getByRole('form',{name:'Изменить рабочую точку'})).getByLabelText('Статический напор, м');
    await user.clear(input); await user.type(input,'9');
    await user.click(screen.getByRole('button',{name:'Перестроить'}));
    expect(screen.getByRole('alert')).toHaveTextContent('Статический напор');
    expect(within(screen.getByRole('region',{name:'Расчетная точка'})).getByLabelText('Расчётный напор, м')).toHaveValue('8');
    await user.click(screen.getByRole('button',{name:'Скачать техлист PDF'}));
    expect(pdf).toHaveBeenLastCalledWith(expect.objectContaining({
      design: expect.arrayContaining([['Напор','8 м'],['Статический напор','0 м']]),
    }));
  });

  it('keeps an optimal point above 85% of the maximum flow when motor reserve is sufficient', async () => {
    const user = userEvent.setup();
    result();
    const form = within(screen.getByRole('form', { name: 'Изменить рабочую точку' }));
    await user.clear(form.getByLabelText('Расход, м³/ч'));
    await user.type(form.getByLabelText('Расход, м³/ч'), '8,6');
    await user.clear(form.getByLabelText('Расчётный напор, м'));
    await user.type(form.getByLabelText('Расчётный напор, м'), '10');
    await user.click(form.getByRole('button', { name: 'Перестроить' }));
    expect(screen.getByRole('img', { name: 'Фактическая рабочая точка · 8,6 м³/ч · 10 м' })).toBeInTheDocument();
    expect(screen.getByText('Оптимальный')).toBeVisible();
  });

  it('uses the picked point for the system curve, actual values and PDF, and restores the previous design', async () => {
    const user = userEvent.setup();
    result(defaultPumpFluid, { ...chart, powerKw: 0.52 });
    const picker = screen.getByRole('slider', { name: /на кривой Q–H/ });
    picker.focus();
    await user.keyboard('{End}');
    const actual = screen.getByRole('img', { name: 'Фактическая рабочая точка · 10 м³/ч · 10 м' });
    const position = actual.getAttribute('transform')!.slice('translate('.length, -1);
    const systemPath = picker.closest('svg')!.querySelector('path[d*=" Q"]');
    expect(systemPath?.getAttribute('d')?.split(' ').at(-1)).toBe(position);
    expect(screen.queryByRole('img', { name: /^Расчетная точка/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Расчетная точка' })).not.toBeInTheDocument();
    expect(screen.getByText('Недостаточный запас мощности')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Скачать техлист PDF' }));
    expect(pdf).toHaveBeenLastCalledWith(expect.objectContaining({ design: [],
      actual: expect.arrayContaining([['Расход фактический', '10 м³/ч'], ['КПД', '60 %'], ['NPSHr', '2 м']]),
    }));
    await user.click(screen.getByRole('button', { name: 'Вернуть расчётную точку' }));
    expect(screen.getByRole('img', { name: 'Расчетная точка · 6 м³/ч · 8 м' })).toBeVisible();
    expect(screen.queryByText('Недостаточный запас мощности')).toBeNull();
  });

  it('preserves static head when selecting a point and rejects points below it or at zero flow', async () => {
    const user = userEvent.setup();
    const curve = preparePumpCurve({ flowMinM3h: 2, flowMaxM3h: 10, points: [{ flow: 0, head: 16 }, { flow: 10, head: 3 }] })!;
    result(defaultPumpFluid, { ...chart, curve });
    const staticInput = screen.getByLabelText('Статический напор, м');
    await user.clear(staticInput);
    await user.type(staticInput, '6');
    await user.click(screen.getByRole('button', { name: 'Перестроить' }));
    screen.getByRole('slider', { name: /на кривой Q–H/ }).focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('alert')).toHaveTextContent('ниже статического');
    await user.keyboard('{Home}');
    expect(screen.getByRole('alert')).toHaveTextContent('больше нуля');
    expect(screen.getByRole('img', { name: /^Расчетная точка/ })).toBeVisible();
    await user.keyboard('{ArrowLeft}');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('img', { name: /^Расчетная точка/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Скачать техлист PDF' }));
    expect(pdf).toHaveBeenLastCalledWith(expect.objectContaining({ design: [],
      actual: expect.arrayContaining([['Статический напор', '6 м']]),
    }));
  });

  it('uses the selected fluid density and shows motor overload in the rebuilt result and PDF', async () => {
    const user = userEvent.setup();
    result({
      kind: 'propyleneGlycol', temperatureC: 15, concentrationPct: 30, densityKgM3: 1030, kinematicViscosityMm2S: 4,
    }, { ...chart, powerKw: 0.38, viscosityCorrected: true });
    const form = within(screen.getByRole('form', { name: 'Изменить рабочую точку' }));
    await user.clear(form.getByLabelText('Расход, м³/ч'));
    await user.type(form.getByLabelText('Расход, м³/ч'), '8');
    await user.clear(form.getByLabelText('Расчётный напор, м'));
    await user.type(form.getByLabelText('Расчётный напор, м'), '10');
    await user.click(form.getByRole('button', { name: 'Перестроить' }));
    const actual = within(screen.getByRole('region', { name: 'Фактическая рабочая точка' }));
    expect(actual.getByText('Перегрузка')).toBeVisible();
    expect(actual.getByText('0,387')).toBeVisible();
    expect(within(actual.getByText('NPSHr (вода), м').parentElement!).getByText('1,8')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'NPSHr (вода)' })).toBeChecked();
    expect(screen.getByRole('img', { name: 'NPSHr (вода) · 1,8 м' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Мощность P2 · 0,387 кВт' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Скачать техлист PDF' }));
    expect(pdf).toHaveBeenLastCalledWith(expect.objectContaining({
      technical: expect.objectContaining({ sections: expect.arrayContaining([
        { title: 'Жидкость', rows: [
          ['Рабочая жидкость', pumpFluidLabels.propyleneGlycol],
          ['Диапазон температур жидкости', 'от -12,7 до +100 °C'],
          ['Концентрация', '30 % масс.'], ['Температура жидкости', '15 °C'],
          ['Плотность', '1 030 кг/м³'], ['Кинематическая вязкость', '4 мм²/с'],
        ] },
      ]) }),
      actual: expect.arrayContaining([
        ['Мощность P2', '0,387 кВт'], ['Проверка двигателя', 'Перегрузка'], ['NPSHr (вода)', '1,8 м'],
      ]),
    }));
  });
});

describe('flow input units', () => {
  it('converts existing input reversibly and preserves an empty input', async () => {
    const user=userEvent.setup();
    render(<FlowRateField id="flow" defaultValue="6" defaultUnit="m3h" />);
    const unit=screen.getByLabelText('Единицы расхода');
    await user.selectOptions(unit,'lmin');
    expect(screen.getByLabelText('Расход, л/мин')).toHaveValue('100');
    await user.selectOptions(unit,'ls');
    await user.selectOptions(unit,'m3h');
    expect(screen.getByLabelText('Расход, м³/ч')).toHaveValue('6');
    await user.clear(screen.getByLabelText('Расход, м³/ч'));
    await user.selectOptions(unit,'ls');
    expect(screen.getByLabelText('Расход, л/с')).toHaveValue('');
  });
});
