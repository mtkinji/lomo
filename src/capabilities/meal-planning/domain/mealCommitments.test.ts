import {
  buildMealCommitmentOccasions,
  formatMealTiming,
  normalizeMealTiming,
  type MealCommitment,
} from './mealCommitments';

describe('progressive meal commitments', () => {
  it('keeps flexible timing explicit and shop-ready', () => {
    expect(normalizeMealTiming({ kind: 'flexible' })).toEqual({ kind: 'flexible' });
    expect(formatMealTiming({ kind: 'flexible' })).toBe('Flexible');
  });

  it('requires one local date and meal period for a specific occasion', () => {
    expect(normalizeMealTiming({ kind: 'occasion', date: '2026-08-09', mealPeriod: 'dinner' }))
      .toEqual({ kind: 'occasion', date: '2026-08-09', mealPeriod: 'dinner' });
    expect(() => normalizeMealTiming({ kind: 'occasion', date: 'Sunday', mealPeriod: 'dinner' }))
      .toThrow('Choose a valid date');
    expect(formatMealTiming({ kind: 'occasion', date: '2026-08-09', mealPeriod: 'dinner' }))
      .toBe('Sun, Aug 9 · Dinner');
  });

  it('materializes bounded coverage dates once in chronological order', () => {
    expect(normalizeMealTiming({
      kind: 'coverage',
      dates: ['2026-08-12', '2026-08-10', '2026-08-12'],
      mealPeriod: 'lunch',
      label: '  Leftovers + sandwiches  ',
    })).toEqual({
      kind: 'coverage',
      dates: ['2026-08-10', '2026-08-12'],
      mealPeriod: 'lunch',
      label: 'Leftovers + sandwiches',
    });
    expect(() => normalizeMealTiming({ kind: 'coverage', dates: [], mealPeriod: 'lunch', label: 'Leftovers' }))
      .toThrow('Choose at least one coverage day');
    expect(() => normalizeMealTiming({ kind: 'coverage', dates: ['2026-08-10'], mealPeriod: 'lunch', label: ' ' }))
      .toThrow('Name what covers these meals');
  });

  it('builds immutable occasion payloads without requiring placement', () => {
    const commitments: MealCommitment[] = [
      { candidateId: 'candidate-flex', timing: { kind: 'flexible' } },
      { candidateId: 'candidate-date', timing: { kind: 'occasion', date: '2026-08-09', mealPeriod: 'dinner' } },
      { candidateId: 'candidate-coverage', timing: { kind: 'coverage', dates: ['2026-08-10', '2026-08-11'], mealPeriod: 'lunch', label: 'Leftovers' } },
    ];
    let sequence = 0;
    const occasions = buildMealCommitmentOccasions({
      commitments,
      dinerPersonIds: ['person-1', 'person-2'],
      defaultServings: 4,
      selectedServingsByCandidateId: new Map([['candidate-flex', 6]]),
      createId: () => `id-${++sequence}`,
    });

    expect(occasions).toEqual([
      {
        id: 'id-1', title: null, placementDate: null, timing: { kind: 'flexible' }, notEatingPersonIds: [],
        dishes: [{ id: 'id-2', candidateId: 'candidate-flex', dinerPersonIds: ['person-1', 'person-2'], servings: 6 }],
      },
      {
        id: 'id-3', title: null, placementDate: '2026-08-09', timing: { kind: 'occasion', date: '2026-08-09', mealPeriod: 'dinner' }, notEatingPersonIds: [],
        dishes: [{ id: 'id-4', candidateId: 'candidate-date', dinerPersonIds: ['person-1', 'person-2'], servings: 4 }],
      },
      {
        id: 'id-5', title: 'Leftovers', placementDate: null, timing: { kind: 'coverage', dates: ['2026-08-10', '2026-08-11'], mealPeriod: 'lunch', label: 'Leftovers' }, notEatingPersonIds: [],
        dishes: [{ id: 'id-6', candidateId: 'candidate-coverage', dinerPersonIds: ['person-1', 'person-2'], servings: 4 }],
      },
    ]);
  });
});
