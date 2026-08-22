import { render } from '@testing-library/react-native';
import type { MoneyTransaction } from '../data/moneySnapshot';
import { CategoryTransactionRow } from './MoneyCategoryDetailScreen';

const orthodontics = {
  id: 'orthodontics',
  accountId: 'prime',
  accountName: 'Prime Visa',
  institutionName: 'Chase',
  merchantName: 'Jeremy B Matthews Dmd',
  amountCents: 311600,
  direction: 'outflow',
  date: '2026-08-12',
  pending: false,
  currencyCode: 'USD',
  categoryId: 'health',
  categoryName: 'Health & Activities',
  reviewState: 'assigned',
  moneyMeaning: null,
  savedResourceCents: 311600,
} as MoneyTransaction;

describe('CategoryTransactionRow plan coverage', () => {
  it('keeps the purchase amount while explaining that saved money contributes zero to the plan', () => {
    const screen = render(
      <CategoryTransactionRow onPress={jest.fn()} showDivider={false} transaction={orthodontics} />,
    );

    expect(screen.getByText('-$3,116')).toBeTruthy();
    expect(screen.getByText('Saved money · $0 from plan')).toBeTruthy();
    expect(screen.getByLabelText(
      'Open Jeremy B Matthews Dmd transaction, Prime Visa, -$3,116, covered by saved money, $0 from plan',
    )).toBeTruthy();
  });

  it('leaves an ordinary category transaction visually unchanged', () => {
    const screen = render(
      <CategoryTransactionRow
        onPress={jest.fn()}
        showDivider={false}
        transaction={{ ...orthodontics, id: 'momentum', amountCents: 10638, savedResourceCents: 0 }}
      />,
    );

    expect(screen.getByText('Prime Visa')).toBeTruthy();
    expect(screen.getByText('-$106.38')).toBeTruthy();
    expect(screen.queryByText(/from plan/)).toBeNull();
  });
});
