import { groceryOfflineQueue } from '../data/groceryOfflineQueue';
import { groceryCache } from '../data/groceryCache';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AlreadyHaveReviewScreen } from './AlreadyHaveReviewScreen';
import { createGroceryRepository } from '../data/groceryRepository';

jest.mock('../data/groceryRepository', () => ({ createGroceryRepository: jest.fn() }));
jest.mock('../../../store/useAppStore', () => ({ useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) => selector({ authIdentity: { userId: 'user-1' } }) }));
jest.mock('../../../ui/layout/PageHeader', () => ({ PageHeader: ({ title }: { title: string }) => title }));
jest.mock('../../../ui/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));

describe('Already have review', () => {
  beforeEach(async () => {
    await groceryOfflineQueue.clear('user-1');
    await groceryCache.clear('user-1');
  });

  it('preserves an undo made while the earlier checked save is still in flight', async () => {
    const server = { id: 'list-1', revision: 3, status: 'review_needed', items: [
      { id: 'item-1', concept: 'Flour', quantityMin: 2, quantityMax: null, unit: 'cups', state: 'needed' },
    ] };
    let releaseCheck!: () => void;
    const setItemState = jest.fn().mockImplementationOnce(() => new Promise((resolve) => {
      releaseCheck = () => {
        server.revision = 4;
        server.items[0].state = 'already_have';
        resolve({ groceryListId: 'list-1', itemId: 'item-1', revision: 4, state: 'already_have' });
      };
    })).mockImplementation(async (_id, _revision, state) => {
      server.revision += 1;
      server.items[0].state = state;
      return { groceryListId: 'list-1', itemId: 'item-1', revision: server.revision, state };
    });
    (createGroceryRepository as jest.Mock).mockReturnValue({
      list: jest.fn(async () => [{ ...server, items: server.items.map((item) => ({ ...item })) }]),
      setItemState,
    });
    const screen = render(<AlreadyHaveReviewScreen navigation={{ goBack: jest.fn(), replace: jest.fn() } as never}
      route={{ params: { listId: 'list-1' } } as never} />);
    const check = () => screen.getByRole('checkbox', { name: '2 cups Flour' });
    await waitFor(() => expect(check()).toBeTruthy());
    fireEvent.press(check());
    await waitFor(() => expect(setItemState).toHaveBeenCalledTimes(1));
    fireEvent.press(check());
    await waitFor(async () => expect((await groceryOfflineQueue.read('user-1'))[0]?.state).toBe('needed'));
    await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });
    await act(async () => { releaseCheck(); });
    await waitFor(() => expect(setItemState).toHaveBeenCalledWith('item-1', 4, 'needed'));
    expect(check().props.accessibilityState.checked).toBe(false);
    expect(server.items[0].state).toBe('needed');
  });

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
