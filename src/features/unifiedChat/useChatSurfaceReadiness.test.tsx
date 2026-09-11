import { act, renderHook } from '@testing-library/react-native';
import { useChatSurfaceReadiness } from './useChatSurfaceReadiness';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('a document that never loads reaches recovery after eight seconds', () => {
  const { result } = renderHook(() => useChatSurfaceReadiness(true));
  expect(result.current.phase).toBe('loading');
  act(() => jest.advanceTimersByTime(8000));
  expect(result.current.phase).toBe('error');
});

test('bridge ready is not rendered: only the initialized snapshot acknowledgement removes loading', () => {
  const { result } = renderHook(() => useChatSurfaceReadiness(true));
  act(() => { result.current.bridgeReady(true); result.current.initialized('snapshot-1'); });
  expect(result.current.phase).toBe('loading');
  act(() => result.current.rendered('other-snapshot'));
  expect(result.current.phase).toBe('loading');
  act(() => result.current.rendered('snapshot-1'));
  expect(result.current.phase).toBe('ready');
  act(() => jest.advanceTimersByTime(9000));
  expect(result.current.phase).toBe('ready');
});

test('legacy surfaces require both document load and initialization, with an explicit weaker receipt', () => {
  const { result } = renderHook(() => useChatSurfaceReadiness(true));
  act(() => { result.current.bridgeReady(false); result.current.initialized('legacy'); });
  expect(result.current.phase).toBe('loading');
  act(() => result.current.documentLoaded());
  expect(result.current.phase).toBe('ready');
  expect(result.current.evidence).toBe('legacy');
});

test('retry resets the deadline and ignores callbacks from the failed WebView', () => {
  const { result } = renderHook(() => useChatSurfaceReadiness(true));
  const old = result.current;
  act(() => result.current.fail('offline'));
  act(() => result.current.retry());
  act(() => { old.bridgeReady(false); old.initialized('old'); old.documentLoaded(); old.fail('old failure'); });
  expect(result.current.phase).toBe('loading');
  act(() => jest.advanceTimersByTime(7999));
  expect(result.current.phase).toBe('loading');
  act(() => jest.advanceTimersByTime(1));
  expect(result.current.phase).toBe('error');
});

test('late acknowledgement after timeout cannot hide recovery', () => {
  const { result } = renderHook(() => useChatSurfaceReadiness(true));
  act(() => { result.current.bridgeReady(true); result.current.initialized('late'); });
  act(() => jest.advanceTimersByTime(8000));
  act(() => result.current.rendered('late'));
  expect(result.current.phase).toBe('error');
});
