import { inferMoneyCategoryPlanRole } from './moneyCategoryPlanRole';

describe('inferMoneyCategoryPlanRole', () => {
  it('keeps legacy inference when no customer choice is stored', () => {
    expect(inferMoneyCategoryPlanRole({ mappingTags: ['housing'] })).toBe('protected');
    expect(inferMoneyCategoryPlanRole({ mappingTags: ['shopping'] })).toBe('flexible');
  });

  it('lets an explicit customer choice override inferred category meaning', () => {
    expect(inferMoneyCategoryPlanRole({ mappingTags: ['housing'], planRoleOverride: 'flexible' })).toBe('flexible');
    expect(inferMoneyCategoryPlanRole({ mappingTags: ['shopping'], planRoleOverride: 'protected' })).toBe('protected');
  });
});

