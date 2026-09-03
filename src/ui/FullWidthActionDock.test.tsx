import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithProviders } from '../test/renderWithProviders';
import { bottomDockGeometry } from '../theme';
import { Button } from './Button';
import { FullWidthActionDock, useFullWidthActionDockClearance } from './FullWidthActionDock';

function ClearanceProbe() {
  const clearance = useFullWidthActionDockClearance();
  return (
    <FullWidthActionDock>
      <Button accessibilityLabel={`Clearance ${clearance}`} fullWidth size="lg" onPress={() => {}}>Continue</Button>
    </FullWidthActionDock>
  );
}

describe('FullWidthActionDock', () => {
  it('owns the canonical phone-bottom geometry and a large full-width button', () => {
    const onPress = jest.fn();
    const screen = renderWithProviders(
      <FullWidthActionDock dockTestID="test.actionDock">
        <Button fullWidth size="lg" onPress={onPress}>Continue</Button>
      </FullWidthActionDock>,
    );

    const hostStyle = StyleSheet.flatten(screen.getByTestId('test.actionDock').props.style);
    const buttonStyle = StyleSheet.flatten(screen.getByRole('button', { name: 'Continue' }).props.style);

    expect(hostStyle).toMatchObject({
      bottom: bottomDockGeometry.phoneFloating.inlineGap,
      left: 0,
      paddingHorizontal: bottomDockGeometry.phoneFloating.inlineGap,
      position: 'absolute',
      right: 0,
    });
    expect(buttonStyle).toMatchObject({ minHeight: 52, width: '100%' });

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reserves enough content clearance for the dock without exposing screen-owned inset math', () => {
    const screen = renderWithProviders(<ClearanceProbe />);

    expect(screen.getByRole('button', { name: 'Clearance 88' })).toBeTruthy();
  });
});
