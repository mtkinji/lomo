import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { AtmosphericInvitationScreen } from './AtmosphericInvitationScreen';

jest.mock('../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({ reduceMotionEnabled: true, screenReaderEnabled: false }),
}));

describe('AtmosphericInvitationScreen', () => {
  it('makes the action immediately available and removes identity for a single-message invitation', () => {
    const next = jest.fn();
    const screen = renderWithProviders(<AtmosphericInvitationScreen variant="promise"
      identity="Kwilt. One app for life." message="A household promise." actionLabel="Get started" onContinue={next} />);
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    expect(next).toHaveBeenCalledTimes(1);
    screen.rerender(<AtmosphericInvitationScreen variant="invitation"
      message="A setup invitation." actionLabel="Continue" onContinue={next} />);
    expect(screen.queryByText('Kwilt. One app for life.')).toBeNull();
    expect(screen.getByRole('header').props.children).toBe('A setup invitation.');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(next).toHaveBeenCalledTimes(2);
  });
});
