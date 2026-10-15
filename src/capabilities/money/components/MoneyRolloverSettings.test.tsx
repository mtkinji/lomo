import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { MoneyRolloverSettings } from './MoneyRolloverSettings';

it('discloses controls only after enabling rollover and edits only the supplied draft', () => {
  const onChange = jest.fn();
  const draft = { enabled: false, startMonth: '2026-10', balance: '0.00' };
  const props = { draft, onChange, currentMonth: '2026-10', monthlyAmountCents: 40000, spentCents: 0, disabled: false, review: { policy: null, preview: null, error: null } };
  const rendered = renderWithProviders(<MoneyRolloverSettings {...props} />);
  expect(screen.queryByText('Roll over from')).toBeNull();
  expect(screen.queryByLabelText('Starting balance')).toBeNull();
  fireEvent.press(screen.getByRole('switch', { name: 'Rollover' }));
  expect(onChange).toHaveBeenCalledWith({ ...draft, enabled: true });
  rendered.rerender(<MoneyRolloverSettings {...props} draft={{ ...draft, enabled: true }} />);
  expect(screen.getByLabelText('Starting balance')).toBeTruthy();
  expect(screen.getByText('Roll over from')).toBeTruthy();
  expect(screen.queryByText('Start in January this year')).toBeNull();
  expect(screen.queryByText('I’ve reviewed the earlier spending')).toBeNull();
  fireEvent.press(screen.getByText('Roll over from'));
  fireEvent.press(screen.getByText('June 2026'));
  expect(onChange).toHaveBeenLastCalledWith({ ...draft, enabled: true, startMonth: '2026-06' });
});
