import { getMealPlanDropSection, hasCompleteMealPlanOrder } from './mealPlanDrag';

const entries = [
  { kind: 'meal' as const, id: 'idea-1' },
  { kind: 'meal' as const, id: 'idea-2' },
  { kind: 'plannedHeading' as const, id: 'planned-heading' },
  { kind: 'meal' as const, id: 'planned-1' },
  { kind: 'meal' as const, id: 'planned-2' },
];

describe('Meal Plan drag destination', () => {
  it('treats a meal moved below the stable section heading as Planned', () => {
    expect(getMealPlanDropSection(entries, 0, 4)).toBe('planned');
  });

  it('treats a meal moved above the stable section heading as Ideas', () => {
    expect(getMealPlanDropSection(entries, 4, 0)).toBe('ideas');
  });

  it('keeps destinations truthful when the dragged row begins above the heading', () => {
    expect(getMealPlanDropSection(entries, 1, 0)).toBe('ideas');
    expect(getMealPlanDropSection(entries, 1, 3)).toBe('planned');
  });

  it('keeps destinations truthful when the dragged row begins below the heading', () => {
    expect(getMealPlanDropSection(entries, 3, 4)).toBe('planned');
    expect(getMealPlanDropSection(entries, 3, 1)).toBe('ideas');
  });

  it('rejects an empty or stale local order when authoritative meals still exist', () => {
    expect(hasCompleteMealPlanOrder([], [{ id: 'meal-1' }])).toBe(false);
    expect(hasCompleteMealPlanOrder(['meal-1'], [{ id: 'meal-1' }, { id: 'meal-2' }])).toBe(false);
    expect(hasCompleteMealPlanOrder(['missing'], [{ id: 'meal-1' }])).toBe(false);
    expect(hasCompleteMealPlanOrder(['meal-1', 'meal-1'], [{ id: 'meal-1' }, { id: 'meal-2' }])).toBe(false);
  });

  it('accepts a local order only when it covers the authoritative meal set', () => {
    expect(hasCompleteMealPlanOrder(['meal-2', 'meal-1'], [{ id: 'meal-1' }, { id: 'meal-2' }])).toBe(true);
  });
});
