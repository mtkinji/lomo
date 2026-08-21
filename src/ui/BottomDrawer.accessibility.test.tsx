import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { renderWithProviders } from '../test/renderWithProviders';
import {
  BottomDrawer,
  getBottomDrawerExpansionOpacity,
  isBottomDrawerAccessibilityModal,
  shouldAnimateBottomDrawerOnHide,
  shouldBottomDrawerResizeContents,
  shouldDismissKeyboardOnSnapChange,
} from './BottomDrawer';

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

  it('animates modal dismissal only when the caller opts into a retained close transition', () => {
    expect(shouldAnimateBottomDrawerOnHide('modal', true)).toBe(true);
    expect(shouldAnimateBottomDrawerOnHide('modal', false)).toBe(false);
    expect(shouldAnimateBottomDrawerOnHide('inline', false)).toBe(true);
  });

  it('uses the high-handle standard anatomy by default', () => {
    const { getByTestId } = renderWithProviders(
      <BottomDrawer visible onClose={jest.fn()}>
        <Text>Standard drawer</Text>
      </BottomDrawer>,
    );

    expect(StyleSheet.flatten(getByTestId('bottom-drawer.surface').props.style)).toMatchObject({
      paddingTop: 0,
    });
    expect(StyleSheet.flatten(getByTestId('bottom-drawer.handle-region').props.style)).toMatchObject({
      paddingTop: 8,
      paddingBottom: 4,
    });
    expect(StyleSheet.flatten(getByTestId('bottom-drawer.handle').props.style)).toMatchObject({
      width: 64,
      height: 5,
    });
  });

  it('keeps the standard handle and rounded frame for edge-to-edge content', () => {
    const { getByTestId } = renderWithProviders(
      <BottomDrawer visible onClose={jest.fn()} contentLayout="edgeToEdge">
        <Text>Full-width conversation</Text>
      </BottomDrawer>,
    );

    expect(StyleSheet.flatten(getByTestId('bottom-drawer.surface').props.style)).toMatchObject({
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      overflow: 'hidden',
      paddingHorizontal: 0,
    });
    expect(StyleSheet.flatten(getByTestId('bottom-drawer.handle-region').props.style)).toMatchObject({
      position: 'relative',
      paddingTop: 8,
      paddingBottom: 4,
    });
  });

  it('dismisses the keyboard only when a settled drawer moves to a lower snap point', () => {
    expect(shouldDismissKeyboardOnSnapChange({ previousIndex: 1, nextIndex: 0, enabled: true })).toBe(true);
    expect(shouldDismissKeyboardOnSnapChange({ previousIndex: 0, nextIndex: 1, enabled: true })).toBe(false);
    expect(shouldDismissKeyboardOnSnapChange({ previousIndex: 1, nextIndex: 0, enabled: false })).toBe(false);
  });

  it('maps drawer expansion to a bounded reveal opacity', () => {
    expect(getBottomDrawerExpansionOpacity({ progress: 0.05, from: 0.08, to: 0.26 })).toBe(0);
    expect(getBottomDrawerExpansionOpacity({ progress: 0.17, from: 0.08, to: 0.26 })).toBeCloseTo(0.5);
    expect(getBottomDrawerExpansionOpacity({ progress: 0.4, from: 0.08, to: 0.26 })).toBe(1);
  });

  it('can preserve a subtle continuation cue and linearly reveal it on expansion', () => {
    expect(getBottomDrawerExpansionOpacity({
      progress: 0.15,
      from: 0.17,
      to: 0.34,
      minimumOpacity: 0.1,
    })).toBe(0.1);
    expect(getBottomDrawerExpansionOpacity({
      progress: 0.255,
      from: 0.17,
      to: 0.34,
      minimumOpacity: 0.1,
    })).toBeCloseTo(0.55);
    expect(getBottomDrawerExpansionOpacity({
      progress: 0.4,
      from: 0.17,
      to: 0.34,
      minimumOpacity: 0.1,
    })).toBe(1);
  });

  it('provides a safe-area-owning bottom accessory', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <BottomDrawer
        visible
        onClose={jest.fn()}
        bottomAccessory={<Text>Composer</Text>}
      >
        <Text>Conversation</Text>
      </BottomDrawer>,
    );

    expect(getByText('Conversation')).toBeTruthy();
    expect(getByText('Composer')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('bottom-drawer.bottom-accessory').props.style).paddingBottom).toBeGreaterThan(0);
  });

  it('can keep the sheet fixed while resizing its content above the keyboard', () => {
    expect(shouldBottomDrawerResizeContents('resize')).toBe(true);
    expect(shouldBottomDrawerResizeContents('lift')).toBe(false);
    expect(shouldBottomDrawerResizeContents('extend')).toBe(false);

    const { getByTestId } = renderWithProviders(
      <BottomDrawer visible onClose={jest.fn()} keyboardBehavior="resize">
        <Text>Editable content</Text>
      </BottomDrawer>,
    );

    expect(getByTestId('bottom-drawer.keyboard-resized-content')).toBeTruthy();
  });

  it('keeps a dynamically sized drawer visually hidden, touch-inert, and non-modal until measured', () => {
    const { getByTestId } = renderWithProviders(
      <BottomDrawer visible dynamicSizing snapPoints={['35%']} onClose={jest.fn()}>
        <Text>Measured content</Text>
      </BottomDrawer>,
    );

    expect(getByTestId('bottom-drawer.surface', { includeHiddenElements: true }).props).toMatchObject({
      pointerEvents: 'none',
      accessibilityViewIsModal: false,
      importantForAccessibility: 'yes',
    });

    fireEvent(getByTestId('bottom-drawer.dynamic-measurement', { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 12, width: 320, height: 220 } },
    });

    expect(getByTestId('bottom-drawer.surface').props).toMatchObject({
      pointerEvents: 'auto',
      accessibilityViewIsModal: true,
      importantForAccessibility: 'yes',
    });
  });
});
