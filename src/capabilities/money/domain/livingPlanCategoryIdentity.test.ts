import { livingPlanCategoryResolver } from './livingPlanCategoryIdentity';

it('resolves UUID, legacy and slug references to the same allocation key', () => {
  const resolve = livingPlanCategoryResolver([{ id: 'uuid', legacy_budget_id: 'legacy', slug: 'slug' }, { id: 'new-uuid', legacy_budget_id: null, slug: 'new' }]);
  expect(['uuid', 'legacy', 'slug'].map(resolve)).toEqual(['legacy', 'legacy', 'legacy']);
  expect(resolve('new-uuid')).toBe('new');
  expect(resolve('missing')).toBe('missing');
});

it('rejects cross-category alias collisions rather than choosing an arbitrary category', () => {
  expect(() => livingPlanCategoryResolver([
    { id: 'one', legacy_budget_id: 'shared', slug: 'first' },
    { id: 'two', legacy_budget_id: 'second', slug: 'shared' },
  ])).toThrow('conflicting identifiers');
});
