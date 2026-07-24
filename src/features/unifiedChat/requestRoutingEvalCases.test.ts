import { resolveHybridRequestPolicy } from './hybridRequestPolicy';
import { classifyUnifiedChatRequest } from './requestPolicy';
import { CHAT_CAPABILITY_COVERAGE } from './chatCapabilityCoverage';
import {
  REQUEST_ROUTING_EVAL_CASES,
  REQUEST_ROUTING_OPERATION_EXPECTATIONS,
} from './requestRoutingEvalCases';

describe('REQUEST_ROUTING_EVAL_CASES', () => {
  it.each(REQUEST_ROUTING_EVAL_CASES)('$id', (fixture) => {
    const deterministicPolicy = classifyUnifiedChatRequest({
      prompt: fixture.prompt,
      context: 'context' in fixture ? fixture.context : undefined,
    });
    const resolved = resolveHybridRequestPolicy({
      prompt: fixture.prompt,
      deterministicPolicy,
      semanticRoute: fixture.semanticRoute,
      previousPolicy: 'previousPolicy' in fixture ? fixture.previousPolicy : undefined,
      previousAssistantMessage: 'previousAssistantMessage' in fixture
        ? fixture.previousAssistantMessage
        : undefined,
    });

    expect(resolved.requestClass).toBe(fixture.expected.requestClass);
    expect(resolved.participatingCapabilities).toEqual(fixture.expected.participatingCapabilities);
    expect(
      resolved.policyReason.startsWith('semantic-route:')
        ? 'semantic'
        : resolved.policyReason.startsWith('conversation-follow-up:')
          ? 'conversation'
          : 'deterministic',
    ).toBe(fixture.expected.source);
  });

  it('labels routed-but-unimplemented actions honestly', () => {
    const unsupported = REQUEST_ROUTING_EVAL_CASES
      .filter((fixture) => fixture.expected.executionExpectation === 'not_yet_supported')
      .map((fixture) => fixture.id);
    expect(unsupported).toEqual(['money-transfer-boundary']);
  });

  it('backs every declared execution outcome with the product operation manifest', () => {
    const coverage = new Map(CHAT_CAPABILITY_COVERAGE.map((row) => [row.id, row]));
    for (const fixture of REQUEST_ROUTING_EVAL_CASES) {
      const operationIds = REQUEST_ROUTING_OPERATION_EXPECTATIONS[fixture.id];
      const rows = operationIds.map((id) => coverage.get(id));
      expect(rows.every(Boolean)).toBe(true);
      switch (fixture.expected.executionExpectation) {
        case 'answer':
          expect(rows.every((row) => row?.channels.mobile.state === 'live' && row.channels.mobile.outcome === 'answer')).toBe(true);
          break;
        case 'proposal':
        case 'receipt':
          expect(rows.every((row) => row?.channels.mobile.state === 'live' && row.channels.mobile.outcome === 'proposal_or_receipt')).toBe(true);
          break;
        case 'native_authorization':
          expect(rows.every((row) => row?.channels.mobile.state === 'confirmation_only' && row.channels.mobile.outcome === 'native_review')).toBe(true);
          break;
        case 'provider_boundary':
          expect(rows.every((row) => row?.providers.includes('connector'))).toBe(true);
          break;
        case 'honest_boundary':
          expect(rows.every((row) => row?.channels.mobile.state === 'pending_provider' && row.channels.mobile.outcome === 'honest_boundary')).toBe(true);
          break;
        case 'cancel_pending':
        case 'boundary':
        case 'not_yet_supported':
          expect(operationIds).toEqual([]);
          break;
      }
    }
  });
});
