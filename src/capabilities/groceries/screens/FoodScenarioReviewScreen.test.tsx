import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FoodScenarioReviewScreen } from './FoodScenarioReviewScreen';
import { createFoodScenarioRepository } from '../data/foodScenarioRepository';

jest.mock('../data/foodScenarioRepository', () => ({ createFoodScenarioRepository: jest.fn() }));
jest.mock('../../../ui/layout/PageHeader', () => ({ PageHeader: ({ title }: any) => title }));
jest.mock('../../../ui/layout/AppShell', () => ({ AppShell: ({ children }: any) => children }));

describe('Food scenario review', () => {
  it('shows exact categories of change and keeps purchase evidence separate', async () => {
    const decide = jest.fn().mockResolvedValue({ recoveryRequired: true }); const recordPurchase = jest.fn().mockResolvedValue({ state: 'likely' });
    (createFoodScenarioRepository as jest.Mock).mockReturnValue({ get: jest.fn().mockResolvedValue({ id: 's', version: 1, lifecycle: 'proposed', estimateRangeCents: { min: 5100, max: 5800 }, currentPriceCoveragePercent: 82, evidenceObservedAt: '2026-08-05T12:00:00.000Z', mealPlanDiffs: [{ kind: 'replace_meal', entryId: 'e', replacementRecipeVersionId: 'r' }], groceryDiffs: [{ kind: 'replace_item', itemId: 'i', replacementConcept: 'chicken thighs' }], opportunityIds: ['o'], assumptions: ['Same serving count'] }), listOpportunities: jest.fn().mockResolvedValue([{ id: 'o', concept: 'Chicken thighs', retailer: 'Market', observedPriceCents: 149, state: 'observed' }]), decide, recordPurchase });
    const screen = render(<FoodScenarioReviewScreen navigation={{ goBack: jest.fn() } as any} route={{ params: { scenarioId: 's' } } as any} />);
    await waitFor(() => expect(screen.getByText('A possible way to spend less')).toBeTruthy());
    expect(screen.getByText(/current prices for 82%/)).toBeTruthy(); expect(screen.getByText(/likely stock only/)).toBeTruthy();
    fireEvent.press(screen.getByText('Review suggested changes')); await waitFor(() => expect(decide).toHaveBeenCalledWith('s', 1, 'accept'));
    await waitFor(() => expect(screen.getByText('I bought it')).toBeTruthy());
    fireEvent.press(screen.getByText('I bought it')); await waitFor(() => expect(recordPurchase).toHaveBeenCalledWith('o'));
  });
});
