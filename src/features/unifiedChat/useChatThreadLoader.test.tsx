import { act, renderHook } from '@testing-library/react-native';
import { useChatThreadLoader } from './useChatThreadLoader';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('a previous chat finishing after New chat cannot restore its old receipt', async () => {
  const pending = deferred<string>();
  const onLoaded = jest.fn();
  const onError = jest.fn();
  const load = jest.fn(() => pending.promise);
  const { result, rerender } = renderHook(({ selectionKey }: { selectionKey: string }) =>
    useChatThreadLoader({ selectionKey, load, onLoaded, onError }),
  { initialProps: { selectionKey: 'old-chat' } });
  let opening!: Promise<void>;
  act(() => { opening = result.current('old-chat'); });
  rerender({ selectionKey: 'fresh' });
  await act(async () => { pending.resolve('Capture To-do completed.'); await opening; });
  expect(onLoaded).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
});

test('only the latest requested chat publishes, even when loads finish out of order', async () => {
  const old = deferred<string>();
  const load = jest.fn((id: string) => id === 'old' ? old.promise : Promise.resolve('new content'));
  const onLoaded = jest.fn();
  const onError = jest.fn();
  const { result } = renderHook(() => useChatThreadLoader({ selectionKey: 'history', load, onLoaded, onError }));
  let opening!: Promise<void>;
  act(() => { opening = result.current('old'); });
  await act(async () => { await result.current('new'); });
  await act(async () => { old.resolve('old content'); await opening; });
  expect(onLoaded.mock.calls).toEqual([['new content', 'new']]);
});

test('a superseded load failure does not show an error in the new chat', async () => {
  const pending = deferred<string>();
  const onError = jest.fn();
  const { result, unmount } = renderHook(() => useChatThreadLoader({
    selectionKey: 'old', load: () => pending.promise, onLoaded: jest.fn(), onError,
  }));
  const opening = result.current('old');
  unmount();
  await act(async () => { pending.reject(new Error('offline')); await opening; });
  expect(onError).not.toHaveBeenCalled();
});

test('a delayed history refresh cannot start opening an old chat after fresh navigation', async () => {
  const load = jest.fn().mockResolvedValue('old content');
  const onLoaded = jest.fn();
  const { result, rerender } = renderHook(({ selectionKey }: { selectionKey: string }) => useChatThreadLoader({
    selectionKey, load, onLoaded, onError: jest.fn(),
  }), { initialProps: { selectionKey: 'history' } });
  const oldOpen = result.current;
  rerender({ selectionKey: 'fresh' });
  await act(async () => { await oldOpen('old'); });
  expect(load).not.toHaveBeenCalled();
  expect(onLoaded).not.toHaveBeenCalled();
});

test('reports a load failure for the chat that is still selected', async () => {
  const onError = jest.fn();
  const { result } = renderHook(() => useChatThreadLoader({
    selectionKey: 'selected', load: async () => { throw new Error('offline'); },
    onLoaded: jest.fn(), onError,
  }));
  await act(async () => { await result.current('selected'); });
  expect(onError).toHaveBeenCalledTimes(1);
});
