import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import { BottomDrawer, isBottomDrawerAccessibilityModal } from './BottomDrawer';

describe('BottomDrawer accessibility contract', () => {
  it('isolates modal content, hides its backdrop, and supports escape', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <BottomDrawer visible onClose={onClose}>
        <Text>Drawer content</Text>
      </BottomDrawer>,
    );

    expect(getByTestId('bottom-drawer.surface').props).toMatchObject({
      accessibilityViewIsModal: true,
      importantForAccessibility: 'yes',
    });
    expect(
      getByTestId('bottom-drawer.backdrop', { includeHiddenElements: true }).props.accessible,
    ).toBe(false);

    fireEvent(getByTestId('bottom-drawer.surface'), 'accessibilityEscape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps a backdrop-free inline guide non-modal', () => {
    expect(isBottomDrawerAccessibilityModal('inline', true)).toBe(false);
    expect(isBottomDrawerAccessibilityModal('inline', false)).toBe(true);
    expect(isBottomDrawerAccessibilityModal('modal', true)).toBe(true);
  });
});
