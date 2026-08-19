import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderWithProviders } from '../../../test/renderWithProviders';
import { IconButton } from '../../../ui/Button';
import { ChoreEvidencePhoto } from './ChoreEvidencePhoto';

describe('ChoreEvidencePhoto', () => {
  it('presents receipt evidence as a full-width 4:3 landscape photo', () => {
    const screen = renderWithProviders(
      <ChoreEvidencePhoto
        uri="fixture://tidy-shoes"
        childName="Charlie"
      />,
    );

    expect(StyleSheet.flatten(
      screen.getByLabelText("Charlie's chore photo. Open full screen").props.style,
    )).toMatchObject({ width: '100%', aspectRatio: 4 / 3 });
  });

  it('opens a zoomable viewer with a transparent close control', () => {
    const screen = renderWithProviders(
      <ChoreEvidencePhoto
        uri="fixture://tidy-shoes"
        childName="Charlie"
        compact
      />,
    );

    fireEvent.press(screen.getByLabelText("Charlie's chore photo. Open full screen"));

    expect(screen.getByLabelText("Charlie's chore photo. Pinch to zoom")).toBeTruthy();
    expect(screen.UNSAFE_getByType(IconButton).props.variant).toBe('ghost');
    fireEvent.press(screen.getByLabelText('Close full-screen chore photo'));
    expect(screen.queryByLabelText("Charlie's chore photo. Pinch to zoom")).toBeNull();
  });
});
