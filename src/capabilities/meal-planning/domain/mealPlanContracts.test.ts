import { archivedPlannedRecipeFixture, familyRecipeFixture } from '../../recipes/domain/recipeContractFixtures';
import {
  finalizeMealPlan,
  isGroceryProjectionStale,
  parseMealPlan,
  reviseFinalizedMealPlan,
  summarizeChoiceResponses,
  type MealPlan,
} from './mealPlanContracts';

const draftPlan: MealPlan = {
  id: 'plan-next-shop',
  ownerPersonId: 'person-owner',
  version: 1,
  status: 'draft',
  horizon: { kind: 'next_shop', shopBy: null },
  candidates: [{
    id: 'candidate-cake',
    kind: 'recipe',
    recipeSnapshot: archivedPlannedRecipeFixture.plannedSnapshot,
    title: familyRecipeFixture.version.title,
    suggestedByPersonId: 'person-owner',
  }],
  entries: [],
  choiceRound: null,
  aiProposals: [{
    id: 'proposal-plan-1',
    planId: 'plan-next-shop',
    expectedPlanVersion: 1,
    evidence: [{ capabilityId: 'recipes', objectId: familyRecipeFixture.recipe.id, authority: 'authoritative', authorized: true }],
    candidateIds: ['candidate-cake'],
    explanation: 'You saved this and have not planned it recently.',
  }],
  finalization: null,
  finalizedAt: null,
  createdAt: '2026-08-05T12:00:00.000Z',
  updatedAt: '2026-08-05T12:00:00.000Z',
  occasions: [],
};

