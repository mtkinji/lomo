import { act, render, renderHook } from '@testing-library/react-native';
import { Animated, View } from 'react-native';

import { KwiltLoader } from './KwiltLoader';
import {
  KWILT_REFRESH_LOADING_CYCLE_MS,
  KwiltRefreshFrame,
  useKwiltRefresh,
} from './KwiltRefresh';

describe('useKwiltRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the branded overlay active after the pulled content returns to rest', async () => {
    let finishRefresh: (() => void) | undefined;
    const onRefresh = jest.fn(() => new Promise<void>((resolve) => {
      finishRefresh = resolve;
    }));
    const scrollY = new Animated.Value(0);
    const { result } = renderHook(() => useKwiltRefresh({ onRefresh, scrollY }));

    expect(result.current.refreshOverlay.props.testID).toBe('kwilt-refresh-overlay');
    const [pullLayerAtRest, activeLayerAtRest] = result.current.refreshOverlay.props.children;
    expect(pullLayerAtRest.props.testID).toBe('kwilt-refresh-pull');
    expect(pullLayerAtRest.props.children.props.phase).toBe('idle');
    expect(activeLayerAtRest).toBeNull();

    act(() => {
      result.current.refreshControl.props.onRefresh();
      scrollY.setValue(0);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.refreshControl.props.refreshing).toBe(true);
    const [pullLayerWhileLoading, activeLayerWhileLoading] = result.current.refreshOverlay.props.children;
    expect(pullLayerWhileLoading).toBeNull();
    expect(activeLayerWhileLoading.props.testID).toBe('kwilt-refresh-active');
    expect(activeLayerWhileLoading.props.children.type).toBe(KwiltLoader);
    expect(activeLayerWhileLoading.props.children.props.phase).toBe('loading');

    await act(async () => {
      finishRefresh?.();
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(940);
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(440);
      await Promise.resolve();
    });

    expect(result.current.refreshControl.props.refreshing).toBe(false);
    const [, activeLayerAfterRefresh] = result.current.refreshOverlay.props.children;
    expect(activeLayerAfterRefresh).toBeNull();
  });

  it('completes and restarts the animation after two seconds while one refresh remains pending', async () => {
    let finishRefresh: (() => void) | undefined;
    const onRefresh = jest.fn(() => new Promise<void>((resolve) => {
      finishRefresh = resolve;
    }));
    const { result } = renderHook(() => useKwiltRefresh({ onRefresh }));

    act(() => {
      result.current.refreshControl.props.onRefresh();
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(KWILT_REFRESH_LOADING_CYCLE_MS - 1);
    });
    expect(result.current.refreshOverlay.props.children[1].props.children.props.phase).toBe('loading');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.current.refreshOverlay.props.children[1].props.children.props.phase).toBe('completing');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(440);
    });
    expect(result.current.refreshOverlay.props.children[1].props.children.props.phase).toBe('loading');
    expect(result.current.refreshControl.props.refreshing).toBe(true);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishRefresh?.();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(940);
      await jest.advanceTimersByTimeAsync(440);
    });

    expect(result.current.refreshControl.props.refreshing).toBe(false);
    expect(result.current.refreshOverlay.props.children[1]).toBeNull();
  });

  it('gives the refresh stage more room without resizing native layout or drawing corner masks', () => {
    const scrollY = new Animated.Value(-120);
    const { result } = renderHook(() => useKwiltRefresh({
      backgroundColor: '#FAF7ED',
      onRefresh: jest.fn(),
      overlayTopOffset: 40,
      scrollY,
    }));

    expect(result.current.refreshControl.props.style).toBeUndefined();
    expect(result.current.refreshOverlay.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ height: 136 }),
    ]));

    expect(result.current.refreshOverlay.props.children).toHaveLength(2);
    expect(result.current).not.toHaveProperty('refreshHeaderStyle');
  });

  it('keeps the branded refresh field behind the moving page', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    const { rerender, toJSON } = render(
      <KwiltRefreshFrame
        refreshOverlay={<View testID="refresh-field" />}
        refreshing={false}
      >
        <View testID="page" />
      </KwiltRefreshFrame>,
    );
    const frame = toJSON();

    expect(frame).not.toBeNull();
    expect(Array.isArray(frame) ? frame : frame?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ props: expect.objectContaining({ testID: 'refresh-field' }) }),
      expect.objectContaining({ props: expect.objectContaining({ testID: 'kwilt-refresh-foreground' }) }),
    ]));
    expect(timingSpy).not.toHaveBeenCalled();

    rerender(
      <KwiltRefreshFrame
        refreshOverlay={<View testID="refresh-field" />}
        refreshing
      >
        <View testID="page" />
      </KwiltRefreshFrame>,
    );
    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 96 }),
    );
    timingSpy.mockRestore();
  });
});
