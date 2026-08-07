export type RecipeImportIntent = 'family' | 'web';

export type RecipeImportEntryPresentation = {
  pageTitle: string;
  heading: string;
  detail: string;
  inputKind: 'text' | 'url';
  inputLabel: string;
  placeholder: string;
  primaryLabel: string;
  showPhotos: boolean;
  showManual: boolean;
  requiresPrivateCopyConfirmation: boolean;
};

export function getRecipeImportEntryPresentation(
  intent: RecipeImportIntent,
): RecipeImportEntryPresentation {
  if (intent === 'web') {
    return {
      pageTitle: 'Recipe from the web',
      heading: 'Paste the recipe link.',
      detail: 'Kwilt makes a private copy for you to review. The source stays attached.',
      inputKind: 'url',
      inputLabel: 'Recipe URL',
      placeholder: 'https://…',
      primaryLabel: 'Make a review draft',
      showPhotos: false,
      showManual: false,
      requiresPrivateCopyConfirmation: true,
    };
  }
  return {
    pageTitle: 'Family recipe',
    heading: 'Bring it over as it is.',
    detail: 'Take a photo of the card, or paste or dictate the whole recipe. Kwilt makes a private draft for you to review.',
    inputKind: 'text',
    inputLabel: 'Family recipe text',
    placeholder: 'Paste the whole recipe, or use the keyboard microphone',
    primaryLabel: 'Make a review draft',
    showPhotos: true,
    showManual: true,
    requiresPrivateCopyConfirmation: false,
  };
}
