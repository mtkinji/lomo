it('does not compile 800 detailed recipes during module import or metadata lookup', () => {
  jest.isolateModules(() => {
    const compiler = require('./compileEditorialRecipe');
    const compile = jest.spyOn(compiler, 'compileEditorialRecipeProjection');
    const catalog = require('./starterRecipeCatalog');
    expect(compile).not.toHaveBeenCalled();
    expect(catalog.getStarterRecipeMetadata('kwilt-recipe-br001')).not.toBeNull();
    expect(compile).not.toHaveBeenCalled();
    const recipes = catalog.getStarterRecipeProjections();
    expect(recipes).toHaveLength(800);
    expect(compile).toHaveBeenCalledTimes(800);
    expect(catalog.getStarterRecipeProjections()).toBe(recipes);
    expect(compile).toHaveBeenCalledTimes(800);
    compile.mockRestore();
  });
});
