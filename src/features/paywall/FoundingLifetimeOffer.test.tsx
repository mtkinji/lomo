import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FoundingLifetimeOffer } from './FoundingLifetimeOffer';

jest.mock('../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({ reduceMotionEnabled: true, screenReaderEnabled: false }),
}));

describe('FoundingLifetimeOffer', () => {
  const actions = () => ({ onPurchase: jest.fn(), onClose: jest.fn(), onOtherPlans: jest.fn(), onRestore: jest.fn() });
  it('uses the supplied store price and leaves purchase, dismissal and recovery immediately accessible', () => {
    const callbacks = actions();
    const screen = renderWithProviders(<FoundingLifetimeOffer price="19,99 €" busy={false} {...callbacks} />);
    expect(screen.getByLabelText('19,99 €')).toBeTruthy();
    expect(screen.queryByText('$19.99')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Purchase' }));
    fireEvent.press(screen.getByRole('button', { name: 'Close offer' }));
    fireEvent.press(screen.getByRole('button', { name: 'Other plans' }));
    fireEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
    Object.values(callbacks).forEach(callback => expect(callback).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/promo code/i)).toBeNull();
    expect(screen.queryByText(/employer/i)).toBeNull();
  });
  it('blocks repeat purchase and restore while the store operation is busy', () => {
    const callbacks = actions();
    const screen = renderWithProviders(<FoundingLifetimeOffer price="$29.99" busy {...callbacks} />);
    fireEvent.press(screen.getByRole('button', { name: /Working/ }));
    fireEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
    expect(callbacks.onPurchase).not.toHaveBeenCalled();
    expect(callbacks.onRestore).not.toHaveBeenCalled();
  });
});
