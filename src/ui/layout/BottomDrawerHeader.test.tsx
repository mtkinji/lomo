import { StyleSheet } from 'react-native';
import { typography } from '../../theme';
import { renderWithProviders } from '../../test/renderWithProviders';
import { BottomDrawerHeader } from './BottomDrawerHeader';

describe('BottomDrawerHeader', () => {
  it('uses the compact standard drawer title by default', () => {
    const { getByText } = renderWithProviders(
      <BottomDrawerHeader title="Choose category" variant="withClose" onClose={jest.fn()} />,
    );

    expect(StyleSheet.flatten(getByText('Choose category').props.style)).toMatchObject({
      fontFamily: typography.titleSm.fontFamily,
      fontSize: typography.titleSm.fontSize,
    });
  });

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
