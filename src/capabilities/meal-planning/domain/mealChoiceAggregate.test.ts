import { aggregateMealChoices, groupMealChoices, validateMealChoiceResponse } from './mealChoiceAggregate';

describe('Meal choice responses', () => {
  const candidateIds = ['tacos', 'soup', 'pasta'];

  it('limits a response to three unique choices or pass, plus one bounded suggestion', () => {
    expect(validateMealChoiceResponse({ selectedCandidateIds: ['tacos', 'soup'], pass: false, suggestion: 'Breakfast for dinner' }, { candidateIds, limit: 3 }))
      .toEqual({ selectedCandidateIds: ['tacos', 'soup'], pass: false, suggestion: 'Breakfast for dinner' });
    expect(() => validateMealChoiceResponse({ selectedCandidateIds: ['tacos'], pass: true, suggestion: null }, { candidateIds, limit: 3 })).toThrow('Pass');
    expect(() => validateMealChoiceResponse({ selectedCandidateIds: ['tacos', 'tacos'], pass: false, suggestion: null }, { candidateIds, limit: 3 })).toThrow('unique');
    expect(() => validateMealChoiceResponse({ selectedCandidateIds: ['unknown'], pass: false, suggestion: null }, { candidateIds, limit: 3 })).toThrow('candidate');
  });

  it('sorts a calm aggregate by picks then candidate order without exposing voters or declaring a winner', () => {
    const aggregate = aggregateMealChoices({ candidateIds, responses: [
      { selectedCandidateIds: ['tacos', 'soup'], pass: false },
      { selectedCandidateIds: ['tacos'], pass: false },
      { selectedCandidateIds: [], pass: true },
    ] });
    expect(aggregate).toEqual([
      { candidateId: 'tacos', pickCount: 2 },
      { candidateId: 'soup', pickCount: 1 },
      { candidateId: 'pasta', pickCount: 0 },
    ]);
    expect(aggregate[0]).not.toHaveProperty('pickedBy');
    expect(aggregate[0]).not.toHaveProperty('winner');
  });

  it('renders neutral affinity groups without exposing a leaderboard', () => {
    expect(groupMealChoices([
      { candidateId: 'tacos', pickCount: 2 }, { candidateId: 'soup', pickCount: 1 }, { candidateId: 'pasta', pickCount: 0 },
    ])).toEqual({ family_favorites: ['tacos'], sounded_good: ['soup'], still_available: ['pasta'] });
  });
});
