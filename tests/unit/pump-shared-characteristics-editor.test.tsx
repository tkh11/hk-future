import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import PumpSharedCharacteristicsEditor from '@/studio/components/PumpSharedCharacteristicsEditor';

const { save, refresh } = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/studio/pump-selection-actions', () => ({ savePumpSharedCharacteristics: save }));

it('shows configured and inherited folder fields and saves only populated values', async () => {
  const user = userEvent.setup();
  const series = { id: 1, title: 'HIP', sharedCharacteristics: { wettedMaterial: 'Чугун', connectionSize: 'DN 32' } };
  const group = {
    id: 2,
    title: 'HIP 32',
    updatedAt: '2026-11-19T09:00:00.000Z',
    sharedCharacteristics: {
      temperatureMinC: 0, temperatureMaxC: 95, maxOperatingPressure: 'PN10', shaftMaterial: ' ', connectionSize: 'DN 40',
    },
  };
  save.mockResolvedValue({ ok: true, savedAt: '2026-11-19T09:01:00.000Z' });
  render(<PumpSharedCharacteristicsEditor group={group} path={[series, group]} />);
  await user.click(screen.getByText(/^Общие характеристики/));

  expect(screen.getByRole('spinbutton', { name: 'Температура от, °C' })).toHaveValue(0);
  expect(screen.getByRole('spinbutton', { name: 'Температура до, °C' })).toHaveValue(95);
  expect(screen.getByRole('textbox', { name: /^Материал корпуса/ })).toHaveAttribute('placeholder', 'Чугун');
  expect(screen.getByText('Из папки «HIP»')).toBeVisible();
  expect(screen.queryByRole('textbox', { name: 'Материал вала' })).not.toBeInTheDocument();
  const add = screen.getByRole('combobox', { name: 'Добавить общее поле' });
  expect(screen.queryByRole('textbox', { name: /диаметр присоединения/i })).not.toBeInTheDocument();
  expect(within(add).queryByRole('option', { name: /диаметр присоединения/i })).not.toBeInTheDocument();

  const saveDraft = screen.getByRole('button', { name: 'Сохранить черновик' });
  expect(screen.queryByRole('textbox', { name: 'Степень защиты' })).not.toBeInTheDocument();
  await user.selectOptions(add, 'protectionClass');
  expect(screen.getByRole('textbox', { name: 'Степень защиты' })).toHaveValue('');
  expect(within(add).queryByRole('option', { name: 'Степень защиты' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Тип уплотнения' })).not.toBeInTheDocument();
  expect(saveDraft).toBeDisabled();
  expect(save).not.toHaveBeenCalled();

  await user.clear(screen.getByRole('spinbutton', { name: 'Температура до, °C' }));
  await user.clear(screen.getByRole('textbox', { name: 'Максимальное рабочее давление' }));
  await user.click(saveDraft);

  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(save).toHaveBeenCalledExactlyOnceWith(group.id, group.updatedAt, expect.objectContaining({ temperatureMinC: 0 }), 'save');
  const fields = save.mock.lastCall?.[2];
  for (const key of ['temperatureMaxC', 'maxOperatingPressure', 'protectionClass', 'wettedMaterial', 'connectionSize']) {
    expect(fields).not.toHaveProperty(key);
  }
  expect(screen.getByRole('spinbutton', { name: 'Температура от, °C' })).toHaveValue(0);
  expect(screen.queryByRole('spinbutton', { name: 'Температура до, °C' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Максимальное рабочее давление' })).not.toBeInTheDocument();
});
