import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { ChoicePill } from './ChoicePill';

describe('ChoicePill', () => {
  it('exposes the complete sentence as one named action and opens the chosen path', () => {
    const onPress = jest.fn();
    const screen = renderWithProviders(<ChoicePill icon="wallet" label="Make a plan for your money"
      emphasis="plan" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Make a plan for your money' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('retains the label when emphasis is missing and prevents disabled activation', () => {
    const onPress = jest.fn();
    const screen = renderWithProviders(<ChoicePill icon="home" label="Plan meals together"
      emphasis="absent" disabled onPress={onPress} />);
    expect(screen.getByText('Plan meals together')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Plan meals together' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
