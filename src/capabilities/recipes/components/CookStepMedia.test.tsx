import { render } from '@testing-library/react-native';

import { CookStepMedia } from './CookStepMedia';

jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({}),
  VideoView: ({ accessibilityLabel }: { accessibilityLabel: string }) =>
    require('react').createElement(require('react-native').View, { accessibilityLabel }),
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
    expect(screen.getByLabelText(imageMedia.altText)).toBeTruthy();
  });

  it('renders a linked step video with native controls', () => {
    const screen = render(<CookStepMedia media={{
      ...imageMedia,
      storageRef: 'https://example.com/step.mp4',
      mediaType: 'video/mp4',
      altText: 'How to fold pancake batter',
    }} />);
    expect(screen.getByLabelText('How to fold pancake batter')).toBeTruthy();
  });

  it('omits an unresolved private storage reference without a failure placeholder', () => {
    expect(render(<CookStepMedia media={{
      ...imageMedia,
      storageRef: 'recipe-media/person/step.jpg',
    }} />).toJSON()).toBeNull();
  });
});
