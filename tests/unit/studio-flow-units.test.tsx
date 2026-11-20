import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fromPumpSelection } from '@/cms/pump-selection-data';
import type { PumpSelectionValues } from '@/cms/pump-selection-values';
import type { PumpSelectionEditorData } from '@/studio/pump-selection-data';
import PumpSelectionEditor from '@/studio/components/PumpSelectionEditor';

const { updateDraft, saveDraft, publish } = vi.hoisted(() => ({
  updateDraft: vi.fn(), saveDraft: vi.fn(), publish: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/studio/pump-selection-actions', () => ({
  savePumpSelection: saveDraft, changePumpSelectionPublication: publish,
}));
vi.mock('@/studio/components/MediaPicker', () => ({ default: () => null }));
vi.mock('@/studio/components/editor/parts', () => ({ SaveError: () => null, SaveStatus: () => null, Toc: () => null }));
vi.mock('@/studio/components/editor/useDraft', () => ({
  useDraft: ({ initial }: { initial: PumpSelectionValues }) => {
    const [values, setValues] = useState(initial);
    return {
      values,
      update: (patch: Partial<PumpSelectionValues>) => {
        updateDraft(patch);
        setValues(value => ({ ...value, ...patch }));
      },
      flush: vi.fn(), status: { kind: 'idle', savedAt: null }, readOnly: false, holder: null,
    };
  },
}));

function data(): PumpSelectionEditorData {
  return {
    id: 1, updatedAt: '2026-11-16T00:00:00.000Z', holder: null, media: [],
    href: '/studio/pump-selection/hip/hip-32/ssvf/1', published: false, hasDraft: false,
    curveSource: { workbook: null }, groups: [{ id: 3, title: 'HIP / HIP 32 / SSVF' }], sharedGroups: [],
    values: {
      sku: 'TEST', title: 'HIP TEST', group: 3, connectionSize: 'DN 32', systemTypes: ['heating'],
      curve: { speedRpm: 2900, frequencyHz: 50, nominalCurrentA: 1,
        points: [{ flow: 0, head: 12 }, { flow: 3.6, head: 10 }, { flow: 7.2, head: 6 }] },
      specs: { powerKw: 1, voltageV: 380, phases: 3, netWeightKg: null },
      pumpSelection: fromPumpSelection({
        modelName: 'HIP TEST', flowMinM3h: 1.8, flowMaxM3h: 7.2,
        performancePoints: [
          { flow: 3.6, efficiency: 50, npsh: 1, powerP2: null },
          { flow: 7.2, efficiency: 60, npsh: 2, powerP2: null },
        ],
      }),
    },
  };
}

function editor() {
  return render(<PumpSelectionEditor data={data()} canPublish breadcrumbs={null} />);
}

beforeEach(() => vi.clearAllMocks());

