import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { Animated, StyleSheet } from 'react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { HapticsService } from '../../services/HapticsService';
import { InventoryDockAffordances } from './InventoryDockAffordances';

jest.mock('../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));

describe('InventoryDockAffordances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps Search available and reveals scroll to top only when requested', () => {
    const onSearchPress = jest.fn();
    const onChatPress = jest.fn();
    const onScrollToTopPress = jest.fn();
    const { getByLabelText, queryByLabelText, rerender } = renderWithProviders(
      <InventoryDockAffordances
        bottomOffsetPx={32}
        rightInsetPx={32}
        showScrollToTop={false}
        onSearchPress={onSearchPress}
        onChatPress={onChatPress}
        onScrollToTopPress={onScrollToTopPress}
      />,
    );

    fireEvent.press(getByLabelText('Search To-dos'));
    fireEvent.press(getByLabelText('Chat about to-dos'));
    expect(onSearchPress).toHaveBeenCalledTimes(1);
    expect(onChatPress).toHaveBeenCalledTimes(1);
    expect(queryByLabelText('Scroll to top')).toBeNull();

    rerender(
      <InventoryDockAffordances
        bottomOffsetPx={32}
        rightInsetPx={32}
        showScrollToTop
        onSearchPress={onSearchPress}
        onChatPress={onChatPress}
        onScrollToTopPress={onScrollToTopPress}
      />,
    );

    const scrollToTopButton = getByLabelText('Scroll to top');
    fireEvent.press(scrollToTopButton);
    expect(onScrollToTopPress).toHaveBeenCalledTimes(1);
    expect(scrollToTopButton.props.accessible).toBe(false);
    expect(HapticsService.trigger).toHaveBeenNthCalledWith(1, 'canvas.selection');
    expect(HapticsService.trigger).toHaveBeenNthCalledWith(2, 'canvas.selection');
    expect(HapticsService.trigger).toHaveBeenNthCalledWith(3, 'canvas.selection');
  });

  it('centers a smaller scroll-to-top surface above the full dock row', () => {
    const { getByTestId } = renderWithProviders(
      <InventoryDockAffordances
        bottomOffsetPx={32}
        rightInsetPx={32}
        showScrollToTop
        onSearchPress={jest.fn()}
        onChatPress={jest.fn()}
        onScrollToTopPress={jest.fn()}
      />,
    );

    expect(StyleSheet.flatten(getByTestId('inventory-dock-affordances').props.style)).toMatchObject({
      left: 0,
      right: 0,
    });
    expect(
      StyleSheet.flatten(getByTestId('e2e.activities.scrollToTop.positioner').props.style),
    ).toMatchObject({
      left: '50%',
      marginLeft: -24,
      width: 48,
      height: 48,
    });
    expect(
      StyleSheet.flatten(getByTestId('e2e.activities.scrollToTop.positioner').props.style).transform,
    ).toHaveLength(2);
    expect(
      StyleSheet.flatten(getByTestId('e2e.activities.scrollToTop.surface').props.style),
    ).toMatchObject({
      width: 40,
      height: 40,
    });
  });

  it('stays dismissed after acknowledgement until visibility resets', () => {
    jest.useFakeTimers();
    const props = {
      bottomOffsetPx: 32,
      rightInsetPx: 32,
      onSearchPress: jest.fn(),
      onChatPress: jest.fn(),
      onScrollToTopPress: jest.fn(),
    };
    const { getByLabelText, queryByLabelText, rerender } = renderWithProviders(
      <InventoryDockAffordances {...props} showScrollToTop />,
    );

    fireEvent.press(getByLabelText('Scroll to top'));
    act(() => jest.advanceTimersByTime(300));
    expect(queryByLabelText('Scroll to top')).toBeNull();

    rerender(<InventoryDockAffordances {...props} showScrollToTop={false} />);
    rerender(<InventoryDockAffordances {...props} showScrollToTop />);
    expect(getByLabelText('Scroll to top')).toBeTruthy();

    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('dismisses toward the same small, lower anchor used by its entrance', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    const { getByLabelText } = renderWithProviders(
      <InventoryDockAffordances
        bottomOffsetPx={32}
        rightInsetPx={32}
        showScrollToTop
        onSearchPress={jest.fn()}
        onChatPress={jest.fn()}
        onScrollToTopPress={jest.fn()}
      />,
    );

    fireEvent.press(getByLabelText('Scroll to top'));

    expect(timingSpy.mock.calls.slice(-4).map(([, config]) => config.toValue)).toEqual([
      1.08,
      0.68,
      0,
      10,
    ]);
    timingSpy.mockRestore();
  });

  it('skips custom entrance and exit motion when Reduce Motion is enabled', () => {
    const { getByLabelText, getByTestId, queryByLabelText } = renderWithProviders(
      <InventoryDockAffordances
        bottomOffsetPx={32}
        rightInsetPx={32}
        showScrollToTop
        reduceMotionOverride
        onSearchPress={jest.fn()}
        onChatPress={jest.fn()}
        onScrollToTopPress={jest.fn()}
      />,
    );

    const positionerStyle = StyleSheet.flatten(
      getByTestId('e2e.activities.scrollToTop.positioner').props.style,
    );
    expect(positionerStyle.opacity).toBe(1);
    expect(positionerStyle.transform[0].translateY).toBe(0);
    expect(positionerStyle.transform[1].scale).toBe(1);

    fireEvent.press(getByLabelText('Scroll to top'));
    expect(queryByLabelText('Scroll to top')).toBeNull();
  });
});
