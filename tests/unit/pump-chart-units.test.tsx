import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PumpChart } from '@/cms/public-pump-selection';
import { interpolateCurve } from '@/lib/curve-interpolation';
import type { FlowUnit } from '@/lib/flow-units';
import { createSystemCurve } from '@/lib/pump-operating-point';
import { preparePumpCurve, preparePumpEfficiency, preparePumpNpsh, preparePumpPowerP2, pumpPowerP2At } from '@/lib/pump-selection';
import PumpCurveChart from '@/app/(frontend)/selection/pumps/PumpCurveChart';

const curve = preparePumpCurve({
  flowMinM3h: 3.6, flowMaxM3h: 12,
  points: [{ flow: 0, head: 18 }, { flow: 7.2, head: 12 }, { flow: 14.4, head: 6 }],
})!;
const performance = [
  { flow: 3.6, efficiency: 50, npsh: 1 },
  { flow: 7.2, efficiency: 60, npsh: 2 },
  { flow: 14.4, efficiency: 50, npsh: 3 },
];
const efficiencyCurve = preparePumpEfficiency(performance);
const duty = { flowM3h: 7.2, requiredHeadM: 12 };
const system = createSystemCurve(duty, 2)!;
const density = 1050;
const powerAt = (flow: number) => pumpPowerP2At(curve, efficiencyCurve, flow, density);
const chart: PumpChart = {
  sku: 'TEST', name: 'Test pump', rowId: 'test', headMarginM: 0, points: [{ x: 7.2, y: 12 }],
  coincident: false, meetsDuty: true, optimal: true, efficiency: 60,
  connectionSize: 'DN 32', powerKw: 1, speedRpm: 2900, voltageV: 380,
  voltageDeltaV: null, voltageStarV: null, phases: 3, frequencyHz: 50,
  curve, efficiencyCurve, npshCurve: preparePumpNpsh(performance),
  powerP2Curve: preparePumpPowerP2(curve, efficiencyCurve, [7.2], density), viscosityCorrected: false,
};

