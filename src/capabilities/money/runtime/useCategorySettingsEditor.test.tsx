import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { MoneyCategory } from '../data/moneySnapshot';
import type { CategorySettingsRequest } from '../domain/categorySettingsCommand';
import { useCategorySettingsEditor } from './useCategorySettingsEditor';
const category = { sourceId: 'category', name: 'Original', categoryUpdatedAt: 'old', planUpdatedAt: 'old' } as MoneyCategory;
const request = { actorUserId: 'actor', categoryId: 'category', requestId: 'request', settings: { name: 'Draft' } } as CategorySettingsRequest;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
function setup(overrides = {}) {
  return { open: true, actorUserId: 'actor', category, loadPending: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({ outcome: 'confirmed', receipt: {} }), onReady: jest.fn(), ...overrides };
}
describe('category settings editor lifecycle', () => {
  it('waits for recovery and captures original versions despite background snapshots', async () => {
    const pending = deferred<CategorySettingsRequest | null>(); const input = setup({ loadPending: jest.fn(() => pending.promise) });
    const { result, rerender } = renderHook((props: ReturnType<typeof setup>) => useCategorySettingsEditor(props), { initialProps: input });
    const prepare = jest.fn().mockResolvedValue(request);
    await act(async () => { await result.current.submit(prepare); });
    expect(prepare).not.toHaveBeenCalled();
    rerender({ ...input, category: { ...category, name: 'Newer', planUpdatedAt: 'new' } });
    await act(async () => pending.resolve(null));
    await act(async () => { await result.current.submit(prepare); });
    expect(prepare).toHaveBeenCalledWith(category, 'actor');
  });
  it('locks the entire preview and save and ignores a second tap', async () => {
    const preview = deferred<CategorySettingsRequest>(); const input = setup();
    const { result } = renderHook(() => useCategorySettingsEditor(input));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    const prepare = jest.fn(() => preview.promise); let first!: Promise<unknown>;
    act(() => { first = result.current.submit(prepare); });
    expect(result.current.phase).toBe('saving');
    await act(async () => { await result.current.submit(prepare); });
    expect(prepare).toHaveBeenCalledTimes(1);
    await act(async () => { preview.resolve(request); await first; });
    expect(input.save).toHaveBeenCalledTimes(1);
  });
  it('restores and retries the exact pending request without rebuilding its preview', async () => {
    const input = setup({ loadPending: jest.fn().mockResolvedValue(request) });
    const { result } = renderHook(() => useCategorySettingsEditor(input));
    await waitFor(() => expect(result.current.pending).toEqual(request));
    expect(input.onReady).toHaveBeenCalledWith(category, request);
    const prepare = jest.fn();
    await act(async () => { await result.current.submit(prepare); });
    expect(prepare).not.toHaveBeenCalled(); expect(input.save).toHaveBeenCalledWith(request);
  });
  it('keeps an unknown request frozen but releases a rejected request for correction', async () => {
    const input = setup({ save: jest.fn().mockResolvedValueOnce({ outcome: 'unknown', message: 'Check save' })
      .mockResolvedValueOnce({ outcome: 'rejected', message: 'Stale category' }) });
    const { result } = renderHook(() => useCategorySettingsEditor(input));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(async () => { await result.current.submit(async () => request); });
    expect(result.current.pending).toEqual(request); expect(result.current.error).toBe('Check save');
    await act(async () => { await result.current.submit(jest.fn()); });
    expect(result.current.pending).toBeNull(); expect(result.current.error).toBe('Stale category');
    expect(result.current.phase).toBe('ready');
  });
  it('preserves validation failures as editable errors without sending', async () => {
    const input = setup(); const { result } = renderHook(() => useCategorySettingsEditor(input));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    await act(async () => { await result.current.submit(async () => { throw new Error('Enter an amount'); }); });
    expect(result.current.error).toBe('Enter an amount'); expect(result.current.pending).toBeNull();
    expect(input.save).not.toHaveBeenCalled();
  });
  it('cancels preparation after an account change and ignores an old recovery response', async () => {
    const prepared = deferred<CategorySettingsRequest>(); const input = setup();
    const { result, rerender } = renderHook((props: ReturnType<typeof setup>) => useCategorySettingsEditor(props), { initialProps: input });
    await waitFor(() => expect(result.current.phase).toBe('ready')); let first!: Promise<unknown>;
    act(() => { first = result.current.submit(() => prepared.promise); });
    rerender({ ...input, actorUserId: 'other' });
    await act(async () => { prepared.resolve(request); await first; });
    expect(input.save).not.toHaveBeenCalled();
  });
  it('requires recovery-read retry instead of allowing a new request over unreadable pending work', async () => {
    const input = setup({ loadPending: jest.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValue(null) });
    const { result } = renderHook(() => useCategorySettingsEditor(input));
    await waitFor(() => expect(result.current.phase).toBe('load_error'));
    const prepare = jest.fn(); await act(async () => { await result.current.submit(prepare); });
    expect(prepare).not.toHaveBeenCalled();
    act(() => result.current.retryLoad()); await waitFor(() => expect(result.current.phase).toBe('ready'));
  });
});
