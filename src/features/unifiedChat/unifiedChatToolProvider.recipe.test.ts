import { recipeContractFixture, recipeVersionContractFixture } from '../../capabilities/recipes/domain/recipeContractFixtures';
import { createUnifiedChatToolProvider } from './unifiedChatToolProvider';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

const projection = {
  recipe: recipeContractFixture(),
  currentVersion: recipeVersionContractFixture(),
};

const snapshots = {
  goals: { goals: [] },
  todos: { activities: [], goals: [] },
  chapters: { chapters: [] },
  recipes: { recipes: [projection] },
};

function tool(id: string) {
  const found = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing Recipe tool ${id}`);
  return found;
}

describe('Unified Chat Recipe tools', () => {
  test('searches bounded authorized Recipe projections', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const result = await provider.execute({ id: 'search-recipes', toolId: 'recipes.search',
      arguments: { query: projection.currentVersion.title.split(' ')[0], limit: 10 } }, tool('recipes.search'));
    expect(result).toEqual({ status: 'completed', receipt: null, output: { recipes: [expect.objectContaining({
      recipeId: projection.recipe.id, recipeVersionId: projection.currentVersion.id,
      version: projection.currentVersion.version, title: projection.currentVersion.title,
    })] } });
  });

  test('previews exact-yield scaling without changing the Recipe', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const targetYield = Number(projection.currentVersion.yieldQuantity) * 2;
    const result = await provider.execute({ id: 'scale-recipe', toolId: 'recipes.scale.preview',
      arguments: { recipeVersionId: projection.currentVersion.id, targetYield } }, tool('recipes.scale.preview'));
    expect(result).toEqual({ status: 'completed', receipt: null, output: expect.objectContaining({
      recipeVersionId: projection.currentVersion.id, fromYield: projection.currentVersion.yieldQuantity,
      targetYield, ingredients: expect.any(Array),
    }) });
  });

  test('stages a complete private Recipe create for explicit review', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const result = await provider.execute({
      id: 'create-recipe',
      toolId: 'recipes.create',
      arguments: {
        recipe: {
          title: 'Hokkaido Cheese Potato Mochi',
          yieldQuantity: 6,
          yieldUnit: 'pieces',
          ingredients: ['2 potatoes', '6 cubes mozzarella', '2 tbsp potato starch'],
          instructions: ['Mash the cooked potatoes.', 'Wrap around cheese.', 'Pan-fry until golden.'],
        },
        idempotencyKey: 'recipe-create-1',
      },
    }, tool('recipes.create'));

    expect(result.status).toBe('proposed');
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'recipes',
      title: 'Create Hokkaido Cheese Potato Mochi',
      operation: expect.objectContaining({
        type: 'create_recipe',
        targetId: null,
        expectedVersion: 0,
        payload: expect.objectContaining({ reviewedData: expect.objectContaining({
          title: 'Hokkaido Cheese Potato Mochi',
        }) }),
      }),
    })]);
  });

  test('stages an attributed exact-version private Recipe fork', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute({ id: 'fork-recipe', toolId: 'recipes.fork', arguments: {
      sourceRecipeVersionId: projection.currentVersion.id, idempotencyKey: 'fork-request-1',
    } }, tool('recipes.fork'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'recipes', operation: expect.objectContaining({
        type: 'recipes.fork', targetId: projection.currentVersion.id,
        expectedVersion: projection.currentVersion.version,
        payload: expect.objectContaining({ sourceRecipeId: projection.recipe.id,
          reviewedData: expect.objectContaining({
            provenance: expect.objectContaining({ method: 'copy', rightsBasis: 'private_user_import' }),
            lineage: [expect.objectContaining({ relationship: 'fork', sourceRecipeVersionId: projection.currentVersion.id })],
          }) }),
      }),
    })]);
  });

  test('stages an exact-version collaborator grant to one selected person', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute({ id: 'invite-collaborator', toolId: 'recipes.collaborator.invite', arguments: {
      recipeId: projection.recipe.id, expectedVersion: projection.currentVersion.version,
      recipientPersonId: 'person-2', role: 'contributor',
    } }, tool('recipes.collaborator.invite'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()).toEqual([expect.objectContaining({ operation: expect.objectContaining({
      type: 'recipes.collaborator.invite', targetId: projection.recipe.id,
      expectedVersion: projection.currentVersion.version,
      payload: { recipientPersonId: 'person-2', role: 'contributor' },
    }) })]);
  });

  test('hands an exact Recipe copy and selected recipient to native share review', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute({ id: 'share-copy', toolId: 'recipes.share_copy.prepare', arguments: {
      recipeVersionId: projection.currentVersion.id, recipientPersonId: 'person-2',
    } }, tool('recipes.share_copy.prepare'))).resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device', request: {
        actionType: 'open_recipe_share_copy', targetId: projection.recipe.id,
        payload: { recipeVersionId: projection.currentVersion.id, recipientPersonId: 'person-2' },
      },
    });
  });

  test('hands import acquisition to native review and stages version-safe imported Recipe approval', async () => {
    const recipeImports = { listReviewable: jest.fn(async () => [{
      id: 'draft-1', version: 2, method: 'photo' as const, state: 'needs_review' as const,
      extractedData: { sourceTitle: 'Grandma card' }, evidence: {}, warnings: [], expiresAt: '2099-01-01T00:00:00.000Z',
    }]) };
    const provider = createUnifiedChatToolProvider({ snapshots, recipeImports });
    await expect(provider.execute({ id: 'prepare-import', toolId: 'recipes.import.prepare',
      arguments: { method: 'photo', sourceArtifactRefs: ['attachment-1'] } }, tool('recipes.import.prepare')))
      .resolves.toMatchObject({ status: 'pending_client_action', provider: 'device', request: { actionType: 'open_recipe_import' } });

    await expect(provider.execute({ id: 'approve-import', toolId: 'recipes.import.approve', arguments: {
      draftId: 'draft-1', expectedDraftVersion: 2, idempotencyKey: 'approval-request-1',
      reviewedVersion: { title: 'Grandma soup', ingredients: ['1 onion'], instructions: ['Simmer.'] },
    } }, tool('recipes.import.approve'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'recipes', operation: expect.objectContaining({
        type: 'recipes.import.approve', targetId: 'draft-1', expectedVersion: 2,
        payload: expect.objectContaining({ approvalIdempotencyKey: 'approval-request-1', reviewedData: expect.objectContaining({
          title: 'Grandma soup', provenance: expect.objectContaining({ method: 'photo', rightsBasis: 'private_user_import' }),
        }) }),
      }),
    })]);
  });

  test('rejects a stale Recipe import approval', async () => {
    const recipeImports = { listReviewable: jest.fn(async () => [{
      id: 'draft-1', version: 2, method: 'text' as const, state: 'needs_review' as const,
      extractedData: {}, evidence: {}, warnings: [], expiresAt: '2099-01-01T00:00:00.000Z',
    }]) };
    const provider = createUnifiedChatToolProvider({ snapshots, recipeImports });
    await expect(provider.execute({ id: 'approve-stale', toolId: 'recipes.import.approve', arguments: {
      draftId: 'draft-1', expectedDraftVersion: 1, idempotencyKey: 'approval-request-1',
      reviewedVersion: { title: 'Soup', ingredients: ['onion'], instructions: ['Cook.'] },
    } }, tool('recipes.import.approve'))).resolves.toMatchObject({
      status: 'failed', code: 'recipe_import_version_stale', retryable: true,
    });
  });

  test('reads, starts, controls, and completes Cook Mode through exact session revisions', async () => {
    const session = {
      id: 'session-1', ownerPersonId: projection.recipe.ownerPersonId, recipeId: projection.recipe.id,
      recipeVersionId: projection.currentVersion.id, recipeVersion: projection.currentVersion.version,
      recipeScaleMultiplier: 1 as const, status: 'active' as const, currentCueIndex: 0,
      cueCount: Math.max(1, projection.currentVersion.instructions.length), revision: 2,
      startedAt: '2026-08-27T12:00:00.000Z', pausedAt: null, completedAt: null,
      updatedAt: '2026-08-27T12:00:00.000Z', lastDevice: { deviceId: 'device-1', platform: 'ios' as const,
        appVersion: '1', observedAt: '2026-08-27T12:00:00.000Z' }, timers: [],
    };
    const cookActions = {
      read: jest.fn(async () => ({ status: 'completed' as const, session })),
      start: jest.fn(),
      control: jest.fn(async () => ({ status: 'completed' as const, session: { ...session, revision: 3, currentCueIndex: 1 }, replayed: false, replayedCue: false })),
      complete: jest.fn(),
    };
    const provider = createUnifiedChatToolProvider({ snapshots, cookActions });
    await expect(provider.execute({ id: 'read-cook', toolId: 'cook_session.read', arguments: { sessionId: 'session-1' } }, tool('cook_session.read')))
      .resolves.toMatchObject({ status: 'completed', output: { session: { revision: 2 }, currentCue: expect.objectContaining({ instructionId: expect.any(String) }) } });
    await expect(provider.execute({ id: 'start-cook', toolId: 'cook_session.start', arguments: {
      recipeVersionId: projection.currentVersion.id, recipeScaleMultiplier: 2,
    } }, tool('cook_session.start'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({ id: 'next-cook', toolId: 'cook_session.control', arguments: {
      sessionId: 'session-1', expectedRevision: 2, command: { type: 'next' },
    } }, tool('cook_session.control'))).resolves.toMatchObject({ status: 'completed', output: { session: { revision: 3 } } });
    expect(cookActions.control).toHaveBeenCalledWith({ requestId: 'next-cook', sessionId: 'session-1', expectedRevision: 2, command: { type: 'next' } });
    await expect(provider.execute({ id: 'complete-cook', toolId: 'cook_session.complete', arguments: {
      sessionId: 'session-1', expectedRevision: 2, outcome: 'completed',
    } }, tool('cook_session.complete'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: expect.objectContaining({ type: 'cook_session.start', targetId: projection.currentVersion.id }) }),
      expect.objectContaining({ operation: expect.objectContaining({ type: 'cook_session.complete', targetId: 'session-1', expectedVersion: 2 }) }),
    ]));
  });

  test('hands Cook timers to native Cook Mode instead of claiming notification state', async () => {
    const cookSession = { id: 'session-1', recipeId: projection.recipe.id, recipeScaleMultiplier: 1, revision: 2 };
    const provider = createUnifiedChatToolProvider({ snapshots, cookActions: {
      read: jest.fn(async () => ({ status: 'completed' as const, session: cookSession as never })),
      start: jest.fn(), control: jest.fn(), complete: jest.fn(),
    } });
    await expect(provider.execute({ id: 'timer-cook', toolId: 'cook_session.control', arguments: {
      sessionId: 'session-1', expectedRevision: 2,
      command: { type: 'start_timer', cueId: 'cue-1', timerId: 'timer-1', durationSeconds: 300, label: 'Bake' },
    } }, tool('cook_session.control'))).resolves.toMatchObject({
      status: 'pending_client_action', provider: 'device', request: { actionType: 'open_cook_session_timer', targetId: 'session-1' },
    });
  });

  test('stages a version-safe patch without dropping current content', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await provider.execute({
      id: 'update-recipe',
      toolId: 'recipes.update',
      arguments: {
        recipeId: projection.recipe.id,
        expectedVersion: projection.currentVersion.version,
        reviewedVersion: { notes: 'Double the glaze.' },
        idempotencyKey: 'recipe-update-1',
      },
    }, tool('recipes.update'));

    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'recipes',
      title: `Update ${projection.currentVersion.title}`,
      operation: expect.objectContaining({
        type: 'update_recipe',
        targetId: projection.recipe.id,
        expectedVersion: projection.currentVersion.version,
        payload: expect.objectContaining({ changedFields: ['notes'], reviewedData: expect.objectContaining({
          title: projection.currentVersion.title,
          notes: 'Double the glaze.',
          ingredients: expect.arrayContaining([
            expect.objectContaining({ originalText: projection.currentVersion.ingredients[0].originalText }),
          ]),
        }) }),
      }),
    })]);
  });

  test('stages an explicit destructive delete and rejects a stale version', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const stale = await provider.execute({
      id: 'delete-stale', toolId: 'recipes.delete',
      arguments: { recipeId: projection.recipe.id, expectedVersion: projection.currentVersion.version - 1 },
    }, tool('recipes.delete'));
    expect(stale).toMatchObject({ status: 'failed', code: 'recipe_version_stale', retryable: true });

    await provider.execute({
      id: 'delete-recipe', toolId: 'recipes.delete',
      arguments: { recipeId: projection.recipe.id, expectedVersion: projection.currentVersion.version },
    }, tool('recipes.delete'));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'recipes',
      title: `Delete ${projection.currentVersion.title}`,
      body: expect.stringContaining('removes this private Recipe'),
      operation: expect.objectContaining({ type: 'delete_recipe', targetId: projection.recipe.id }),
    })]);
  });
});
