import { readFileSync } from 'fs';
import path from 'path';
import {
  adjustMoneyChartSelectionPercent,
  getBoundedMoneyChartTooltipPosition,
  getMoneyChartSelection,
} from './MoneyDetailMeter';

const series = [
  { xPercent: 3.33, valueCents: 1000 },
  { xPercent: 10, valueCents: 3500 },
  { xPercent: 13.33, valueCents: 3000 },
];

describe('Money chart inspection', () => {
  it('snaps to calendar days and reports cumulative plus daily spend', () => {
    expect(getMoneyChartSelection({
      periodStartIso: '2026-07-01',
      periodEndIso: '2026-07-31',
      observablePercent: 13.33,
      requestedPercent: 10,
      series,
    })).toMatchObject({
      dateIso: '2026-07-04',
      xPercent: 10,
      valueCents: 3500,
      daySpendCents: 2500,
    });
  });

  it('clamps touch and accessibility adjustment to the observable period', () => {
    expect(getMoneyChartSelection({
      periodStartIso: '2026-07-01',
      periodEndIso: '2026-07-31',
      observablePercent: 13.33,
      requestedPercent: 100,
      series,
    })?.dateIso).toBe('2026-07-05');
    expect(adjustMoneyChartSelectionPercent({
      currentPercent: 10,
      direction: 'increment',
      periodStartIso: '2026-07-01',
      periodEndIso: '2026-07-31',
      observablePercent: 13.33,
    })).toBe(13.33);
  });

  it('keeps the tooltip inside the measured chart frame', () => {
    expect(getBoundedMoneyChartTooltipPosition({
      anchorX: 2,
      anchorY: 4,
      chartWidth: 320,
      chartHeight: 184,
      tooltipWidth: 132,
      tooltipHeight: 68,
    })).toEqual({ left: 12, top: 0 });
    expect(getBoundedMoneyChartTooltipPosition({
      anchorX: 318,
      anchorY: 180,
      chartWidth: 320,
      chartHeight: 184,
      tooltipWidth: 132,
      tooltipHeight: 68,
    })).toEqual({ left: 188, top: 104 });
  });
});

describe('MoneyDetailMeter chart presentation', () => {
  it('keeps history subordinate and restores adjustable scrub interaction', () => {
    const source = readFileSync(path.join(__dirname, 'MoneyDetailMeter.tsx'), 'utf8');

    expect(source).toContain('stroke={colors.gray300} strokeOpacity={0.45} strokeWidth={1.5}');
    expect(source).toContain('mo avg by today');
    expect(source).toContain('accessibilityRole="adjustable"');
    expect(source).toContain('onLongPress={beginChartScrub}');
    expect(source).toContain('signalMoneyChoice();');
    expect(source).toContain('onScrubActiveChange(false)');
  });
});
