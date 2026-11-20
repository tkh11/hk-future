import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectPublicPumps, type OperatingResult } from '@/cms/public-pump-selection';
import { defaultPumpFluid } from '@/lib/pump-fluid';
import { toM3h } from '@/lib/flow-units';
import { readPumpDecimal } from '@/lib/pump-input';
import { systemHeadAt } from '@/lib/pump-operating-point';
import CMSAwarePage from '@/app/(frontend)/selection/pumps/page';
import OperatingModeFields from '@/app/(frontend)/selection/pumps/OperatingModeFields';
import PumpResultsTable from '@/app/(frontend)/selection/pumps/PumpResultsTable';

vi.mock('@/content/cms-adapter', () => ({ getCMSPageMetadata: vi.fn() }));
vi.mock('@/components/cms/CMSPageOverride', () => ({ default: vi.fn() }));
vi.mock('@/cms/env', () => ({ cmsEnabled: () => true }));
vi.mock('@/cms/public-pump-selection', () => ({ selectPublicPumps: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn() }));

const pump = (sku: string, efficiency: number | null, powerKw: number | null, connectionSize: string | null): OperatingResult => ({
  sku, name: sku, rowId: 'hip-32', headMarginM: 1, points: [{ x: 5, y: 16 }], coincident: false, meetsDuty: true,
  optimal: false, efficiency, powerKw, connectionSize, speedRpm: 2900, voltageV: 380,
  voltageDeltaV: null, voltageStarV: null, phases: 3, frequencyHz: 50,
});
const query = { mode: 'quick', flow: '4,5', head: '13', staticHead: '2', system: 'heating' };

async function selectionPage(search: Record<string, string>) {
  const page = CMSAwarePage({ params: Promise.resolve({}), searchParams: Promise.resolve(search) });
  const tool = page.props.afterContent.props.children;
  return tool.type(tool.props);
}