describe('pump chart flow units', () => {
  it.each<[FlowUnit, string, string, number]>([
    ['m3h', 'м³/ч', '7,2', 15],
    ['ls', 'л/с', '2', 4],
    ['lmin', 'л/мин', '120', 250],
  ])('draws aligned upper and lower scales in %s', (flowUnit, unit, displayed, limit) => {
    render(<PumpCurveChart chart={chart} duty={duty} system={system} powerAt={powerAt} flowUnit={flowUnit} />);
    const upper = screen.getByRole('group', { name: 'Кривые насоса Test pump и системы, КПД' });
    const lower = screen.getByRole('group', { name: 'NPSHr, Мощность P2' });
    expect(within(upper).getByText(`Q, ${unit}`)).toBeInTheDocument();
    expect(within(lower).getByText(`Q, ${unit}`)).toBeInTheDocument();
    const target = screen.getByRole('img', { name: `Расчетная точка · ${displayed} ${unit} · 12 м` });
    const actual = screen.getByRole('img', { name: `Фактическая рабочая точка · ${displayed} ${unit} · 12 м` });
    const expectedX = 50 + Number(displayed.replace(',', '.')) / limit * 500;
    expect(Number(target.getAttribute('transform')!.match(/translate\(([^,]+)/)![1])).toBeCloseTo(expectedX, 10);
    expect(actual.getAttribute('transform')).toBe(target.getAttribute('transform'));
    const npsh = within(lower).getByRole('img', { name: 'NPSHr · 2 м' });
    expect(Number(npsh.getAttribute('transform')!.match(/translate\(([^,]+)/)![1])).toBeCloseTo(expectedX, 10);
    const power = within(lower).getByRole('img', { name: 'Мощность P2 · 0,412 кВт' });
    const powerPosition = power.getAttribute('transform')!.slice('translate('.length, -1);
    expect(Number(powerPosition.split(',')[0])).toBeCloseTo(expectedX, 10);
    expect(power.parentElement?.querySelector('path')?.getAttribute('d')).toContain(powerPosition);
    const upperTickPositions = [...upper.querySelectorAll('text[y="328"]')].map(node => node.getAttribute('x'));
    const lowerTickPositions = [...lower.querySelectorAll('text[y="218"]')].map(node => node.getAttribute('x'));
    expect(upperTickPositions).toEqual(lowerTickPositions);
    expect(duty.flowM3h).toBe(7.2);
    expect(chart.curve.segments.at(-1)!.end.x).toBe(14.4);
  });

  it('keeps the selected flow scale when auxiliary curves are hidden', async () => {
    const user = userEvent.setup();
    render(<PumpCurveChart chart={chart} duty={duty} system={system} powerAt={powerAt} flowUnit="ls" />);
    const target = () => screen.getByRole('img', { name: 'Расчетная точка · 2 л/с · 12 м' });
    const position = target().getAttribute('transform');
    await user.click(screen.getByRole('checkbox', { name: 'КПД' }));
    await user.click(screen.getByRole('checkbox', { name: 'NPSHr' }));
    await user.click(screen.getByRole('checkbox', { name: 'Мощность P2' }));
    expect(screen.getAllByText('Q, л/с')).toHaveLength(1);
    expect(target().getAttribute('transform')).toBe(position);
  });

  it('shows the entire water reference on the same axes as the corrected curve', () => {
    const waterCurve = preparePumpCurve({ flowMinM3h: 3.6, flowMaxM3h: 24,
      points: [{ flow: 0, head: 30 }, { flow: 28.8, head: 10 }],
    })!;
    const props = { duty, system, powerAt, flowUnit: 'ls' as const };
    const { rerender } = render(<PumpCurveChart chart={chart} {...props} />);
    const label = 'Кривая насоса на воде';
    expect(screen.queryByRole('img', { name: label })).not.toBeInTheDocument();
    rerender(<PumpCurveChart chart={{ ...chart, waterCurve, viscosityCorrected: true }} {...props} />);
    const reference = screen.getByRole('img', { name: label });
    expect(reference.getAttribute('d')).toMatch(/^M50,104\.5 .* 550,241\.5$/);
    expect(screen.getByText(label)).toBeInTheDocument();
    const lower = screen.getByRole('group', { name: 'NPSHr, Мощность P2' });
    expect(within(lower).getByText('8')).toHaveAttribute('x', '550');
  });

  it('draws separate power branches on either side of zero efficiency', () => {
    const efficiency = preparePumpEfficiency(performance.map(row => row.flow === 7.2 ? { ...row, efficiency: 0 } : row));
    const power = preparePumpPowerP2(curve, efficiency, [7.2], density);
    render(<PumpCurveChart chart={{ ...chart, efficiencyCurve: efficiency, powerP2Curve: power }}
      duty={duty} system={system} powerAt={flow => pumpPowerP2At(curve, efficiency, flow, density)} />);
    const lower = screen.getByRole('group', { name: 'NPSHr, Мощность P2' });
    const curvePath = within(lower).getByText('P2, кВт').parentElement?.querySelector('path');
    expect(curvePath?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
    expect(within(lower).queryByRole('img', { name: /^Мощность P2 ·/ })).not.toBeInTheDocument();
  });

  it('ends the thick P2 path exactly at the rated power', () => {
    const props = { duty, system, powerAt };
    const { rerender } = render(<PumpCurveChart chart={{ ...chart, powerKw: 0.4 }} {...props} />);
    const lower = screen.getByRole('group', { name: 'NPSHr, Мощность P2' });
    const power = within(lower).getByText('P2, кВт').parentElement!;
    const [thin, normal] = power.querySelectorAll<SVGPathElement>(':scope > path');
    const ratedTick = within(power).getByText('0,4').parentElement?.querySelector('line');
    const [, endY] = normal.getAttribute('d')!.split(' ').at(-1)!.split(',').map(Number);
    expect(thin.style.strokeWidth).toBe('1');
    expect(normal.getAttribute('d')).not.toBe(thin.getAttribute('d'));
    expect(normal.style.strokeLinecap).toBe('butt');
    expect(normal).not.toHaveAttribute('clip-path');
    expect(endY).toBeCloseTo(Number(ratedTick?.getAttribute('y1')), 10);

    rerender(<PumpCurveChart chart={{ ...chart, powerKw: null }} {...props} />);
    expect(power.querySelectorAll(':scope > path')).toHaveLength(1);
  });

  it('dashes both solution curves at the same flow, only where P2 exceeds nominal', async () => {
    const user = userEvent.setup();
    const first = { x: 3.6, y: 0.25 }, last = { x: 10.8, y: 1.75 };
    const powerP2Curve = { first, last, segments: interpolateCurve([first, last]) };
    const props = { chart: { ...chart, powerP2Curve }, duty, system, powerAt };
    const { rerender } = render(<PumpCurveChart {...props} />);
    const upper = screen.getByRole('group', { name: /^Кривые насоса/ });
    const lower = screen.getByRole('group', { name: 'NPSHr, Мощность P2' });
    const dashedPath = (plot: HTMLElement) => plot.querySelector('path[stroke-dasharray]');
    expect(dashedPath(upper)).toBeNull();
    expect(dashedPath(lower)).toBeNull();
    rerender(<PumpCurveChart {...props} isSolution />);
    for (const plot of [upper, lower]) {
      const d = dashedPath(plot)!.getAttribute('d')!;
      const startX = Number(d.slice(1).split(',')[0]);
      const endX = Number(d.split(' ').at(-1)!.split(',')[0]);
      expect(startX).toBeCloseTo(50 + 7.2 / 15 * 500, 10);
      expect(endX).toBeCloseTo(50 + 10.8 / 15 * 500, 10);
    }
    const normalHead = upper.querySelector('path[clip-path]')!.getAttribute('d');
    expect(normalHead?.match(/M/g)).toHaveLength(2);
    await user.click(screen.getByRole('checkbox', { name: 'Мощность P2' }));
    expect(dashedPath(upper)).toBeInTheDocument();
  });
});
