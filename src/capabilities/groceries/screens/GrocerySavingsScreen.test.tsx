import { render, waitFor } from '@testing-library/react-native';
import { GrocerySavingsScreen } from './GrocerySavingsScreen';
import { createGroceryRepository } from '../data/groceryRepository';
import { createGrocerySavingsRepository } from '../data/grocerySavingsRepository';

jest.mock('../data/groceryRepository', () => ({ createGroceryRepository: jest.fn() }));
jest.mock('../data/grocerySavingsRepository', () => ({ createGrocerySavingsRepository: jest.fn() }));
jest.mock('../../../ui/layout/PageHeader', () => ({ PageHeader: ({ title }: any) => title }));
jest.mock('../../../ui/layout/AppShell', () => ({ AppShell: ({ children }: any) => children }));

describe('Grocery Savings screen', () => {
  it('calmly explains when no current evidence exists', async () => {
    (createGroceryRepository as jest.Mock).mockReturnValue({ list: jest.fn().mockResolvedValue([{ id: 'l', revision: 2, status: 'ready', items: [] }]) });
    (createGrocerySavingsRepository as jest.Mock).mockReturnValue({ prepare: jest.fn().mockResolvedValue({ options: [], status: 'no_verified_evidence', evidenceCoveragePercent: 0 }) });
    const screen = render(<GrocerySavingsScreen navigation={{ goBack: jest.fn() } as any} route={{ params: { listId: 'l' } } as any} />);
    await waitFor(() => expect(screen.getByText('No verified offers yet')).toBeTruthy());
    expect(screen.getByText(/Kwilt won’t call a shelf price/)).toBeTruthy();
  });
});
