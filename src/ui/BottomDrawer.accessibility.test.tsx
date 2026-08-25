import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { renderWithProviders } from '../test/renderWithProviders';
import {
  BottomDrawer,
  BottomDrawerScrollView,
  getBottomDrawerExpansionOpacity,
  isBottomDrawerAccessibilityModal,
  isBottomDrawerHandleTouchY,
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

  it('separates the lowered handle from the preserved content offset', () => {
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
      position: 'relative',
      top: 4,
      width: 64,
      height: 5,
    });
  });

  it('accepts drawer pans from the full 44-point top-edge touch target', () => {
    expect(isBottomDrawerHandleTouchY(0)).toBe(true);
    expect(isBottomDrawerHandleTouchY(17)).toBe(true);
    expect(isBottomDrawerHandleTouchY(44)).toBe(true);
    expect(isBottomDrawerHandleTouchY(44.01)).toBe(false);
    expect(isBottomDrawerHandleTouchY(-0.01)).toBe(false);
  });

  it('uses one absolute pan owner for the handle and expanded top-edge target', () => {
    const { getByTestId, UNSAFE_getAllByType } = renderWithProviders(
      <BottomDrawer visible onClose={jest.fn()}>
        <Text>Standard drawer</Text>
      </BottomDrawer>,
    );

    expect(UNSAFE_getAllByType(GestureDetector)).toHaveLength(1);
    const touchTarget = getByTestId('bottom-drawer.handle-touch-target');
    expect(StyleSheet.flatten(touchTarget.props.style)).toMatchObject({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 44,
      zIndex: 2,
    });
    expect(touchTarget.props.pointerEvents).toBe('box-only');
  });

  it('keeps the absolute top-edge target outside the drawer scroll gesture', () => {
    const { getByTestId, UNSAFE_getAllByType } = renderWithProviders(
      <BottomDrawer visible enableContentPanningGesture onClose={jest.fn()}>
        <BottomDrawerScrollView>
          <Text>Scrollable drawer</Text>
        </BottomDrawerScrollView>
      </BottomDrawer>,
    );

    const detectors = UNSAFE_getAllByType(GestureDetector);
    expect(detectors).toHaveLength(3);
    const topEdgeDetector = detectors.find(
      (detector) => detector.props.children.props.testID === 'bottom-drawer.handle-touch-target',
    );
    expect(topEdgeDetector).toBeDefined();
    expect(topEdgeDetector?.props.gesture.toGestureArray()[0]?.config.simultaneousWith ?? [])
      .toHaveLength(0);
    const surfaceDetector = detectors.find(
      (detector) => detector.props.children.props.testID === 'bottom-drawer.surface',
    );
    expect(surfaceDetector).toBeDefined();
    expect(getByTestId('bottom-drawer.handle-touch-target')).toBeTruthy();
  });

  it('moves the handle allowance into scroll content so rows can reach the sheet edge', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <BottomDrawer visible onClose={jest.fn()}>
        <BottomDrawerScrollView
          testID="drawer-scroll"
          contentContainerStyle={{ paddingTop: 6 }}
        >
          <Text>Scrollable drawer</Text>
        </BottomDrawerScrollView>
      </BottomDrawer>,
    );

    expect(queryByTestId('bottom-drawer.handle-layout-spacer', { includeHiddenElements: true }))
      .toBeNull();
    expect(StyleSheet.flatten(getByTestId('drawer-scroll').props.contentContainerStyle))
      .toMatchObject({ paddingTop: 23 });
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

  it('owns a semantic horizontal footer with the primary action on the right', () => {
    const onDelete = jest.fn();
    const onSave = jest.fn();
    const { getByTestId, getByText } = renderWithProviders(
      <BottomDrawer
        visible
        onClose={jest.fn()}
        footer={{
          secondaryAction: {
            label: 'Delete',
            onPress: onDelete,
            tone: 'destructive',
          },
          primaryAction: {
            label: 'Save chore',
            onPress: onSave,
          },
        }}
      >
        <Text>Chore form</Text>
      </BottomDrawer>,
    );

    const rowChildren = getByTestId('bottom-drawer.semantic-footer.actions').children;
    expect(rowChildren).toHaveLength(2);
    expect(getByText('Delete')).toBeTruthy();
    expect(getByText('Save chore')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('bottom-drawer.semantic-footer.actions').props.style)).toMatchObject({
      flexDirection: 'row',
      justifyContent: 'flex-end',
    });
    expect(StyleSheet.flatten(getByTestId('bottom-drawer.footer').props.style)).toMatchObject({
      marginHorizontal: -16,
      paddingHorizontal: 24,
      shadowColor: '#0F172A',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: -4 },
      shadowRadius: 12,
      elevation: 2,
    });

    fireEvent.press(getByText('Delete'));
    fireEvent.press(getByText('Save chore'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('floats a drawer action dock over content with equal corner nesting', () => {
    const { getByTestId } = renderWithProviders(
      <BottomDrawer
        visible
        onClose={jest.fn()}
        contentLayout="edgeToEdge"
        actionDock={<Text>View groceries</Text>}
      >
        <Text>Meal plan</Text>
      </BottomDrawer>,
    );

    const dockStyle = StyleSheet.flatten(getByTestId('bottom-drawer.action-dock').props.style);
    expect(dockStyle).toMatchObject({
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 32,
      paddingHorizontal: 32,
    });
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
