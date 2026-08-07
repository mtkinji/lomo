import { fireEvent, render } from '@testing-library/react-native';

import { CookStepMedia } from './CookStepMedia';

jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({}),
  VideoView: ({ accessibilityLabel }: { accessibilityLabel: string }) =>
    require('react').createElement(require('react-native').View, { accessibilityLabel }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const imageMedia = {
  assetId: 'media-step-1',
  storageRef: 'https://example.com/step.jpg',
  mediaType: 'image/jpeg',
  altText: 'Batter forming open bubbles on the griddle',
};

describe('CookStepMedia', () => {
  it('renders nothing when a step has no linked media', () => {
    expect(render(<CookStepMedia media={null} />).toJSON()).toBeNull();
  });

  it('renders a linked step image with its description', () => {
    const screen = render(<CookStepMedia media={imageMedia} />);
    expect(screen.getByLabelText(`${imageMedia.altText}. Open full screen`)).toBeTruthy();
  });

  it('opens and closes a linked image without losing the cook session', () => {
    const onFullscreenEnter = jest.fn();
    const onFullscreenExit = jest.fn();
    const screen = render(<CookStepMedia media={imageMedia} onFullscreenEnter={onFullscreenEnter} onFullscreenExit={onFullscreenExit} />);

    fireEvent.press(screen.getByLabelText(`${imageMedia.altText}. Open full screen`));
    expect(onFullscreenEnter).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Close full-screen photo'));
    expect(onFullscreenExit).toHaveBeenCalledTimes(1);
  });

  it('keeps step media out of the layout until the cook asks to see it', () => {
    const screen = render(<CookStepMedia media={imageMedia} display="trigger" />);

    expect(screen.queryByLabelText(`${imageMedia.altText}. Open full screen`)).toBeNull();
    fireEvent.press(screen.getByText('Show photo'));
    expect(screen.getByLabelText('Close full-screen photo')).toBeTruthy();
  });

  it('renders a linked step video as a full-screen affordance', () => {
    const screen = render(<CookStepMedia media={{
      ...imageMedia,
      storageRef: 'https://example.com/step.mp4',
      mediaType: 'video/mp4',
      altText: 'How to fold pancake batter',
    }} />);
    expect(screen.getByLabelText('How to fold pancake batter. Play full screen')).toBeTruthy();
  });

  it('omits an unresolved private storage reference without a failure placeholder', () => {
    expect(render(<CookStepMedia media={{
      ...imageMedia,
      storageRef: 'recipe-media/person/step.jpg',
    }} />).toJSON()).toBeNull();
  });
});
