const mockPresent = jest.fn();
const mockAddListener = jest.fn();

jest.mock('../../modules/kwilt-share-sheet', () => ({
  __esModule: true,
  default: {
    present: (...args: unknown[]) => mockPresent(...args),
    addListener: (...args: unknown[]) => mockAddListener(...args),
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Share: { share: jest.fn() },
}));

import { Share } from 'react-native';

import { shareUrlWithPreview } from './share';

describe('shareUrlWithPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue({ remove: jest.fn() });
  });

  it('presents the native rich-preview sheet with Ask Household on iOS', async () => {
    const onAskHousehold = jest.fn();
    mockPresent.mockResolvedValue({ action: 'shared', activityType: 'com.apple.UIKit.activity.Message' });

    await shareUrlWithPreview({
      url: 'https://go.kwilt.app/meal-plan/guest-token',
      subject: 'Help choose our next meals',
      onAskHousehold,
    });

    expect(mockPresent).toHaveBeenCalledWith(
      'https://go.kwilt.app/meal-plan/guest-token',
      'Help choose our next meals',
      'Ask Household',
    );
    expect(Share.share).not.toHaveBeenCalled();
    expect(onAskHousehold).not.toHaveBeenCalled();
  });

  it('hands the custom native activity back to the Plan household picker', async () => {
    const onAskHousehold = jest.fn();
    mockPresent.mockResolvedValue({ action: 'askHousehold', activityType: 'app.kwilt.ask-household' });

    await shareUrlWithPreview({
      url: 'https://go.kwilt.app/meal-plan/guest-token',
      onAskHousehold,
    });

    expect(onAskHousehold).toHaveBeenCalledTimes(1);
  });

  it('starts the returning Plan action when native dismissal begins, before share completion', async () => {
    const onShareSheetDismissStart = jest.fn();
    const remove = jest.fn();
    let dismissListener: (() => void) | undefined;
    let resolvePresent: ((result: { action: 'dismissed'; activityType: null }) => void) | undefined;
    mockAddListener.mockImplementation((eventName: string, listener: () => void) => {
      expect(eventName).toBe('onDismissStart');
      dismissListener = listener;
      return { remove };
    });
    mockPresent.mockReturnValue(new Promise((resolve) => {
      resolvePresent = resolve;
    }));

    const sharing = shareUrlWithPreview({
      url: 'https://go.kwilt.app/meal-plan/guest-token',
      onAskHousehold: jest.fn(),
      onShareSheetDismissStart,
    });
    await Promise.resolve();

    dismissListener?.();
    expect(onShareSheetDismissStart).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();

    resolvePresent?.({ action: 'dismissed', activityType: null });
    await sharing;
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
