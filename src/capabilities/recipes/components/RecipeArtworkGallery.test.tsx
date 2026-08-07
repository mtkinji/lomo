import { fireEvent, render } from '@testing-library/react-native';

import { recipeContractFixture } from '../domain/recipeContractFixtures';
import { RecipeArtworkGallery } from './RecipeArtworkGallery';

describe('RecipeArtworkGallery', () => {
  it('keeps one image quiet and opens the recipe', () => {
    const onOpen = jest.fn();
    const recipe = recipeContractFixture();
    const screen = render(
      <RecipeArtworkGallery
        mediaAssets={recipe.mediaAssets}
        recipeTitle="Grandma Ruth's Cake"
        onOpen={onOpen}
        testID="single-gallery"
      />,
    );

    expect(screen.queryByText('1 / 1')).toBeNull();
    fireEvent.press(screen.getByTestId('single-gallery', { includeHiddenElements: true }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('pages through every active image and ignores deleted media', () => {
    const onOpen = jest.fn();
    const recipe = recipeContractFixture();
    const base = recipe.mediaAssets[0];
    const screen = render(
      <RecipeArtworkGallery
        mediaAssets={[
          base,
          { ...base, id: 'media-2', storageRef: 'https://example.com/second.jpg' },
          { ...base, id: 'media-deleted', storageRef: 'https://example.com/deleted.jpg', lifecycle: 'deleted' },
        ]}
        recipeTitle="Grandma Ruth's Cake"
        onOpen={onOpen}
        testID="multi-gallery"
      />,
    );

    fireEvent(screen.getByTestId('multi-gallery', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { width: 200, height: 160 } } });
    expect(screen.getByText('1 / 2', { includeHiddenElements: true })).toBeTruthy();
    fireEvent.press(screen.getByTestId('multi-gallery-photo-0', { includeHiddenElements: true }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByTestId('multi-gallery-scroll', { includeHiddenElements: true }), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 200, y: 0 } } });
    expect(screen.getByText('2 / 2', { includeHiddenElements: true })).toBeTruthy();
  });
});