describe('Studio flow units', () => {
  it('converts working bounds, both point tables and all graphs without altering the draft', async () => {
    const user = userEvent.setup();
    editor();
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'ls');
    expect(screen.getByLabelText('Расход от, л/с')).toHaveValue(0.5);
    expect(screen.getByLabelText('Расход до, л/с')).toHaveValue(2);
    expect(screen.getByLabelText('Расход, точка 2')).toHaveValue('1');
    expect(screen.getByLabelText('flow, строка 2')).toHaveValue('2');
    expect(screen.getByLabelText('NPSHr, м, строка 2')).toHaveValue('2');
    for (const chart of screen.getAllByRole('img')) expect(within(chart).getByText('Q, л/с')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'lmin');
    expect(screen.getByLabelText('Расход от, л/мин')).toHaveValue(30);
    expect(screen.getByLabelText('Расход, точка 2')).toHaveValue('60');
    expect(screen.getByLabelText('flow, строка 2')).toHaveValue('120');
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'm3h');
    expect(screen.getByLabelText('Расход, точка 2')).toHaveValue('3,6');
    expect(updateDraft).not.toHaveBeenCalled();
  });

  it('keeps unapplied Q–H edits across unit changes and applies canonical flow', async () => {
    const user = userEvent.setup();
    editor();
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'ls');
    const flow = screen.getByLabelText('Расход, точка 2');
    await user.clear(flow);
    await user.type(flow, '1,5');
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'lmin');
    expect(flow).toHaveValue('90');
    await user.click(screen.getByRole('button', { name: 'Применить точки Q–H' }));
    expect(updateDraft).toHaveBeenLastCalledWith({ curve: expect.objectContaining({
      points: [{ flow: 0, head: 12 }, { flow: 5.4, head: 10 }, { flow: 7.2, head: 6 }],
    }) });
  });

  it('interprets pasted Q–H values using the selected unit', async () => {
    const user = userEvent.setup();
    editor();
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'lmin');
    fireEvent.paste(screen.getByLabelText('Расход, точка 2'), {
      clipboardData: { getData: () => '30\t11\n90\t8' },
    });
    await user.click(screen.getByRole('button', { name: 'Применить точки Q–H' }));
    const points = updateDraft.mock.lastCall?.[0].curve.points;
    expect(points).toEqual([{ flow: 0, head: 12 }, { flow: expect.closeTo(1.8, 12), head: 11 }, { flow: expect.closeTo(5.4, 12), head: 8 }]);
  });

  it('saves bounds and performance flow in m³/h while keeping empty flow invalid', async () => {
    const user = userEvent.setup();
    editor();
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'ls');
    fireEvent.change(screen.getByLabelText('Расход от, л/с'), { target: { value: '0.25' } });
    expect(updateDraft.mock.lastCall?.[0].pumpSelection.flowMinM3h).toBe(0.9);
    const performanceFlow = screen.getByLabelText('flow, строка 1');
    await user.clear(performanceFlow);
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'lmin');
    expect(performanceFlow).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Применить таблицу' })).toBeDisabled();
    await user.type(performanceFlow, '90');
    await user.selectOptions(screen.getByLabelText('Единицы расхода'), 'ls');
    expect(performanceFlow).toHaveValue('1,5');
    await user.click(screen.getByRole('button', { name: 'Применить таблицу' }));
    expect(updateDraft.mock.lastCall?.[0].pumpSelection.performancePoints[0]).toMatchObject({
      flow: expect.closeTo(5.4, 12), efficiency: 50, npsh: 1, powerP2: null,
    });
  });

  it('draws a gap in preview power when the efficiency table contains an interior zero', () => {
    const source = data();
    source.values.pumpSelection.performancePoints.splice(1, 0, { flow: 5.4, efficiency: 0, npsh: null, powerP2: null });
    render(<PumpSelectionEditor data={source} canPublish breadcrumbs={null} />);
    const chart = screen.getByRole('img', { name: 'P2, кВт и NPSHr, м от расхода' });
    const power = within(chart).getByText('P2, кВт').parentElement?.querySelector('path');
    expect(power?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
  });

  it('updates the P2 stroke limit when the motor rating changes', () => {
    editor();
    const chart = screen.getByRole('img', { name: 'P2, кВт и NPSHr, м от расхода' });
    const power = within(chart).getByText('P2, кВт').parentElement!;
    const rating = screen.getByLabelText('Номинальная мощность, кВт');
    expect(power.querySelectorAll(':scope > path')).toHaveLength(1);

    fireEvent.change(rating, { target: { value: '0.2' } });
    const [thin, normal] = power.querySelectorAll<SVGPathElement>(':scope > path');
    expect(thin.style.strokeWidth).toBe('1');
    expect(thin.getAttribute('d')?.match(/M/g)).toHaveLength(1);
    expect(normal.getAttribute('d')?.match(/M/g)).toHaveLength(2);

    fireEvent.change(rating, { target: { value: '' } });
    expect(power.querySelectorAll(':scope > path')).toHaveLength(1);
  });

  it('edits only glycol approvals and applies them after the range is complete', async () => {
    const user = userEvent.setup();
    editor();
    const limits = within(screen.getByRole('region', { name: 'Допустимые среды' }));
    expect(limits.queryByRole('checkbox', { name: 'Вода' })).not.toBeInTheDocument();
    await user.click(limits.getByRole('checkbox', { name: 'Раствор пропиленгликоля' }));
    const apply = limits.getByRole('button', { name: 'Применить допуски' });
    expect(apply).toBeDisabled();
    const glycol = within(limits.getByRole('group', { name: 'Раствор пропиленгликоля' }));
    fireEvent.change(glycol.getByLabelText('Температура от, °C'), { target: { value: '-10' } });
    fireEvent.change(glycol.getByLabelText('Температура до, °C'), { target: { value: '80' } });
    fireEvent.change(glycol.getByLabelText('Концентрация от, % масс.'), { target: { value: '0' } });
    expect(apply).toBeDisabled();
    fireEvent.change(glycol.getByLabelText('Концентрация до, % масс.'), { target: { value: '40' } });
    await user.click(apply);
    expect(updateDraft.mock.lastCall?.[0].pumpSelection.fluidLimits).toEqual([
      { kind: 'propyleneGlycol', temperatureMinC: -10, temperatureMaxC: 80, concentrationMinPct: 0, concentrationMaxPct: 40 },
    ]);
  });
});

