import { fireEvent, render } from '@testing-library/react-native';
import { FoodRealityStrip } from './FoodRealityStrip';

describe('Food Reality strip', () => {
  it('keeps category remainder, trip target, stock, and price evidence visibly distinct', () => {
    const onStock = jest.fn(); const screen = render(<FoodRealityStrip budget={{ state: 'stale', categoryIds: ['food'], period: { startsOn: '2026-08-01', endsOn: '2026-08-31' }, plannedCents: 9000, spentCents: 1000, remainingCents: 8000, forecastRangeCents: null, sourcePlanVersionId: 'v1', observedAt: '2026-08-05T00:00:00.000Z', freshUntil: '2026-08-05T01:00:00.000Z' }} tripTargetCents={6500} relevantStockCount={4} priceEvidence={{ retailer: "Smith's", observedAt: '2026-08-05T12:00:00.000Z', coveragePercent: 81 }} onBudget={jest.fn()} onStock={onStock} onPrices={jest.fn()} />);
    expect(screen.getByText('Aim for $65')).toBeTruthy(); expect(screen.getByText('$80 left in Food · stale')).toBeTruthy(); expect(screen.getByText("Smith's · 81% covered")).toBeTruthy();
    fireEvent.press(screen.getByText('4 relevant ingredients')); expect(onStock).toHaveBeenCalled();
  });
});