describe('Meal Plan contracts', () => {
  test.each([
    { kind: 'next_shop', shopBy: null },
    { kind: 'meal_count', count: 5 },
    { kind: 'date_range', startsOn: '2026-08-05', endsOn: '2026-08-12' },
    { kind: 'open' },
  ] as const)('accepts flexible planning horizon $kind', (horizon) => {
    expect(parseMealPlan({ ...draftPlan, horizon }).horizon).toEqual(horizon);
  });

  test('finalization snapshots exact Recipe versions and survives archive/edit', () => {
    const finalized = finalizeMealPlan(draftPlan, {
      expectedVersion: 1,
      idempotencyKey: 'finalize:plan-next-shop:v1',
      contentHash: 'sha256:selection-cake-eight',
      selected: [{ candidateId: 'candidate-cake', servings: 8, placementDate: null }],
      now: '2026-08-05T12:30:00.000Z',
    });

    expect(finalized.status).toBe('finalized');
    expect(finalized.entries[0].recipeSnapshot).toEqual(archivedPlannedRecipeFixture.plannedSnapshot);
    expect(finalized.entries[0].recipeSnapshot?.recipeVersionId).toBe('rv-family-cake-1');
    expect(finalized.entries[0]).toMatchObject({ servings: 8, title: "Grandma Ruth's Cake" });
    expect(finalized.entries[0].recipeSnapshot).toMatchObject({
      sourceType: 'photo',
      media: { assetId: 'media-card-front', rightsBasis: 'private_user_import' },
    });
    expect(finalized.finalization).toEqual({
      idempotencyKey: 'finalize:plan-next-shop:v1',
      contentHash: 'sha256:selection-cake-eight',
    });
    expect(finalized.version).toBe(2);
  });

  test('finalizes multiple diner-assigned dishes under one occasion', () => {
    const secondCandidate = {
      ...draftPlan.candidates[0],
      id: 'candidate-toast',
      title: 'Simple toast',
    };
    const finalized = finalizeMealPlan({ ...draftPlan, candidates: [...draftPlan.candidates, secondCandidate] }, {
      expectedVersion: 1,
      idempotencyKey: 'finalize:split-dinner',
      contentHash: 'sha256:split-dinner',
      occasions: [{
        id: 'occasion-dinner',
        title: 'Dinner',
        placementDate: null,
        dishes: [
          { id: 'dish-adults', candidateId: 'candidate-cake', dinerPersonIds: ['adult-a', 'adult-b'], servings: 2 },
          { id: 'dish-child', candidateId: 'candidate-toast', dinerPersonIds: ['child'], servings: 1 },
        ],
      }],
      now: '2026-08-05T12:30:00.000Z',
    });

    expect(finalized.occasions).toHaveLength(1);
    expect(finalized.occasions[0].dishes.map((dish) => dish.dinerPersonIds)).toEqual([
      ['adult-a', 'adult-b'],
      ['child'],
    ]);
    expect(finalized.entries).toHaveLength(2);
    expect(finalized.entries[0]).toMatchObject({ occasionId: 'occasion-dinner', dinerPersonIds: ['adult-a', 'adult-b'] });
  });

  test.each([
    {
      label: 'duplicate occasion ids',
      occasions: [
        { id: 'same', title: null, placementDate: null, dishes: [{ id: 'dish-1', candidateId: 'candidate-cake', dinerPersonIds: ['adult'], servings: 1 }] },
        { id: 'same', title: null, placementDate: null, dishes: [{ id: 'dish-2', candidateId: 'candidate-cake', dinerPersonIds: ['adult'], servings: 1 }] },
      ],
    },
    {
      label: 'duplicate diners',
      occasions: [{ id: 'occasion', title: null, placementDate: null, dishes: [{ id: 'dish', candidateId: 'candidate-cake', dinerPersonIds: ['adult', 'adult'], servings: 2 }] }],
    },
    {
      label: 'empty occasion',
      occasions: [{ id: 'occasion', title: null, placementDate: null, dishes: [] }],
    },
  ])('rejects $label', ({ occasions }) => {
    expect(() => finalizeMealPlan(draftPlan, {
      expectedVersion: 1,
      idempotencyKey: `finalize:${occasions[0].id}`,
      contentHash: `sha256:${occasions[0].id}`,
      occasions,
      now: '2026-08-05T12:30:00.000Z',
    })).toThrow();
  });

  test('revising a finalized plan creates a new version and makes older groceries stale', () => {
    const finalized = finalizeMealPlan(draftPlan, {
      expectedVersion: 1,
      idempotencyKey: 'finalize:plan-next-shop:v1',
      contentHash: 'sha256:selection-cake-eight',
      selected: [{ candidateId: 'candidate-cake', servings: 8, placementDate: null }],
      now: '2026-08-05T12:30:00.000Z',
    });
    const revised = reviseFinalizedMealPlan(finalized, { now: '2026-08-05T13:00:00.000Z' });

    expect(revised.status).toBe('draft');
    expect(revised.version).toBe(3);
    expect(isGroceryProjectionStale({ mealPlanId: finalized.id, mealPlanVersion: 2 }, revised)).toBe(true);
  });

  test('replays the same finalization and rejects the same key with different content', () => {
    const request = {
      expectedVersion: 1,
      idempotencyKey: 'finalize:plan-next-shop:v1',
      contentHash: 'sha256:selection-cake-eight',
      selected: [{ candidateId: 'candidate-cake', servings: 8, placementDate: null }],
      now: '2026-08-05T12:30:00.000Z',
    };
    const finalized = finalizeMealPlan(draftPlan, request);

    expect(finalizeMealPlan(finalized, request)).toEqual(finalized);
    expect(() => finalizeMealPlan(finalized, { ...request, contentHash: 'sha256:different-selection' })).toThrow(
      expect.objectContaining({ code: 'meal_plan.idempotency_conflict', recoveryChoices: ['review_current_plan', 'start_new_draft'] }),
    );
  });

  test('exposes recovery choices for a stale finalization version', () => {
    expect(() => finalizeMealPlan({ ...draftPlan, version: 2, aiProposals: [] }, {
      expectedVersion: 1,
      idempotencyKey: 'finalize:stale',
      contentHash: 'sha256:stale',
      selected: [],
      now: '2026-08-05T12:30:00.000Z',
    })).toThrow(expect.objectContaining({
      code: 'meal_plan.version_conflict',
      recoveryChoices: ['review_current_plan', 'start_new_draft'],
    }));
  });

  test('requires authorized evidence for AI planning proposals', () => {
    expect(() => parseMealPlan({
      ...draftPlan,
      aiProposals: [{ ...draftPlan.aiProposals[0], evidence: [{ capabilityId: 'money', objectId: 'budget', authority: 'derived', authorized: false }] }],
    })).toThrow(expect.objectContaining({ code: 'meal_plan.ai_evidence_unauthorized' }));
  });

  test('keeps participant responses private while producing an authorized aggregate', () => {
    const responses = [
      { participantPersonId: 'person-child-a', candidateIds: ['candidate-cake'], passed: false, privateNote: 'Looks good' },
      { participantPersonId: 'person-child-b', candidateIds: [], passed: true, privateNote: 'Not tonight' },
    ];

    const aggregate = summarizeChoiceResponses(responses, { authorizedOrganizerPersonId: 'person-owner' });

    expect(aggregate).toEqual({ responseCount: 2, passCount: 1, candidatePickCounts: { 'candidate-cake': 1 } });
    expect(aggregate).not.toHaveProperty('privateNote');
    expect(aggregate).not.toHaveProperty('participantPersonId');
  });
});