describe('pump selection request', () => {
  beforeEach(() => {
    vi.mocked(selectPublicPumps).mockReset().mockResolvedValue({
      hasData: true, operating: [], recommended: undefined, chart: undefined, specification: null, fluid: defaultPumpFluid,
    });
    vi.mocked(headers).mockResolvedValue(new Headers({ 'sec-fetch-mode': 'cors' }));
  });

  it('opens with empty fields and no results', async () => {
    render(await selectionPage({}));

    expect(screen.getByLabelText('Расчётный напор, м')).toHaveValue('');
    expect(screen.getByLabelText('Статический напор, м')).toHaveValue('');
    expect(screen.getByLabelText('Расход, м³/ч')).toHaveValue('');
    expect(screen.getByLabelText('Тип системы')).toHaveValue('');
    expect(screen.getByLabelText('Перекачиваемая среда')).toHaveValue('water');
    expect(screen.getByLabelText('Температура, °C')).toHaveValue('20');
    expect(screen.queryByRole('heading', { name: 'Результаты подбора' })).toBeNull();
    expect(selectPublicPumps).not.toHaveBeenCalled();
  });

  it.each([
    ['sec-fetch-mode', 'navigate'],
    ['accept', 'text/html'],
  ])('clears a previous selection on a document load with %s', async (name, value) => {
    vi.mocked(headers).mockResolvedValue(new Headers([[name, value]]));

    await expect(selectionPage({ ...query, curve: '77015401' })).rejects.toThrow('NEXT_REDIRECT');
    expect(selectPublicPumps).not.toHaveBeenCalled();
  });

  it('uses the entered total head for selection and the design point, with static head included in the system curve', async () => {
    render(await selectionPage({ ...query, flow: '5' }));

    expect(selectPublicPumps).toHaveBeenCalledWith(
      { flowM3h: 5, requiredHeadM: 13, system: 'heating' },
      { systemCurve: { staticHeadM: 2, coefficient: expect.closeTo(0.44, 12) }, chartSku: '', fluid: defaultPumpFluid },
    );
    const { systemCurve } = vi.mocked(selectPublicPumps).mock.calls[0][1];
    expect(systemHeadAt(systemCurve, 0)).toBe(2);
    expect(systemHeadAt(systemCurve, 5)).toBeCloseTo(13, 12);
    const point = screen.getByRole('region', { name: 'Расчетная точка' });
    expect(within(point).getByText('13')).toBeVisible();
    expect(within(point).queryByText('15')).toBeNull();
  });

  it.each(['-1', '14', 'abc'])('rejects invalid static head %s before selection', async staticHead => {
    render(await selectionPage({ ...query, staticHead }));
    expect(screen.getByLabelText('Статический напор, м')).toHaveAttribute('aria-invalid', 'true');
    expect(selectPublicPumps).not.toHaveBeenCalled();
  });

  it.each([['m3h', '3,6', 'м³/ч'], ['ls', '1', 'л/с'], ['lmin', '60', 'л/мин']])(
    'submits equivalent flow in %s and displays the chosen unit', async (flowUnit, flow, label) => {
      render(await selectionPage({ ...query, flowUnit, flow }));
      expect(selectPublicPumps).toHaveBeenCalledWith(
        { flowM3h: expect.closeTo(3.6, 12), requiredHeadM: 13, system: 'heating' },
        expect.objectContaining({ chartSku: '' }),
      );
      expect(screen.getByLabelText(`Расход, ${label}`)).toHaveValue(flow);
      expect(within(screen.getByRole('region', { name: 'Расчетная точка' })).getByText(`Расход, ${label}`)).toBeVisible();
    },
  );

  it.each([['', 0, 0.52], ['13', 13, 0]])('accepts static head %s within the total head', async (staticHead, expectedStatic, coefficient) => {
    render(await selectionPage({ ...query, flow: '5', staticHead }));
    expect(selectPublicPumps).toHaveBeenCalledWith(
      { flowM3h: 5, requiredHeadM: 13, system: 'heating' },
      { systemCurve: { staticHeadM: expectedStatic, coefficient }, chartSku: '', fluid: defaultPumpFluid },
    );
  });

  it('restores form values, mode and results when navigating to an earlier request', async () => {
    const user = userEvent.setup();
    const earlier = { ...query, flow: '5' };
    const { rerender } = render(await selectionPage(earlier));
    await user.clear(screen.getByLabelText('Расчётный напор, м'));
    await user.type(screen.getByLabelText('Расчётный напор, м'), '14');
    await user.clear(screen.getByLabelText('Статический напор, м'));
    await user.type(screen.getByLabelText('Статический напор, м'), '0');
    rerender(await selectionPage({ ...earlier, head: '14', staticHead: '0' }));
    await user.selectOptions(screen.getByLabelText('Режим подбора'), 'advanced');

    rerender(await selectionPage(earlier));
    expect(screen.getByLabelText('Расчётный напор, м')).toHaveValue('13');
    expect(screen.getByLabelText('Статический напор, м')).toHaveValue('2');
    expect(screen.getByLabelText('Режим подбора')).toHaveValue('quick');
    expect(within(screen.getByRole('region', { name: 'Расчетная точка' })).getByText('13')).toBeVisible();
  });

  it('shows mass concentration for glycol and passes the resolved fluid to selection', async () => {
    const user = userEvent.setup();
    const { rerender } = render(await selectionPage({}));
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Подбор насосов' });
    expect(new FormData(form).get('concentration')).toBeNull();
    await user.selectOptions(screen.getByLabelText('Перекачиваемая среда'), 'propyleneGlycol');
    await user.type(screen.getByLabelText('Концентрация, % масс.'), '35,5');
    expect(new FormData(form).get('concentration')).toBe('35,5');

    rerender(await selectionPage({ ...query, fluid: 'propyleneGlycol', temperature: '-5', concentration: '35,5' }));
    expect(screen.getByLabelText('Температура, °C')).toHaveValue('-5');
    expect(screen.getByLabelText('Концентрация, % масс.')).toBeVisible();
    expect(selectPublicPumps).toHaveBeenLastCalledWith(
      expect.objectContaining({ requiredHeadM: 13 }),
      expect.objectContaining({ fluid: expect.objectContaining({
        kind: 'propyleneGlycol', temperatureC: -5, concentrationPct: 35.5,
      }) }),
    );
  });

  it('rejects a submitted glycol mixture without concentration', async () => {
    render(await selectionPage({ ...query, fluid: 'ethyleneGlycol', temperature: '20' }));
    expect(screen.getByLabelText('Концентрация, % масс.')).toHaveAttribute('aria-invalid', 'true');
    expect(selectPublicPumps).not.toHaveBeenCalled();
  });

  it('accepts custom fluid properties with decimal commas and optional sheet conditions', async () => {
    const user = userEvent.setup();
    const { rerender } = render(await selectionPage({}));
    await user.selectOptions(screen.getByLabelText('Перекачиваемая среда'), 'custom');
    await user.type(screen.getByLabelText('Название жидкости'), 'Масло');
    await user.type(screen.getByLabelText('Кинематическая вязкость, мм²/с'), '32,5');
    await user.type(screen.getByLabelText('Плотность, кг/м³'), '890');
    const form = screen.getByRole<HTMLFormElement>('form', { name: 'Подбор насосов' });
    const fields = Object.fromEntries(new FormData(form)) as Record<string, string>;
    expect(fields).toMatchObject({ temperature: '', concentration: '', density: '890', viscosity: '32,5' });
    rerender(await selectionPage({ ...fields, ...query }));
    expect(selectPublicPumps).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ fluid: {
      kind: 'custom', name: 'Масло', densityKgM3: 890, kinematicViscosityMm2S: 32.5, temperatureC: null, concentrationPct: null,
    } }));
    expect(screen.getByLabelText('Название жидкости')).toHaveValue('Масло');
    vi.mocked(selectPublicPumps).mockClear();
    rerender(await selectionPage({ ...fields, ...query, density: '0' }));
    expect(screen.getByLabelText('Плотность, кг/м³')).toHaveAttribute('aria-invalid', 'true');
    expect(selectPublicPumps).not.toHaveBeenCalled();
  });

  it('keeps enough digits for the selection limits when changing the flow unit', async () => {
    const user = userEvent.setup();
    render(await selectionPage({ ...query, flow: '68' }));
    const units = screen.getByLabelText('Единицы расхода');
    await user.selectOptions(units, 'ls');
    const field = screen.getByLabelText<HTMLInputElement>('Расход, л/с');
    const flow = readPumpDecimal(field.value);
    expect(flow).not.toBeNull();
    expect(Math.abs(toM3h(flow!, 'ls') - 68)).toBeLessThan(32 * Number.EPSILON * 68);
    await user.clear(field);
    await user.type(field, '0,0000001');
    await user.selectOptions(units, 'lmin');
    expect(readPumpDecimal(field.value)).toBe(0.000006);
  });
});

