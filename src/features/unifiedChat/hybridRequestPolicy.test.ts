import { classifyUnifiedChatRequest } from './requestPolicy';
import { resolveHybridRequestPolicy, shouldAttemptSemanticRouting } from './hybridRequestPolicy';
import type { SemanticRequestRoute } from './semanticRequestRouter';

function route(overrides: Partial<SemanticRequestRoute>): SemanticRequestRoute {
  return {
    requestClass: 'capability_question',
    participatingCapabilities: ['plan'],
    usePrivateContext: true,
    confidence: 0.9,
    reason: 'The request is about the user\'s plan.',
    ...overrides,
  };
}

describe('resolveHybridRequestPolicy', () => {
  it.each([
    ['Can you diagnose this chest pain?', 'specialist-or-high-stakes-boundary'],
    ['Block games for my child tonight', 'native-capability-authorization-required'],
  ])('does not allow semantic routing to override %s', (prompt, reason) => {
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });
    expect(shouldAttemptSemanticRouting({ prompt, deterministicPolicy })).toBe(false);
    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: route({ requestClass: 'general', participatingCapabilities: [], usePrivateContext: false }),
    })).toEqual(deterministicPolicy);
    expect(deterministicPolicy.policyReason).toBe(reason);
  });

  it('keeps exact low-risk To-do capture on the deterministic fast path', () => {
    const prompt = 'Add milk';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });
    expect(shouldAttemptSemanticRouting({ prompt, deterministicPolicy })).toBe(false);
    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: route({ participatingCapabilities: ['plan'] }),
    })).toEqual(deterministicPolicy);
  });

  it('allows semantic interpretation for a compound capture request', () => {
    const prompt = 'Add milk and call Mom';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });

    expect(shouldAttemptSemanticRouting({ prompt, deterministicPolicy })).toBe(true);
  });

  it('does not let semantic routing turn a Plan recommendation question into authorization', () => {
    const prompt = 'What should I add to my plan tomorrow?';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });
    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: route({
        requestClass: 'capability_action',
        participatingCapabilities: ['plan'],
      }),
    })).toEqual(deterministicPolicy);
  });

  it('inherits Plan action scope for a short answer to a scheduling clarification', () => {
    const prompt = 'Two hours early afternoon';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });
    const result = resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: route({
        requestClass: 'general',
        participatingCapabilities: [],
        usePrivateContext: false,
      }),
      previousPolicy: {
        requestClass: 'capability_question',
        participatingCapabilities: ['plan'],
        usePrivateContext: true,
      },
      previousAssistantMessage:
        'Tell me how large the window should be and whether you want morning or early afternoon, and I’ll place it.',
    });

    expect(result).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      policyReason: 'conversation-follow-up:plan',
    });
  });

  it('turns a supplied Plan window into a reviewable placement even when Kwilt promised only a suggestion', () => {
    const prompt = 'Two hours early afternoon';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });
    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: null,
      previousPolicy: {
        requestClass: 'capability_question', participatingCapabilities: ['plan'], usePrivateContext: true,
      },
      previousAssistantMessage:
        'If you tell me your open windows, I’ll suggest a specific block length and placement.',
    })).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: ['plan'],
      policyReason: 'conversation-follow-up:plan',
    });
  });

  it.each([
    ['Plan a lighter day for me tomorrow', route({ participatingCapabilities: ['plan'] })],
    ['Can you put the school call somewhere after lunch?', route({ requestClass: 'capability_action', participatingCapabilities: ['todos', 'plan'] })],
    ['Rename my goal to Stronger this year', route({ requestClass: 'capability_action', participatingCapabilities: ['goals'], usePrivateContext: true })],
    ['What deserves attention across my goals, tasks, and tomorrow?', route({ participatingCapabilities: ['goals', 'todos', 'plan'] })],
  ])('uses a confident semantic route for the paraphrase: %s', (prompt, semanticRoute) => {
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });
    const result = resolveHybridRequestPolicy({ prompt, deterministicPolicy, semanticRoute });

    expect(result.requestClass).toBe(semanticRoute.requestClass);
    expect(result.participatingCapabilities).toEqual(semanticRoute.participatingCapabilities);
    expect(result.usePrivateContext).toBe(semanticRoute.usePrivateContext);
    expect(result.policyReason).toMatch(/^semantic-route:/);
  });

  it.each([
    ['missing route', null],
    ['low confidence', route({ confidence: 0.74 })],
    ['invalid capability action', route({ requestClass: 'capability_action', participatingCapabilities: [], usePrivateContext: false })],
  ])('falls back to lexical policy for %s', (_label, semanticRoute) => {
    const prompt = 'Could tomorrow feel less crowded?';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });
    expect(resolveHybridRequestPolicy({ prompt, deterministicPolicy, semanticRoute })).toEqual(deterministicPolicy);
  });
});
