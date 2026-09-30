import { readFileSync } from 'fs';
import path from 'path';

it('keeps the legacy NextMeals route as a compatibility redirect into the Recipes Plan drawer', () => {
  const source = readFileSync(path.join(__dirname, 'NextMealsScreen.tsx'), 'utf8');

  expect(source).toContain("navigation.replace('RecipeLibrary', {");
  expect(source).toContain('openPlan: true');
  expect(source).toContain('planId: route.params?.planId');
  expect(source).not.toContain('What sounds good next?');
});

it('consumes the meal-finalized feedback handoff in Recipes after navigation settles', () => {
  const source = readFileSync(path.join(__dirname, '../../recipes/screens/RecipeLibraryScreen.tsx'), 'utf8');

  expect(source).toContain('navigation.setParams({ feedbackPromptId: undefined });');
  expect(source).toContain('InteractionManager.runAfterInteractions');
  expect(source).toContain("promptId: feedbackPromptId");
  expect(source).toContain("sourceKey: 'meal-plan-finalized'");
  expect(source).toContain('feedbackHandle?.cancel();');
});