describe('pump selection modes', () => {
  it('keeps quick values while showing an empty advanced block and hides previous results', async () => {
    const user = userEvent.setup();
    render(<OperatingModeFields initialMode="quick" quickForm={
      <form id="pump-selection-form" aria-label="Подбор насосов">
        <label>Расчётный напор, м<input name="head" defaultValue="13" /></label>
        <button type="submit">Подобрать насосы</button>
      </form>
    }><section aria-label="Результаты подбора">HIP 32-14/2</section></OperatingModeFields>);

    await user.type(screen.getByRole('textbox'), ',5');
    await user.selectOptions(screen.getByLabelText('Режим подбора'), 'advanced');
    expect(screen.queryByRole('button', { name: 'Подобрать насосы' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Результаты подбора' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Расширенный подбор' })).toBeEmptyDOMElement();
    expect(screen.getByLabelText('Расчётный напор, м')).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Режим подбора'), 'quick');
    expect(screen.getByRole('textbox')).toHaveValue('13,5');
    expect(screen.getByRole('region', { name: 'Результаты подбора' })).toBeVisible();
    const form = screen.getByRole('form', { name: 'Подбор насосов' }) as HTMLFormElement;
    expect(new FormData(form).get('mode')).toBe('quick');
  });

  it('starts advanced mode with no visible quick controls', () => {
    render(<OperatingModeFields initialMode="advanced" quickForm={
      <form id="pump-selection-form"><input aria-label="Напор" /><button>Подобрать насосы</button></form>
    }>{null}</OperatingModeFields>);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('region', { name: 'Расширенный подбор' })).toBeEmptyDOMElement();
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['Быстрый подбор', 'Расширенный подбор']);
  });
});

