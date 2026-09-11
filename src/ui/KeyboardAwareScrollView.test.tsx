import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as RN from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewHandle } from './KeyboardAwareScrollView';

const mockScrollTo = jest.fn();
const mockNativeReveal = jest.fn();
const mockHost = { scrollTo: mockScrollTo, scrollResponderScrollNativeHandleToKeyboard: mockNativeReveal };

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const React = require('react');
  const descriptors = Object.getOwnPropertyDescriptors(actual);
  delete descriptors.ScrollView;
  delete descriptors.UIManager;
  delete descriptors.findNodeHandle;
  const mocked = Object.defineProperties({}, descriptors);
  Object.defineProperty(mocked, 'findNodeHandle', { enumerable: true, value: jest.fn() });
  Object.defineProperty(mocked, 'UIManager', { enumerable: true, value: { measureLayout: jest.fn(), measureInWindow: jest.fn() } });
  Object.defineProperty(mocked, 'ScrollView', { enumerable: true, value: React.forwardRef((props: object, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => mockHost);
      return React.createElement(actual.View, props);
    }) });
  return mocked;
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

describe('KeyboardAwareScrollView reveal', () => {
  let events: Record<string, (event?: unknown) => void>;
  let focused: number | null;
  let fieldY: number;
  let deferred: (() => void) | undefined;
  let delayField: boolean;
  let delayHost: boolean;

  beforeEach(() => {
    jest.useFakeTimers();
    events = {};
    focused = 2;
    fieldY = 250;
    delayField = false;
    delayHost = false;
    deferred = undefined;
    mockScrollTo.mockClear();
    mockNativeReveal.mockClear();
    const addListener = RN.Keyboard.addListener.bind(RN.Keyboard);
    jest.spyOn(RN.Keyboard, 'addListener').mockImplementation((name, callback) => {
      events[name] = (event) => callback(event as RN.KeyboardEvent);
      return addListener(name, callback);
    });
    jest.spyOn(RN.TextInput.State, 'currentlyFocusedInput').mockImplementation(() => focused as any);
    jest.spyOn(RN, 'findNodeHandle').mockImplementation((node) => node === mockHost as any ? 1 : node as number);
    jest.spyOn(RN.UIManager, 'measureLayout').mockImplementation((_node, _relative, _failure, success) => success(0, 0, 300, 80));
    jest.spyOn(RN.UIManager, 'measureInWindow').mockImplementation((node, callback) => {
      const done = () => node === 1 ? callback(0, 200, 320, 500) : callback(0, fieldY, 300, 80);
      if ((node !== 1 && delayField) || (node === 1 && delayHost)) deferred = done;
      else done();
    });
  });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  async function setup(occludedTopHeight = 0) {
    const ref = React.createRef<KeyboardAwareScrollViewHandle>();
    const view = render(<KeyboardAwareScrollView ref={ref} testID="host" occludedTopHeight={occludedTopHeight} />);
    fireEvent.scroll(view.getByTestId('host'), { nativeEvent: { contentOffset: { x: 0, y: 100 } } });
    await act(async () => { events.keyboardDidShow({ endCoordinates: { screenY: 600, height: 300 } }); });
    await act(async () => { jest.runOnlyPendingTimers(); });
    return { ref, ...view };
  }

  it('keeps a fully visible field stationary', async () => {
    await setup();
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('reveals an autofocus field when mounted after the keyboard is already open', async () => {
    fieldY = 580;
    jest.spyOn(RN.Keyboard, 'metrics').mockReturnValue({ screenX: 0, screenY: 600, width: 390, height: 300 });
    render(<KeyboardAwareScrollView testID="host" />);
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 76, animated: true });
  });

  it('minimally reveals a field clipped above the host', async () => {
    fieldY = 180;
    await setup();
    expect(mockScrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: 64 }));
  });

  it('reveals a fitting field hidden by a fixed header inside the host bounds', async () => {
    fieldY = 250;
    await setup(80);
    expect(mockScrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: 54 }));
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('minimally reveals a field covered by the keyboard using current geometry', async () => {
    fieldY = 580;
    await setup();
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 176, animated: true });
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('does not scroll for a focused field in another modal', async () => {
    fieldY = 580;
    jest.mocked(RN.UIManager.measureLayout).mockImplementation((_node, _relative, failure) => failure());
    await setup();
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('does not apply a pending reveal after deliberate parent scrolling', async () => {
    fieldY = 580;
    delayField = true;
    const view = await setup();
    fireEvent(view.getByTestId('host'), 'scrollBeginDrag', { nativeEvent: { contentOffset: { x: 0, y: 100 } } });
    fireEvent.scroll(view.getByTestId('host'), { nativeEvent: { contentOffset: { x: 0, y: 160 } } });
    await act(async () => deferred?.());
    expect(mockNativeReveal).not.toHaveBeenCalled();
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('allows the next focused field to reveal while the previous automatic scroll settles', async () => {
    fieldY = 180;
    const view = await setup();
    expect(mockScrollTo).toHaveBeenCalledTimes(1);
    focused = 3;
    fieldY = 580;
    delayField = true;
    await act(async () => view.ref.current?.scrollToFocusedInput());
    expect(deferred).toBeDefined();
    fireEvent.scroll(view.getByTestId('host'), { nativeEvent: { contentOffset: { x: 0, y: 70 } } });
    await act(async () => deferred?.());
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 146, animated: true });
  });

  it('ignores an old field measurement after focus changes', async () => {
    fieldY = 580;
    delayField = true;
    await setup();
    expect(deferred).toBeDefined();
    focused = 3;
    await act(async () => deferred?.());
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('ignores a pending reveal after the keyboard dismisses', async () => {
    fieldY = 580;
    delayField = true;
    await setup();
    await act(async () => { events.keyboardDidHide(); deferred?.(); });
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('reveals again when an already-open keyboard changes its visible height', async () => {
    fieldY = 450;
    await setup();
    expect(mockNativeReveal).not.toHaveBeenCalled();
    await act(async () => {
      events.keyboardDidChangeFrame?.({ endCoordinates: { screenY: 500, height: 400 } });
    });
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 146, animated: true });
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('tracks keyboard movement even when its height stays the same', async () => {
    fieldY = 450;
    await setup();
    await act(async () => {
      events.keyboardDidChangeFrame({ endCoordinates: { screenY: 500, height: 300 } });
    });
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 146, animated: true });
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('keeps revealing the registered field frame as the keyboard grows, until focus changes', async () => {
    const view = await setup();
    await act(async () => view.ref.current?.scrollToNodeHandle(9));
    jest.mocked(RN.UIManager.measureInWindow).mockClear();
    await act(async () => events.keyboardDidChangeFrame({ endCoordinates: { screenY: 500, height: 400 } }));
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(RN.UIManager.measureInWindow).toHaveBeenCalledWith(9, expect.any(Function));
    focused = 3;
    jest.mocked(RN.UIManager.measureInWindow).mockClear();
    await act(async () => view.ref.current?.scrollToFocusedInput());
    expect(RN.UIManager.measureInWindow).toHaveBeenCalledWith(3, expect.any(Function));
    expect(RN.UIManager.measureInWindow).not.toHaveBeenCalledWith(9, expect.any(Function));
  });

  it('uses a coherent field position and offset while a previous animation settles', async () => {
    fieldY = 580;
    delayHost = true;
    const view = await setup();
    // The same content moves down 30pt as the scroll offset moves up 30pt.
    fieldY = 610;
    fireEvent.scroll(view.getByTestId('host'), { nativeEvent: { contentOffset: { x: 0, y: 70 } } });
    await act(async () => deferred?.());
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 176, animated: true });
  });

  it('does not restart reveal for a frame event after keyboard dismissal', async () => {
    const view = await setup();
    await act(async () => { events.keyboardDidHide(); });
    fieldY = 580;
    await act(async () => {
      events.keyboardDidChangeFrame({ endCoordinates: { screenY: 500, height: 400 } });
      view.ref.current?.scrollToFocusedInput();
    });
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(mockNativeReveal).not.toHaveBeenCalled();
  });

  it('honors a composite controls explicit reveal target over its inner input frame', async () => {
    const view = await setup();
    view.ref.current?.setNextRevealTarget(10);
    await act(async () => view.ref.current?.scrollToNodeHandle(9));
    jest.mocked(RN.UIManager.measureInWindow).mockClear();
    await act(async () => events.keyboardDidShow({ endCoordinates: { screenY: 500, height: 400 } }));
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(RN.UIManager.measureInWindow).toHaveBeenCalledWith(10, expect.any(Function));
    expect(RN.UIManager.measureInWindow).not.toHaveBeenCalledWith(9, expect.any(Function));
  });
});
