import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import type { MoneyCategory } from '../data/moneySnapshot';
import {
  getCategoryListStatus,
  MoneyCategoryListRow,
  MoneyCategoryMeterTile,
  resolveCategoryPresentation,
} from './MoneyCategoryMeterTile';

const category = {
  id: 'shopping',
  sourceId: 'shopping',
  name: 'Shopping',
  plannedCents: 40000,
  spentCents: 37595,
  remainingCents: 2405,
  percentUsed: 94,
  forecast: { status: 'watch' },
} as MoneyCategory;

describe('Money category inventory presentations', () => {
  it('keeps square tiles percentage-only, including for large overruns', () => {
    const screen = render(
      <MoneyCategoryMeterTile
        category={{ ...category, spentCents: 61764, remainingCents: -31764, percentUsed: 206 }}
        onPress={jest.fn()}
        periodElapsedPercent={75}
      />,
    );

    expect(screen.getByText('206')).toBeTruthy();
    expect(screen.getByText('%')).toBeTruthy();
    expect(screen.queryByText('$317.64')).toBeNull();
    expect(screen.queryByText('over')).toBeNull();
  });

  it('rounds dollars left without repeating category arithmetic in the list', () => {
    const screen = render(<MoneyCategoryListRow category={{ ...category, remainingCents: -520 }} onPress={jest.fn()} periodElapsedPercent={75} />);
    expect(screen.getByText('$5 over')).toBeTruthy();
    expect(screen.queryByText('$375.95 / $400')).toBeNull();
  });

  it('uses destructive text and pace color for every actual overage', () => {
    const screen = render(<MoneyCategoryListRow category={{ ...category, remainingCents: -116 }} onPress={jest.fn()} periodElapsedPercent={75} />);

    expect(getCategoryListStatus({ ...category, remainingCents: -116 })).toEqual({ label: null, tone: 'danger' });
    expect(StyleSheet.flatten(screen.getByText('$1 over').props.style).color).toBe(colors.destructive);
    expect(screen.getByTestId('money-category-pace-used', { includeHiddenElements: true })).toHaveStyle({ backgroundColor: colors.destructive });
  });

  it('uses a compact warning indicator instead of persistent projection copy', () => {
    const screen = render(<MoneyCategoryListRow category={category} onPress={jest.fn()} periodElapsedPercent={75} />);

    expect(screen.queryByText('Projected to go over')).toBeNull();
    expect(screen.getByTestId('money-category-projected-warning', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('Open Shopping category, $24 left, Projected to go over')).toBeTruthy();
  });

  it('shows category use against elapsed month pace', () => {
    const screen = render(<MoneyCategoryListRow category={category} onPress={jest.fn()} periodElapsedPercent={75} />);

    expect(screen.getByTestId('money-category-pace-used', { includeHiddenElements: true })).toHaveStyle({ width: '94%' });
    expect(screen.getByTestId('money-category-pace-elapsed', { includeHiddenElements: true })).toHaveStyle({ left: '75%' });
  });

  it('distinguishes actual overages from forecast risk', () => {
    expect(getCategoryListStatus({ ...category, remainingCents: -520 })).toEqual({ label: null, tone: 'danger' });
    expect(getCategoryListStatus({ ...category, remainingCents: -5200 })).toEqual({ label: null, tone: 'danger' });
    expect(getCategoryListStatus(category)).toEqual({ label: 'Projected to go over', tone: 'watch' });
    expect(getCategoryListStatus({
      ...category,
      remainingCents: 2_405,
      forecast: { status: 'over', projectedOverageCents: 5_000 },
    } as MoneyCategory)).toEqual({ label: 'Projected to go over', tone: 'watch' });
    expect(getCategoryListStatus({ ...category, forecast: { status: 'steady' } } as MoneyCategory)).toEqual({ label: null, tone: 'neutral' });
  });

  it('maps each menu choice to a renderable layout and value mode', () => {
    expect(resolveCategoryPresentation('meters')).toEqual({ layout: 'meters', valueMode: 'percent_used' });
    expect(resolveCategoryPresentation('list')).toEqual({ layout: 'list', valueMode: 'dollars_left' });
  });
});