function dataWithSharedMaterial() {
  const pump = data();
  pump.sharedGroups = [
    { id: 1, title: 'HIP', slug: 'hip', parent: null, sharedCharacteristics: { wettedMaterial: 'Чугун' } },
    { id: 2, title: 'HIP 32', slug: 'hip-32', parent: 1, sharedCharacteristics: undefined },
    { id: 3, title: 'SSVF', slug: 'ssvf', parent: 2, sharedCharacteristics: undefined },
  ];
  return pump;
}

it('displays inherited material inline and lets an SKU override and restore it', async () => {
  const user = userEvent.setup();
  const pump = dataWithSharedMaterial();
  render(<PumpSelectionEditor data={pump} canPublish breadcrumbs={null} />);
  const material = () => screen.getByRole('textbox', { name: 'Материал корпуса' });
  const inherited = () => screen.getByRole('checkbox', { name: 'Из общих данных · Материал корпуса' });
  expect(material()).toHaveValue('Чугун');
  expect(material()).toHaveAttribute('readonly');
  expect(inherited()).toBeChecked();
  expect(updateDraft).not.toHaveBeenCalled();

  await user.click(inherited());
  expect(inherited()).not.toBeChecked();
  expect(material()).toHaveValue('Чугун');
  expect(material()).not.toHaveAttribute('readonly');
  expect(updateDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    characteristicOverrides: ['wettedMaterial'], pumpSelection: expect.objectContaining({ wettedMaterial: 'Чугун' }),
  }));
  fireEvent.change(material(), { target: { value: 'Нержавеющая сталь' } });
  expect(updateDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    pumpSelection: expect.objectContaining({ wettedMaterial: 'Нержавеющая сталь' }),
  }));

  await user.click(inherited());
  expect(inherited()).toBeChecked();
  expect(material()).toHaveValue('Чугун');
  expect(material()).toHaveAttribute('readonly');
  expect(updateDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    characteristicOverrides: [], pumpSelection: expect.objectContaining({ wettedMaterial: '' }),
  }));
});

it('preserves existing SKU values and offers inheritance only for fields with a common value', async () => {
  const user = userEvent.setup();
  const pump = dataWithSharedMaterial();
  pump.values.pumpSelection.wettedMaterial = 'Бронза';
  pump.values.pumpSelection.shaftMaterial = 'Сталь';
  pump.values.characteristicOverrides = ['shaftMaterial'];
  render(<PumpSelectionEditor data={pump} canPublish breadcrumbs={null} />);

  const body = screen.getByRole('textbox', { name: 'Материал корпуса' });
  const shaft = screen.getByRole('textbox', { name: 'Материал вала' });
  expect(body).toHaveValue('Бронза');
  expect(body).not.toHaveAttribute('readonly');
  expect(shaft).toHaveValue('Сталь');
  expect(shaft).not.toHaveAttribute('readonly');
  expect(screen.queryByRole('checkbox', { name: 'Из общих данных · Материал вала' })).not.toBeInTheDocument();

  const inherited = screen.getByRole('checkbox', { name: 'Из общих данных · Материал корпуса' });
  expect(inherited).not.toBeChecked();
  await user.click(inherited);
  expect(updateDraft).toHaveBeenLastCalledWith({
    characteristicOverrides: ['shaftMaterial'],
    pumpSelection: { ...pump.values.pumpSelection, wettedMaterial: '' },
  });
  expect(screen.getByRole('textbox', { name: 'Материал вала' })).toHaveValue('Сталь');
});
