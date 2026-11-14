import { assignAisle, buildGroceryCompilation, type Aisle } from './index';

// Reported weekly-plan ingredients, including entries wrongly classified outside Other.
const weeklyIngredients: Array<[string, Aisle]> = [
  ['3 ounce cheddar', 'dairy_eggs'], ['2 lemon', 'produce'],
  ['2 ½ pound green cabbage', 'produce'], ['2 cucumber', 'produce'],
  ['1½ pound broccoli', 'produce'], ['2 teaspoon paprika', 'pantry'],
  ['30 ounce canned peas', 'pantry'], ['4 cup low-sodium broth', 'pantry'],
  ['36 ounce marinara sauce', 'pantry'], ['30 ounce canned chickpeas', 'pantry'],
  ['2 teaspoon dried italian herbs', 'pantry'], ['10 ounce mozzarella', 'dairy_eggs'],
  ['2 ounce dairy-free mozzarella-style shreds', 'dairy_eggs'],
  ['5 tablespoon reduced-sodium soy sauce', 'pantry'], ['16 ounce dry spaghetti', 'pantry'],
  ['1 tablespoon fresh ginger', 'produce'], ['1 tablespoon vinegar', 'pantry'],
  ['12 flour tortillas', 'bakery'], ['1 cup oat milk', 'dairy_eggs'],
  ['1 cup rice milk', 'dairy_eggs'], ['1 pound sugar snap peas', 'produce'],
  ['1 head butter lettuce', 'produce'],
  ['1 teaspoon smoked paprika', 'pantry'], ['1 teaspoon garlic powder', 'pantry'],
  ['1 teaspoon black pepper', 'pantry'], ['1 pound green beans', 'produce'],
];

describe('grocery shopping aisles', () => {
  it.each(weeklyIngredients)('compiles %s into %s without losing ingredient evidence', (originalText, aisle) => {
    const { items } = buildGroceryCompilation([{
      originalText, recipeVersionId: 'recipe-v1', ingredientLineId: 'ingredient-1',
      planEntryId: 'meal-1', recipeScaleMultiplier: 1, optional: false,
    }]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ aisle, originalDisplayTexts: [originalText],
      sources: [expect.objectContaining({ ingredientLineId: 'ingredient-1', recipeVersionId: 'recipe-v1' })] });
  });

  it.each<Array<[string, Aisle]>[number]>([
    ['Bananas', 'produce'], ['Clementines', 'produce'], ['Almond milk', 'dairy_eggs'], ['Deli turkey or ham', 'meat_seafood'],
    ['frozen broccoli', 'frozen'], ['frozen chicken', 'frozen'], ['ice cream', 'frozen'],
    ['canned tomatoes', 'pantry'], ['tomato paste', 'pantry'], ['tomato sauce', 'pantry'],
    ['fresh tomatoes', 'produce'], ['garlic cloves', 'produce'], ['onion powder', 'pantry'],
    ['bell peppers', 'produce'], ['ground white pepper', 'pantry'], ['peppercorns', 'pantry'],
    ['dried basil', 'pantry'], ['fresh basil', 'produce'], ['ground ginger', 'pantry'],
    ['canned green beans', 'pantry'], ['fresh green beans', 'produce'], ['dried black beans', 'pantry'],
    ['chicken stock', 'pantry'], ['chicken thighs', 'meat_seafood'], ['vegetable broth', 'pantry'],
    ['egg noodles', 'pantry'], ['peanut butter', 'pantry'], ['almond flour', 'pantry'],
    ['apple juice', 'beverages'], ['coconut milk', 'pantry'], ['plain yogurt', 'dairy_eggs'],
    ['tea', 'beverages'], ['steak', 'meat_seafood'], ['eggplant', 'produce'],
    ['bread flour', 'pantry'], ['sandwich bread', 'bakery'], ['aluminum foil', 'household'],
    ['dish soap', 'household'], ['unknown family ingredient', 'other'], ['', 'other'],
  ])('assigns %s to %s using form and whole words', (concept, expected) => {
    expect(assignAisle(concept)).toBe(expected);
  });
});
