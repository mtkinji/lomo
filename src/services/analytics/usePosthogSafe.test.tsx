import { renderHook } from '@testing-library/react-native';
import { usePostHogSafe } from './usePosthogSafe';

describe('usePostHogSafe', () => {
  it('stays quiet when analytics is intentionally disabled', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => usePostHogSafe());

    expect(result.current).toBeUndefined();
    expect(error).not.toHaveBeenCalledWith(
      expect.stringContaining('usePostHog was called without a PostHog client'),
    );
    error.mockRestore();
  });
});
