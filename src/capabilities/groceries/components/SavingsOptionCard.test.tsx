import { fireEvent, render } from '@testing-library/react-native';
import { SavingsOptionCard } from './SavingsOptionCard';

describe('Savings option card', () => {
  it('labels estimates, requirements, freshness and truthful next action', () => {
    const onPress = jest.fn();
    const screen = render(<SavingsOptionCard option={{ id: 'o', groceryItemId: 'i', title: 'Store brand beans', productId: 'p', store: 'Kroger', quantity: 2, baseUnits: 4, baselineCents: 600, netCents: 450, predictedSavingsCents: 150, evidence: [{ id: 'e', kind: 'coupon', state: 'eligible', provider: 'kroger', productId: 'p', amountCents: 150, memberRequired: true, activationRequired: true, observedAt: '2026-08-05T12:00:00.000Z', expiresAt: '2026-08-06T12:00:00.000Z' }], evidenceObservedAt: '2026-08-05T12:00:00.000Z', expiresAt: '2026-08-06T12:00:00.000Z', nextAction: 'Activate in retailer app', assumptions: ['Two packages'] }} onPress={onPress} />);
    expect(screen.getByText('Estimated save $1.50')).toBeTruthy();
    expect(screen.getByText(/Kroger membership/)).toBeTruthy();
    fireEvent.press(screen.getByText('Activate in retailer app'));
    expect(onPress).toHaveBeenCalled();
  });
});
