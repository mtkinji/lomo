import { buildRunContext } from './buildRunContext';
import { resolveHybridRequestPolicy } from './hybridRequestPolicy';
import { UNIFIED_CHAT_OPERATIONAL_INCIDENT_EVAL_CASES } from './operationalIncidentEvalCases';
import { classifyUnifiedChatRequest, type UnifiedChatRequestPolicy } from './requestPolicy';
import { buildUnifiedChatTurnContract } from './turnContract';
import type { CapabilityEvidenceSource } from './capabilityContracts';

const initialPolicy: UnifiedChatRequestPolicy = {
  requestClass: 'capability_action', participatingCapabilities: ['money'], usePrivateContext: true,
  clarification: null, policyReason: 'semantic-route:bulk category rename',
};

describe('Unified Chat operational incident replay corpus', () => {
  test.each(UNIFIED_CHAT_OPERATIONAL_INCIDENT_EVAL_CASES)('$id', (fixture) => {
    const firstContract = buildUnifiedChatTurnContract({
      prompt: fixture.initialPrompt, requestPolicy: initialPolicy, agentJudgment: null, previous: null,
    });
    const correctionPolicy = resolveHybridRequestPolicy({
      prompt: fixture.correctionPrompt,
      deterministicPolicy: classifyUnifiedChatRequest({ prompt: fixture.correctionPrompt }),
      semanticRoute: null,
      previousTurnContract: firstContract,
    });
    const correctionContract = buildUnifiedChatTurnContract({
      prompt: fixture.correctionPrompt, requestPolicy: correctionPolicy, agentJudgment: null,
      previous: { runId: 'structural-run-1', contract: firstContract },
    });
    const retryPolicy = resolveHybridRequestPolicy({
      prompt: fixture.retryPrompt,
      deterministicPolicy: classifyUnifiedChatRequest({ prompt: fixture.retryPrompt }),
      semanticRoute: null,
      previousTurnContract: correctionContract,
    });
    const retryContract = buildUnifiedChatTurnContract({
      prompt: fixture.retryPrompt, requestPolicy: retryPolicy, agentJudgment: null,
      previous: { runId: 'structural-run-2', contract: correctionContract },
    });
    const sources: CapabilityEvidenceSource[] = [
      {
        capabilityId: 'money', object: {
          type: 'money_plan_limit', id: 'plan-limit', label: 'Current Budget answer',
        }, searchableText: 'money budget current plan', summary: 'Structural non-category record.',
        authority: 'authoritative', observedAt: '2026-08-04T22:20:00.000Z',
      },
      ...Array.from({ length: fixture.inventorySize }, (_, index): CapabilityEvidenceSource => ({
        capabilityId: 'money', object: {
          type: 'money_category', id: `structural-category-${index + 1}`, label: `Category ${index + 1}`,
        }, searchableText: 'money budget category current month', summary: 'Structural category record.',
        authority: 'authoritative', observedAt: '2026-08-04T22:20:00.000Z',
      })),
    ];
    const context = buildRunContext({
      prompt: fixture.retryPrompt, policy: retryPolicy, sources, actionContract: retryContract.action,
    });

    for (const contract of [firstContract, correctionContract, retryContract]) {
      expect(contract.participatingCapabilities).toEqual([fixture.expectedCapability]);
      expect(contract.action).toMatchObject({
        operationIds: [],
        targetScope: 'all_matching',
      });
    }
    expect(correctionContract.referent).toEqual({ runId: 'structural-run-1', kind: 'correction' });
    expect(retryContract.referent).toEqual({ runId: 'structural-run-2', kind: 'retry' });
    expect(context.evidence).toHaveLength(fixture.inventorySize);
    expect(context.evidence.every((item) => item.object.type === 'money_category')).toBe(true);
    expect(context.omissions).toHaveLength(0);
  });
});
