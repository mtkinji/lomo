import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AlreadyHaveReviewScreen } from './AlreadyHaveReviewScreen';
import { createGroceryRepository } from '../data/groceryRepository';

jest.mock('../data/groceryRepository', () => ({ createGroceryRepository: jest.fn() }));
jest.mock('../../../store/useAppStore', () => ({ useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) => selector({ authIdentity: { userId: 'user-1' } }) }));
jest.mock('../../../ui/layout/PageHeader', () => ({ PageHeader: ({ title }: { title: string }) => title }));
jest.mock('../../../ui/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));

describe('Already have review', () => {
  it('finishes the review through grocery authority and returns to the ready list', async () => {
    const markReviewed = jest.fn().mockResolvedValue({});
    (createGroceryRepository as jest.Mock).mockReturnValue({
      list: jest.fn().mockResolvedValue([{ id: 'list-1', revision: 3, status: 'review_needed', items: [{ id: 'item-1', concept: 'Flour', quantityMin: 2, quantityMax: null, unit: 'cups', state: 'needed' }] }]),
      markReviewed,
    });
    const replace = jest.fn();
    const screen = render(<AlreadyHaveReviewScreen navigation={{ goBack: jest.fn(), replace } as never} route={{ params: { listId: 'list-1' } } as never} />);

    await waitFor(() => expect(screen.getByText('2 cups Flour')).toBeTruthy());
    expect(screen.getByText('What do you already have?')).toBeTruthy();
    fireEvent.press(screen.getByText('Make grocery list'));

    await waitFor(() => expect(markReviewed).toHaveBeenCalledWith('list-1', 3));
    expect(replace).toHaveBeenCalledWith('GroceryList', { listId: 'list-1' });
  });
});
