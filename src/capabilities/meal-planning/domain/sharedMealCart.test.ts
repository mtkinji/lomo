import {
  PLAN_POSITIVE_REACTION_OPTIONS,
  PLAN_REACTION_OPTIONS,
  optimisticallySetSharedMealReaction,
  parseSharedMealCartProjection,
} from './sharedMealCart';

describe('shared household Plan projection', () => {
  it('preserves server lifecycle ordering and actor-scoped authority', () => {
    const cart = parseSharedMealCartProjection({
      planId: 'plan-1', householdId: 'household-1', version: 3, state: 'draft', activeCount: 2, groceryListId: 'list-1',
      viewer: { personId: 'person-owner', role: 'owner', canAdd: true, canManage: true },
      candidates: [
        { id: 'candidate-2', kind: 'meal_note', title: 'Second', recipeSnapshot: null, position: 1, createdAt: '2026-08-11T02:00:00Z', lifecycle: 'sent', sentAt: '2026-08-11T03:00:00Z', missingItemCount: 1, voteCount: 2, downvoteCount: 0, reactionCounts: { thumbs_up: 1, heart: 1, yum: 0, excited: 0, fire: 0, downvote: 0 }, contributor: { personId: 'person-owner', displayName: 'Maya' }, supporters: [{ personId: 'person-owner', displayName: 'Maya', reaction: 'heart' }, { personId: 'person-2', displayName: 'Sam', reaction: 'thumbs_up' }], viewerReaction: 'heart', canReact: true, canRemove: true, canMarkMade: true },
        { id: 'candidate-1', kind: 'recipe', title: 'First', recipeSnapshot: {}, position: 0, createdAt: '2026-08-11T01:00:00Z', lifecycle: 'idea', sentAt: null, missingItemCount: null, voteCount: 0, downvoteCount: 1, reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 1 }, contributor: { personId: 'person-2', displayName: 'Sam' }, supporters: [{ personId: 'person-3', displayName: 'Alex', reaction: 'downvote' }], viewerReaction: null, canReact: true, canRemove: true, canMarkMade: false },
      ],
    });

    expect(cart?.candidates.map((candidate) => candidate.title)).toEqual(['Second', 'First']);
    expect(cart?.candidates[0]).toMatchObject({ lifecycle: 'sent', voteCount: 2, canMarkMade: true, viewerReaction: 'heart' });
    expect(cart?.candidates[1]).toMatchObject({ voteCount: 0, downvoteCount: 1, viewerReaction: null });
    expect(cart?.viewer.canManage).toBe(true);
    expect(cart?.activeCount).toBe(2);
  });

  it('accepts an eligible empty household before its first add', () => {
    expect(parseSharedMealCartProjection({
      planId: null, householdId: 'household-1', version: null, state: null, activeCount: 0, groceryListId: null,
      viewer: { personId: 'person-2', role: 'caregiver', canAdd: true, canManage: true },
      candidates: [],
    })).toMatchObject({ planId: null, candidates: [], viewer: { canAdd: true, canManage: true } });
  });

  it('rejects malformed lifecycle projections', () => {
    expect(() => parseSharedMealCartProjection({ householdId: 'household-1', activeCount: 1, viewer: {}, candidates: [{ id: 'candidate-1', voteCount: 4 }] })).toThrow('Invalid shared Meal Cart projection.');
  });

  it('offers five positive reactions plus one visible downvote and optimistically keeps one response per person', () => {
    expect(PLAN_POSITIVE_REACTION_OPTIONS.map((reaction) => reaction.id)).toEqual(['thumbs_up', 'heart', 'yum', 'excited', 'fire']);
    expect(PLAN_REACTION_OPTIONS.map((reaction) => reaction.id)).toEqual(['thumbs_up', 'heart', 'yum', 'excited', 'fire', 'downvote']);
    const cart = parseSharedMealCartProjection({
      planId: 'plan-1', householdId: 'household-1', version: 3, state: 'draft', activeCount: 2, groceryListId: null,
      viewer: { personId: 'person-owner', role: 'owner', canAdd: true, canManage: true },
      candidates: [
        { id: 'candidate-1', kind: 'recipe', title: 'Tacos', recipeSnapshot: {}, position: 0, createdAt: '2026-08-11T01:00:00Z', lifecycle: 'idea', sentAt: null, missingItemCount: null, voteCount: 0, downvoteCount: 0, reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 }, contributor: { personId: 'person-2', displayName: 'Sam' }, supporters: [], viewerReaction: null, canReact: true, canRemove: true, canMarkMade: false },
        { id: 'candidate-2', kind: 'recipe', title: 'Soup', recipeSnapshot: {}, position: 1, createdAt: '2026-08-11T00:00:00Z', lifecycle: 'idea', sentAt: null, missingItemCount: null, voteCount: 1, downvoteCount: 0, reactionCounts: { thumbs_up: 0, heart: 1, yum: 0, excited: 0, fire: 0, downvote: 0 }, contributor: { personId: 'person-owner', displayName: 'Maya' }, supporters: [{ personId: 'person-owner', displayName: 'Maya', reaction: 'heart' }], viewerReaction: 'heart', canReact: true, canRemove: true, canMarkMade: false },
      ],
    });
    if (!cart) throw new Error('Expected cart');

    const joined = optimisticallySetSharedMealReaction(cart, 'candidate-1', 'yum');
    expect(joined.candidates.map((candidate) => candidate.id)).toEqual(['candidate-1', 'candidate-2']);
    expect(joined.candidates[0]).toMatchObject({ voteCount: 1, viewerReaction: 'yum', reactionCounts: { yum: 1 } });

    const changed = optimisticallySetSharedMealReaction(joined, 'candidate-1', 'fire');
    expect(changed.candidates[0]).toMatchObject({ voteCount: 1, viewerReaction: 'fire', reactionCounts: { yum: 0, fire: 1 } });

    const removed = optimisticallySetSharedMealReaction(changed, 'candidate-1', null);
    expect(removed.candidates[0]).toMatchObject({ voteCount: 0, viewerReaction: null, reactionCounts: { fire: 0 } });

    const downvoted = optimisticallySetSharedMealReaction(removed, 'candidate-1', 'downvote');
    expect(downvoted.candidates[0]).toMatchObject({ voteCount: 0, downvoteCount: 1, viewerReaction: 'downvote', reactionCounts: { downvote: 1 } });

    const switchedPositive = optimisticallySetSharedMealReaction(downvoted, 'candidate-1', 'thumbs_up');
    expect(switchedPositive.candidates[0]).toMatchObject({ voteCount: 1, downvoteCount: 0, viewerReaction: 'thumbs_up', reactionCounts: { thumbs_up: 1, downvote: 0 } });

    const switchedNegative = optimisticallySetSharedMealReaction(switchedPositive, 'candidate-1', 'downvote');
    expect(switchedNegative.candidates[0]).toMatchObject({ voteCount: 0, downvoteCount: 1, viewerReaction: 'downvote', reactionCounts: { thumbs_up: 0, downvote: 1 } });
  });
});
