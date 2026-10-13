import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { MoneyRolloverSettings } from './MoneyRolloverSettings';

it('discloses controls only after enabling rollover and edits only the supplied draft', () => {
  const onChange = jest.fn();
  const draft = { enabled: false, startMonth: '2026-10', balance: '0.00', historicalAmount: '400.00', historyReviewed: false };
  const props = { draft, onChange, currentMonth: '2026-10', monthlyAmountCents: 40000, spentCents: 0, disabled: false, review: { policy: null, preview: null, error: null, historyRequired: false } };
  const rendered = renderWithProviders(<MoneyRolloverSettings {...props} />);
  expect(screen.queryByText('Start month')).toBeNull();
  expect(screen.queryByLabelText('Starting balance')).toBeNull();
  fireEvent.press(screen.getByRole('switch', { name: 'Rollover' }));
  expect(onChange).toHaveBeenCalledWith({ ...draft, enabled: true });
  rendered.rerender(<MoneyRolloverSettings {...props} draft={{ ...draft, enabled: true }} />);
  expect(screen.getByLabelText('Starting balance')).toBeTruthy();
  fireEvent.press(screen.getByText('Start in January this year'));
  expect(onChange).toHaveBeenLastCalledWith({ ...draft, enabled: true, startMonth: '2026-01', historyReviewed: false });
});
