it('does not compile 600 detailed recipes during module import or metadata lookup', () => {
  jest.isolateModules(() => {
    const compiler = require('./compileEditorialRecipe');
    const compile = jest.spyOn(compiler, 'compileEditorialRecipeProjection');
    const catalog = require('./starterRecipeCatalog');
    expect(compile).not.toHaveBeenCalled();
    expect(catalog.getStarterRecipeMetadata('kwilt-recipe-br001')).not.toBeNull();
    expect(compile).not.toHaveBeenCalled();
    const recipes = catalog.getStarterRecipeProjections();
    expect(recipes).toHaveLength(600);
    expect(compile).toHaveBeenCalledTimes(600);
    expect(catalog.getStarterRecipeProjections()).toBe(recipes);
    expect(compile).toHaveBeenCalledTimes(600);
    compile.mockRestore();
  });
});
