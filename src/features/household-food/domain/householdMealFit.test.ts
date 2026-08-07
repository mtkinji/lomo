import { deriveMealFit } from './householdMealFit';

describe('household meal fit', () => {
  it('reports a recorded conflict only for an intended diner', () => {
    const foodNeeds = [{
      id: 'need-1',
      personId: 'child',
      kind: 'must_avoid' as const,
      ingredientConcept: 'peanut',
      displayLabel: 'Peanuts',
    }];

    expect(deriveMealFit({
      dinerPersonIds: ['adult', 'child'],
      foodNeeds,
      recipe: { ingredientConcepts: ['bread', 'peanut'], ingredientEvidenceComplete: true },
    })).toEqual({
      status: 'recorded_conflict',
      conflicts: [{ personId: 'child', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }],
    });
    expect(deriveMealFit({
      dinerPersonIds: ['adult'],
      foodNeeds,
      recipe: { ingredientConcepts: ['bread', 'peanut'], ingredientEvidenceComplete: true },
    })).toEqual({ status: 'no_recorded_conflict', conflicts: [] });
  });

  it('does not imply fit when ingredient evidence is incomplete', () => {
    expect(deriveMealFit({
      dinerPersonIds: ['child'],
      foodNeeds: [],
      recipe: { ingredientConcepts: [], ingredientEvidenceComplete: false },
    })).toEqual({ status: 'not_checked', conflicts: [] });
  });

  it('normalizes concepts and deduplicates repeated needs', () => {
    const result = deriveMealFit({
      dinerPersonIds: ['child'],
      foodNeeds: [
        { id: 'one', personId: 'child', kind: 'must_avoid', ingredientConcept: ' Peanut ', displayLabel: 'Peanuts' },
        { id: 'two', personId: 'child', kind: 'must_avoid', ingredientConcept: 'peanut', displayLabel: 'Peanuts' },
      ],
      recipe: { ingredientConcepts: ['PEANUT'], ingredientEvidenceComplete: true },
    });

    expect(result.status).toBe('recorded_conflict');
    expect(result.conflicts).toHaveLength(1);
  });
});
