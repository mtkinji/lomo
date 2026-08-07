import { getRecipeImportEntryPresentation } from './recipeImportEntry';

describe('recipe import entry presentation', () => {
  it('starts a family recipe from the source the family already has', () => {
    expect(getRecipeImportEntryPresentation('family')).toEqual(expect.objectContaining({
      pageTitle: 'Family recipe',
      heading: 'Bring it over as it is.',
      inputKind: 'text',
      showPhotos: true,
      showManual: true,
      requiresPrivateCopyConfirmation: false,
    }));
  });

  it('reduces a web recipe to one attributed link', () => {
    expect(getRecipeImportEntryPresentation('web')).toEqual(expect.objectContaining({
      pageTitle: 'Recipe from the web',
      heading: 'Paste the recipe link.',
      inputKind: 'url',
      showPhotos: false,
      showManual: false,
      requiresPrivateCopyConfirmation: true,
    }));
  });
});
