import { StyleSheet } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { BottomDrawerHeader } from './BottomDrawerHeader';

describe('BottomDrawerHeader', () => {
  it('provides stable full-width immersive drawer chrome', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <BottomDrawerHeader title="Chat about this goal" variant="immersive" />,
    );

    expect(getByText('Chat about this goal')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('bottom-drawer.header').props.style)).toMatchObject({
      minHeight: 48,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
    });
  });
});
