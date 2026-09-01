import { classifyUnifiedChatRequest } from './requestPolicy';
import {
  DETERMINISTIC_POLICY_INVARIANT_REASONS,
  resolveHybridRequestPolicy,
  shouldAttemptAgentJudgment,
  shouldAttemptSemanticRouting,
} from './hybridRequestPolicy';
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
  it('locks only prior safety and authorization invariants', () => {
    expect([...DETERMINISTIC_POLICY_INVARIANT_REASONS]).toEqual([
      'specialist-or-high-stakes-boundary',
      'native-capability-authorization-required',
      'unsupported-consequential-effect',
      'ambiguous-action-target',
    ]);
  });

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

  it('does not let model judgment turn a Money inventory question into authorization', () => {
    const prompt = 'What are my budget categories?';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });

    expect(deterministicPolicy).toMatchObject({
      requestClass: 'capability_question',
      participatingCapabilities: ['money'],
      usePrivateContext: true,
    });
    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: route({
        requestClass: 'capability_action',
        participatingCapabilities: ['money'],
        usePrivateContext: true,
        reason: 'The user wants to review private Money categories on device.',
      }),
      allowAdditionalCapabilities: true,
    })).toEqual(deterministicPolicy);
  });

  it('lets semantic planning interpret a Money recommendation without granting action authority', () => {
    const prompt = 'Review how my spending maps to my budgets and recommend a simpler structure.';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });

    expect(shouldAttemptAgentJudgment(deterministicPolicy)).toBe(true);
    expect(shouldAttemptSemanticRouting({ prompt, deterministicPolicy })).toBe(true);
    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: route({
        requestClass: 'capability_question',
        participatingCapabilities: ['money'],
        usePrivateContext: true,
        reason: 'The user wants a read-only review of their Money system.',
      }),
      allowAdditionalCapabilities: true,
    })).toMatchObject({
      requestClass: 'capability_question',
      participatingCapabilities: ['money'],
      policyReason: 'semantic-route:The user wants a read-only review of their Money system.',
    });
  });

  it('does not let an ambiguous short Plan request become an unauthorized mutation', () => {
    const prompt = 'Plan tomorrow';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });

    expect(deterministicPolicy).toMatchObject({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
    });
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

  it('keeps a short referential add request with the Recipe capability from the prior turn', () => {
    const prompt = 'Could you possibly add one?';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });

    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: route({
        requestClass: 'capability_question',
        participatingCapabilities: ['recipes'],
        usePrivateContext: true,
        reason: 'The dialogue is about a missing Recipe.',
      }),
      previousPolicy: {
        requestClass: 'capability_question',
        participatingCapabilities: ['recipes'],
        usePrivateContext: true,
      },
      previousAssistantMessage:
        'I did not find Hawaiian-style macaroni salad in your Recipe library.',
    })).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: ['recipes'],
      usePrivateContext: true,
      policyReason: 'conversation-follow-up:recipes',
    });
  });

  it('keeps a referential correction attached to the previous Money action', () => {
    const prompt = 'Close, but I want you to put the emoji at the beginning instead of the end.';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });

    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: null,
      previousTurnContract: {
        schemaVersion: 2,
        userJob: 'Add recognizable emojis to current Money categories',
        desiredOutcome: 'Every selected category begins with an emoji',
        constraints: [],
        requestClass: 'capability_action',
        participatingCapabilities: ['money'],
        usePrivateContext: true,
        authorization: 'explicit_request', evidenceScope: 'broad', responseContract: 'evidence_linked',
        action: {
          operationIds: ['money.category.rename'], targetScope: 'all_matching',
          targetQuery: 'Add an emoji to every category.',
        },
        referent: null,
      },
    })).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: ['money'],
      usePrivateContext: true,
      policyReason: 'conversation-follow-up:money',
    });
  });

  it('keeps a self-subject correction attached to the previous Screen Time control', () => {
    const prompt = 'I meant for me, not for Charlie.';
    const deterministicPolicy = classifyUnifiedChatRequest({ prompt });

    expect(resolveHybridRequestPolicy({
      prompt,
      deterministicPolicy,
      semanticRoute: null,
      previousPolicy: {
        requestClass: 'native_control', participatingCapabilities: ['screenTime'], usePrivateContext: true,
      },
      previousTurnContract: {
        schemaVersion: 2,
        userJob: 'Limit Instagram use to 10 minutes',
        desiredOutcome: 'Instagram pauses after 10 minutes of use',
        constraints: ['Instagram', '10 minutes'],
        requestClass: 'native_control',
        participatingCapabilities: ['screenTime'],
        usePrivateContext: true,
        authorization: 'none', evidenceScope: 'focused', responseContract: 'evidence_linked',
        action: null,
        referent: null,
      },
    })).toMatchObject({
      requestClass: 'native_control',
      participatingCapabilities: ['screenTime'],
      usePrivateContext: true,
      policyReason: 'conversation-follow-up:screenTime',
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
