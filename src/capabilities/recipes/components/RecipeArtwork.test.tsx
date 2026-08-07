import { fireEvent, render } from '@testing-library/react-native';
import { Image, StyleSheet } from 'react-native';

import { RecipeArtwork } from './RecipeArtwork';

describe('RecipeArtwork', () => {
  it('preserves square atlas tile proportions while covering a wide hero frame', () => {
    const screen = render(
      <RecipeArtwork
        storageRef="bundle://household-recipe-atlas/0"
        accessibilityLabel="Buttermilk Berry Pancakes recipe photo"
        style={{ width: 320, height: 180 }}
      />,
    );

    fireEvent(screen.getByLabelText('Buttermilk Berry Pancakes recipe photo'), 'layout', {
      nativeEvent: { layout: { width: 320, height: 180 } },
    });

    const atlasStyle = StyleSheet.flatten(screen.UNSAFE_getByType(Image).props.style);
    expect(atlasStyle.width / 4).toBe(atlasStyle.height / 3);
    expect(atlasStyle.width / 4).toBeGreaterThanOrEqual(320);
    expect(atlasStyle.height / 3).toBeGreaterThanOrEqual(180);
  });

  it('overscans an atlas tile when the hero requests an edge-free crop', () => {
    const screen = render(
      <RecipeArtwork
        storageRef="bundle://household-recipe-atlas/0"
        accessibilityLabel="Full-bleed pancakes"
        style={{ width: 320, height: 180 }}
        cropZoom={1.04}
      />,
    );

    fireEvent(screen.getByLabelText('Full-bleed pancakes'), 'layout', {
      nativeEvent: { layout: { width: 320, height: 180 } },
    });

    const atlasStyle = StyleSheet.flatten(screen.UNSAFE_getByType(Image).props.style);
    expect(atlasStyle.width / 4).toBeGreaterThan(320);
    expect(atlasStyle.height / 3).toBeGreaterThan(320);
  });
});