describe('pump result sorting', () => {
  it('shows single voltage and labels the delta/star ranges', () => {
    const ordinary = pump('ORDINARY', null, 0.75, 'DN 32');
    const dual = { ...pump('DUAL', 55, 1.1, 'DN 40'), voltageDeltaV: '380-420', voltageStarV: '660-720' };
    render(<PumpResultsTable pumps={[ordinary, dual]} query={query} />);
    expect(screen.getByText('3 × 380 В, 50 Гц')).toBeVisible();
    const supply = within(screen.getByRole('row', { name: /DUAL/ })).getAllByRole('cell').at(-1);
    expect(supply).toHaveTextContent('3 × 380-420Δ/660-720Y В, 50 Гц');
    expect(within(supply!).getByTitle('Треугольник').closest('ruby')).toHaveTextContent('380-420Δ');
    expect(within(supply!).getByTitle('Звезда').closest('ruby')).toHaveTextContent('660-720Y');
  });

  it('sorts the shortlist without changing the chosen curve and keeps unknown values last', async () => {
    const user = userEvent.setup();
    const pumps = [pump('NEAREST', null, 0.75, 'DN 32'), pump('SECOND', 55, 1.1, 'DN 40'), pump('OTHER', 70, null, null)];
    const fluidQuery = { ...query, fluid: 'propyleneGlycol', temperature: '-5', concentration: '35,5' };
    render(<PumpResultsTable pumps={pumps} query={fluidQuery} selectedSku="SECOND" />);
    const order = () => screen.getAllByRole('row').slice(1).map(row => within(row).getByRole('link').getAttribute('aria-label'));
    expect(order()).toEqual(['График NEAREST', 'График SECOND', 'График OTHER']);

    await user.click(screen.getByRole('button', { name: 'КПД, %' }));
    expect(order()).toEqual(['График OTHER', 'График SECOND', 'График NEAREST']);
    expect(screen.getByRole('columnheader', { name: 'КПД, %' })).toHaveAttribute('aria-sort', 'descending');
    await user.click(screen.getByRole('button', { name: 'КПД, %' }));
    expect(order()).toEqual(['График SECOND', 'График OTHER', 'График NEAREST']);
    expect(screen.getByRole('columnheader', { name: 'КПД, %' })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: 'Ном. мощность двигателя, кВт' }));
    expect(order()).toEqual(['График NEAREST', 'График SECOND', 'График OTHER']);
    await user.click(screen.getByRole('button', { name: 'Ном. мощность двигателя, кВт' }));
    expect(order()).toEqual(['График SECOND', 'График NEAREST', 'График OTHER']);
    expect(pumps.map(item => item.sku)).toEqual(['NEAREST', 'SECOND', 'OTHER']);
    const selected = screen.getByRole('link', { name: 'График SECOND' });
    expect(selected).toHaveAttribute('aria-current', 'location');
    const url = new URL(selected.getAttribute('href')!, 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({ ...fluidQuery, curve: 'SECOND' });
  });

  it('sorts all pumps together and keeps every optimal label', async () => {
    const user = userEvent.setup();
    const pumps = [
      { ...pump('HIGH-POWER', 75, 3, 'DN 40'), optimal: true },
      { ...pump('LOW-POWER', 70, 2, 'DN 32'), optimal: true },
      pump('ORDINARY', 80, 2.5, 'DN 32'),
    ];
    render(<PumpResultsTable pumps={pumps} query={query} />);
    const rows = () => screen.getAllByRole('row').slice(1);
    expect(rows().map(row => !!within(row).queryByText('Оптимальный'))).toEqual([true, true, false]);

    const order = () => rows().map(row => [
      within(row).getByRole('link').getAttribute('aria-label'),
      !!within(row).queryByText('Оптимальный'),
    ]);
    const power = screen.getByRole('button', { name: 'Ном. мощность двигателя, кВт' });
    await user.click(power);
    expect(order()).toEqual([['График LOW-POWER', true], ['График ORDINARY', false], ['График HIGH-POWER', true]]);
    await user.click(power);
    expect(order()).toEqual([['График HIGH-POWER', true], ['График ORDINARY', false], ['График LOW-POWER', true]]);
  });
});
