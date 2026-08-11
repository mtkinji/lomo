import {
  collectCoveredActionTargetIds,
  evaluateTurnContextInvariants,
  projectActionOutcomeTruth,
} from './turnOutcomeTruth';
import type { BuiltRunContext } from './capabilityContracts';
import type { UnifiedChatTurnContract } from './turnContract';

const contract: UnifiedChatTurnContract = {
  schemaVersion: 2,
  userJob: 'Rename every Money category',
  desiredOutcome: 'Every category name begins with an emoji',
  constraints: ['emoji at the beginning'],
  requestClass: 'capability_action',
  participatingCapabilities: ['money'],
  usePrivateContext: true,
  authorization: 'explicit_request',
  evidenceScope: 'broad',
  responseContract: 'evidence_linked',
  action: {
    operationIds: ['money.category.rename'], targetScope: 'all_matching',
    targetQuery: 'Add an emoji to every category.',
  },
  referent: null,
};

function context(overrides: Partial<BuiltRunContext['coverage']> = {}): BuiltRunContext {
  return {
    evidence: [{
      id: 'money:money_category:groceries', capabilityId: 'money',
      object: { type: 'money_category', id: 'groceries', label: '🥬 Groceries' },
      summary: 'Current category.', authority: 'authoritative', freshness: 'current',
      observedAt: '2026-08-04T22:20:00.000Z',
      includedBecause: 'Included in the complete authorized inventory.', sufficient: true,
    }],
    omissions: [],
    coverage: {
      sufficient: true, consideredCount: 1, includedCount: 1, omittedCount: 0,
      note: 'Selected 1 of 1 bounded Kwilt records.',
      ...overrides,
    },
  };
}

function twoTargetContext(): BuiltRunContext {
  const first = context();
  return {
    ...first,
    evidence: [
      ...first.evidence,
      {
        ...first.evidence[0],
        id: 'money:money_category:housing',
        object: { type: 'money_category', id: 'housing', label: 'Housing' },
      },
    ],
    coverage: { ...first.coverage, consideredCount: 2, includedCount: 2 },
  };
}

describe('turn outcome truth', () => {
  test('finds target coverage generically in individual and nested bulk tool arguments', () => {
    expect(collectCoveredActionTargetIds({
      targetId: 'goal-1',
      targets: [{ childId: 'child-1', selectionIds: ['selection-1', 'selection-2'] }],
      unrelated: 'not-a-target',
    }, new Set(['goal-1', 'child-1', 'selection-1', 'selection-2', 'goal-2']))).toEqual([
      'goal-1', 'child-1', 'selection-1', 'selection-2',
    ]);
  });

  test('projects prepared action status from proposals instead of model prose', () => {
    expect(projectActionOutcomeTruth({
      turnContract: contract, context: context(), runtimeToolEvents: [], preparedChangeCount: 9,
      coveredTargetIds: ['groceries'],
      modelResponse: 'Everything is all set.',
    })).toMatchObject({
      state: 'prepared', visibleBody: 'I prepared 9 changes for review.', invariantCodes: [],
    });
  });

  test('reports failed grounded actions without inventing an access failure', () => {
    expect(projectActionOutcomeTruth({
      turnContract: contract, context: context(), preparedChangeCount: 0,
      runtimeToolEvents: [{
        sequence: 1, type: 'tool_completed', round: 1, toolCallId: 'rename-1',
        toolId: 'money.category.rename', resultStatus: 'failed',
      }],
      modelResponse: 'I cannot access the category names.',
    })).toMatchObject({
      state: 'failed',
      visibleBody: 'I found the current Kwilt records, but I couldn\'t prepare those changes safely. Nothing was changed. Please try again.',
      invariantCodes: ['loaded_records_access_contradiction'],
    });
  });

  test('turns a model-authored success claim without authoritative work into clarification', () => {
    expect(projectActionOutcomeTruth({
      turnContract: contract, context: context(), preparedChangeCount: 0,
      runtimeToolEvents: [], modelResponse: 'I renamed all of the categories.',
    })).toMatchObject({
      state: 'clarification',
      visibleBody: expect.stringMatching(/nothing was changed/i),
      invariantCodes: ['success_without_authoritative_work'],
    });
  });

  test('preserves the precise clarification requested by a typed tool', () => {
    expect(projectActionOutcomeTruth({
      turnContract: contract,
      context: context(),
      preparedChangeCount: 0,
      runtimeToolEvents: [],
      modelResponse: '',
      clarification: 'Which Money category should I rename?',
    })).toMatchObject({
      state: 'clarification',
      visibleBody: 'Which Money category should I rename?',
      invariantCodes: [],
    });
  });

  test('closes 10,000 recoverable action shapes without a terminal or prose-only outcome', () => {
    let deadEnds = 0;
    for (let index = 0; index < 10_000; index += 1) {
      const result = projectActionOutcomeTruth({
        turnContract: {
          ...contract,
          participatingCapabilities: index % 2 === 0 ? ['plan'] : ['money'],
          action: {
            ...contract.action!,
            targetScope: 'selected_objects',
            operationIds: index % 2 === 0 ? ['plan.schedule_activity'] : ['money.category.rename'],
          },
        },
        context: context(),
        preparedChangeCount: 0,
        runtimeToolEvents: [],
        modelResponse: index % 3 === 0
          ? 'I scheduled that for you.'
          : index % 3 === 1
            ? 'Here is how I would handle it.'
            : '',
      });
      if (result.state === 'failed' || result.state === 'model_response' || !result.visibleBody) {
        deadEnds += 1;
      }
    }

    expect(deadEnds).toBe(0);
  });

  test('rejects an incomplete complete-inventory scope before execution', () => {
    const incomplete = context({ consideredCount: 14, includedCount: 12, omittedCount: 2 });
    incomplete.omissions = [{
      capabilityId: 'money', objectType: 'money_category', objectId: 'extra', label: 'Extra',
      authority: 'authoritative', freshness: 'current', observedAt: null,
      reason: 'Evidence budget reached.',
    }];

    expect(evaluateTurnContextInvariants(contract, incomplete)).toEqual(['incomplete_action_inventory']);
  });

  test('rejects a partial batch even when some proposals were prepared', () => {
    expect(projectActionOutcomeTruth({
      turnContract: contract,
      context: twoTargetContext(),
      runtimeToolEvents: [],
      preparedChangeCount: 1,
      coveredTargetIds: ['groceries'],
      modelResponse: 'I prepared the changes.',
    })).toMatchObject({
      state: 'failed',
      invariantCodes: ['uncovered_action_targets'],
      preparedChangeCount: 1,
    });
  });

  test('accepts any all-matching action when its typed writes cover the resolved target set', () => {
    expect(projectActionOutcomeTruth({
      turnContract: contract,
      context: twoTargetContext(),
      runtimeToolEvents: [],
      preparedChangeCount: 2,
      coveredTargetIds: ['groceries', 'housing'],
      modelResponse: 'I prepared the changes.',
    })).toMatchObject({ state: 'prepared', invariantCodes: [] });
  });
});
