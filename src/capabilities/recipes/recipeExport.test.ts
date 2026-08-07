import { recipeContractFixture, recipeVersionContractFixture } from './domain/recipeContractFixtures';
import { exportRecipeJsonLd, exportRecipeMarkdown } from './recipeExport';

describe('Recipe export', () => {
  const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };

  it('exports portable schema.org JSON-LD with literal lines and attribution', () => {
    const exported = exportRecipeJsonLd(projection);
    expect(exported['@type']).toBe('Recipe');
    expect(exported.recipeIngredient).toContain('1 1/2 cups flour, sifted');
    expect(exported.author).toEqual({ '@type': 'Person', name: 'Grandma Ruth' });
  });

  it('exports readable Markdown without internal ids or storage references', () => {
    const markdown = exportRecipeMarkdown(projection);
    expect(markdown).toContain("# Grandma Ruth's Cake");
    expect(markdown).toContain('- 1 1/2 cups flour, sifted');
    expect(markdown).not.toContain('recipe-family-cake');
    expect(markdown).not.toContain('recipe-imports/');
  });
});
