import { STARTER_RECIPE_PROJECTIONS, buildRecipeLibraryInventory } from './starterRecipeCatalog';
import {
  parseHostedCatalogMediaRows,
  replaceHostedCatalogMedia,
} from './catalogMediaOverlay';

describe('hosted catalog media overlay', () => {
  afterEach(() => replaceHostedCatalogMedia([], { allowEmpty: true }));

  it('maps approved HTTPS media by roster id without replacing bundled recipe identity or content', () => {
    const original = STARTER_RECIPE_PROJECTIONS.find((item) => item.recipe.id === 'kwilt-recipe-br012')!;
    replaceHostedCatalogMedia([{
      rosterId: 'BR012',
      media: {
        id: 'hosted-media-1', ownerPersonId: 'catalog-owner', storageRef: 'https://cdn.example.com/br012.webp',
        mediaType: 'image/webp', rightsBasis: 'kwilt_authored', attribution: 'Image created for Kwilt',
        altText: 'Chilaquiles rojos on a shallow ceramic plate.', publicAllowed: true, lifecycle: 'active',
      },
    }]);
    const overlaid = buildRecipeLibraryInventory([]).find((item) => item.recipe.id === original.recipe.id)!;
    expect(overlaid.recipe.id).toBe(original.recipe.id);
    expect(overlaid.currentVersion).toEqual(original.currentVersion);
    expect(overlaid.recipe.mediaAssets[0].storageRef).toBe('https://cdn.example.com/br012.webp');
  });

  it('rejects unpublished, inactive, non-image, and non-HTTPS media', () => {
    const rows = parseHostedCatalogMediaRows([
      { projection: { catalog: { rosterId: 'BR012' }, recipe: { mediaAssets: [
        { id: 'bad', ownerPersonId: 'owner', storageRef: 'http://cdn.example.com/bad.webp', mediaType: 'image/webp', rightsBasis: 'kwilt_authored', attribution: null, altText: 'Bad', publicAllowed: true, lifecycle: 'active' },
      ] } } },
      { projection: { catalog: { rosterId: 'BR013' }, recipe: { mediaAssets: [
        { id: 'good', ownerPersonId: 'owner', storageRef: 'https://cdn.example.com/good.webp', mediaType: 'image/webp', rightsBasis: 'kwilt_authored', attribution: null, altText: 'Breakfast tacos.', publicAllowed: true, lifecycle: 'active' },
      ] } } },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].rosterId).toBe('BR013');
  });
});
