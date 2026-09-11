import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useChatDictation, toChatDictationWireState } from './useChatDictation';
import * as audio from './unifiedChatVoice';

jest.mock('./unifiedChatVoice', () => ({
  startUnifiedChatVoiceRecording: jest.fn(async () => undefined),
  stopAndTranscribeUnifiedChatVoice: jest.fn(),
  transcribeUnifiedChatVoiceClip: jest.fn(),
  cancelUnifiedChatVoiceRecording: jest.fn(async () => undefined),
  discardUnifiedChatVoiceClip: jest.fn(),
}));
const insertion = { prompt: 'typed draft', selectionStart: 5, selectionEnd: 5 };
const stop = audio.stopAndTranscribeUnifiedChatVoice as jest.Mock;
function deferred() { let resolve!: (text: string) => void; return { promise: new Promise<string>(r => { resolve = r; }), resolve }; }
beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() })); });
afterEach(() => jest.useRealTimers());

test('duplicate Stop sends one request and a cancelled completion cannot insert text', async () => {
  const pending = deferred(); stop.mockReturnValue(pending.promise);
  const onTranscript = jest.fn(); const onState = jest.fn();
  const { result } = renderHook(() => useChatDictation({ selectionKey: 'one', onState, onTranscript }));
  await act(async () => result.current.start(insertion));
  let stopping!: Promise<void>;
  act(() => { stopping = result.current.stop(); void result.current.stop(); });
  expect(stop).toHaveBeenCalledTimes(1);
  act(() => result.current.cancel());
  await act(async () => { pending.resolve('late text'); await stopping; });
  expect(onTranscript).not.toHaveBeenCalled();
  expect(onState.mock.calls.at(-1)[0].state).toBe('idle');
});

test('changing chat while transcribing ignores the old result', async () => {
  const pending = deferred(); stop.mockReturnValue(pending.promise);
  const onTranscript = jest.fn();
  const onState = jest.fn();
  const { result, rerender } = renderHook(({ key }: { key: string }) => useChatDictation({ selectionKey: key, onState, onTranscript }), { initialProps: { key: 'one' } });
  await act(async () => result.current.start(insertion));
  let stopping!: Promise<void>; act(() => { stopping = result.current.stop(); });
  rerender({ key: 'two' });
  expect(onState.mock.calls.at(-1)[0].state).toBe('idle');
  await act(async () => { pending.resolve('old chat text'); await stopping; });
  expect(onTranscript).not.toHaveBeenCalled();
});

test('retry reuses the stopped clip once and deletes it on success', async () => {
  const clip = { uri: 'file:///private-recording.m4a' };
  stop.mockImplementation(async options => { options.onClip(clip); throw new Error('offline'); });
  (audio.transcribeUnifiedChatVoiceClip as jest.Mock).mockResolvedValue('recovered');
  const onTranscript = jest.fn(); const onState = jest.fn();
  const { result } = renderHook(() => useChatDictation({ selectionKey: 'one', onState, onTranscript }));
  await act(async () => result.current.start(insertion));
  await act(async () => result.current.stop());
  expect(onState.mock.calls.at(-1)[0].canRetry).toBe(true);
  await act(async () => result.current.retry());
  expect(audio.transcribeUnifiedChatVoiceClip).toHaveBeenCalledWith(clip, expect.any(Object));
  expect(onTranscript).toHaveBeenCalledWith('recovered', insertion);
  expect(audio.discardUnifiedChatVoiceClip).toHaveBeenCalledWith(clip);
});

test('unmount discards a retained recording and cancels the operation', async () => {
  const clip = { uri: 'file:///private-recording.m4a' };
  stop.mockImplementation(async options => { options.onClip(clip); throw new Error('offline'); });
  const { result, unmount } = renderHook(() => useChatDictation({ selectionKey: 'one', onState: jest.fn(), onTranscript: jest.fn() }));
  await act(async () => result.current.start(insertion));
  await act(async () => result.current.stop());
  unmount();
  expect(audio.discardUnifiedChatVoiceClip).toHaveBeenCalledWith(clip);
});

test('background cancellation is explicit and an idle dictation hook leaves conversation state alone', async () => {
  let change!: (next: AppStateStatus) => void;
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    change = callback; return { remove: jest.fn() };
  });
  const onState = jest.fn();
  const { result, unmount } = renderHook(() => useChatDictation({ selectionKey: 'one', onState, onTranscript: jest.fn() }));
  onState.mockClear();
  act(() => change('background'));
  expect(onState).not.toHaveBeenCalled();
  await act(async () => result.current.start(insertion));
  act(() => change('background'));
  expect(onState.mock.calls.at(-1)[0]).toMatchObject({ state: 'idle', outcome: 'cancelled' });
  unmount(); listener.mockRestore();
});

test('a retained retry clip expires after five minutes', async () => {
  const clip = { uri: 'file:///retry.m4a' };
  stop.mockImplementation(async options => { options.onClip(clip); throw new Error('offline'); });
  const onState = jest.fn();
  const { result } = renderHook(() => useChatDictation({ selectionKey: 'one', onState, onTranscript: jest.fn() }));
  await act(async () => result.current.start(insertion));
  await act(async () => result.current.stop());
  act(() => jest.advanceTimersByTime(300000));
  expect(audio.discardUnifiedChatVoiceClip).toHaveBeenCalledWith(clip);
  expect(onState.mock.calls.at(-1)[0].canRetry).toBe(false);
});

test('cancel uses a legacy-safe wire transition that cannot trigger automatic Send', () => {
  expect(toChatDictationWireState({ kind: 'dictation', state: 'idle', outcome: 'cancelled', elapsedSeconds: 0, levels: [] }, 'transcribing').state).toBe('error');
});
