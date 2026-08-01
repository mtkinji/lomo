import { render } from '@testing-library/react-native';
import type { MoneyCategory } from '../data/moneySnapshot';
import {
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

  it('can show percent used or dollars left in a list row', () => {
    const screen = render(<MoneyCategoryListRow category={category} onPress={jest.fn()} valueMode="percent_used" />);
    expect(screen.getByText('94% used')).toBeTruthy();

    screen.rerender(<MoneyCategoryListRow category={{ ...category, remainingCents: -520 }} onPress={jest.fn()} valueMode="dollars_left" />);
    expect(screen.getByText('$5.20 over')).toBeTruthy();
  });

  it('maps each menu choice to a renderable layout and value mode', () => {
    expect(resolveCategoryPresentation('tiles')).toEqual({ layout: 'tiles', valueMode: 'percent_used' });
    expect(resolveCategoryPresentation('list_percent')).toEqual({ layout: 'list', valueMode: 'percent_used' });
    expect(resolveCategoryPresentation('list_dollars')).toEqual({ layout: 'list', valueMode: 'dollars_left' });
  });
});
