import { buildRunContext } from './buildRunContext';
import type { CapabilityEvidenceSource } from './capabilityContracts';

const sources: CapabilityEvidenceSource[] = [
  {
    capabilityId: 'goals',
    object: { type: 'goal', id: 'goal-reading', label: 'Read together every evening' },
    searchableText: 'read together every evening family bedtime books',
    summary: 'A current family reading goal.',
    authority: 'authoritative',
    observedAt: '2026-07-21T12:00:00.000Z',
  },
  {
    capabilityId: 'todos',
    object: { type: 'activity', id: 'activity-library', label: 'Visit the library' },
    searchableText: 'visit library choose rainy day books',
    summary: 'An unfinished library errand.',
    authority: 'authoritative',
    observedAt: '2026-07-20T12:00:00.000Z',
  },
  {
    capabilityId: 'chapters',
    object: { type: 'chapter', id: 'chapter-winter', label: 'A quieter winter' },
    searchableText: 'rainy days puzzles reading blanket fort worked well',
    summary: 'A retrospective note about calm indoor days.',
    authority: 'derived',
    observedAt: '2026-01-01T12:00:00.000Z',
  },
  {
    capabilityId: 'goals',
    object: { type: 'goal', id: 'goal-garden', label: 'Grow tomatoes' },
    searchableText: 'garden tomatoes summer outside',
    summary: 'An unrelated garden goal.',
    authority: 'authoritative',
    observedAt: '2026-07-19T12:00:00.000Z',
  },
];

describe('buildRunContext', () => {
  test('collapses duplicate evidence identities before selecting persisted context', () => {
    const duplicate: CapabilityEvidenceSource = {
      capabilityId: 'money',
      object: { type: 'money_transaction', id: 'transaction-1', label: 'Grocery store' },
      searchableText: 'money spending annual monthly grocery',
      summary: 'A grocery transaction.',
      authority: 'authoritative',
      observedAt: '2026-08-25T22:00:00.000Z',
    };

    const result = buildRunContext({
      prompt: 'What do my annual spending patterns suggest monthly?',
      policy: {
        requestClass: 'capability_question', participatingCapabilities: ['money'],
        usePrivateContext: true, clarification: null, policyReason: 'test',
      },
      sources: [duplicate, { ...duplicate }],
      now: new Date('2026-08-25T23:00:00.000Z'),
    });

    expect(result.evidence).toHaveLength(1);
    expect(result.coverage).toMatchObject({ consideredCount: 1, includedCount: 1, omittedCount: 0 });
  });

  test('does not inspect personal sources for an ordinary general question', () => {
    expect(
      buildRunContext({
        prompt: 'Why is the sky blue?',
        policy: {
          requestClass: 'general',
          participatingCapabilities: [],
          usePrivateContext: false,
          clarification: null,
          policyReason: 'general-answer-without-private-context',
        },
        sources,
        now: new Date('2026-07-22T12:00:00.000Z'),
      }),
    ).toEqual({
      evidence: [],
      omissions: [],
      coverage: {
        sufficient: true,
        consideredCount: 0,
        includedCount: 0,
        omittedCount: 0,
        note: 'Private Kwilt context was not needed for this request.',
      },
    });
  });

  test('always includes visible explicit context from a participating capability', () => {
    const result = buildRunContext({
      prompt: 'What is one realistic next move for this?',
      policy: {
        requestClass: 'general_with_kwilt_context',
        participatingCapabilities: ['goals'],
        usePrivateContext: true,
        clarification: null,
        policyReason: 'explicit-reference-to-visible-context',
      },
      sources,
      explicitContextObjectIds: ['goal-garden'],
      now: new Date('2026-07-22T12:00:00.000Z'),
    });

    expect(result.evidence).toEqual([
      expect.objectContaining({
        object: expect.objectContaining({ id: 'goal-garden' }),
        includedBecause: 'Visible context explicitly attached to this request.',
      }),
    ]);
    expect(result.coverage.sufficient).toBe(true);
  });

  test('ranks relevant evidence, records omissions, freshness, and bounded coverage', () => {
    const result = buildRunContext({
      prompt: 'Given my goals, to-dos, and chapters, what has helped on rainy reading days?',
      policy: {
        requestClass: 'capability_question',
        participatingCapabilities: ['goals', 'todos', 'chapters'],
        usePrivateContext: true,
        clarification: null,
        policyReason: 'bounded-capability-evidence-request',
      },
      sources,
      maxEvidence: 2,
      maxPerCapability: 1,
      now: new Date('2026-07-22T12:00:00.000Z'),
    });

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence.map((item) => item.object.id)).toEqual([
      'chapter-winter',
      'goal-reading',
    ]);
    expect(result.evidence[0]).toMatchObject({ freshness: 'stale', authority: 'derived' });
    expect(result.evidence[1]).toMatchObject({ freshness: 'current', authority: 'authoritative' });
    expect(result.omissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ objectId: 'activity-library', reason: 'Evidence budget reached.' }),
        expect.objectContaining({ objectId: 'goal-garden', reason: 'No material request-term match.' }),
      ]),
    );
    expect(result.coverage).toMatchObject({
      sufficient: true,
      consideredCount: 4,
      includedCount: 2,
      omittedCount: 2,
    });
  });

  test('reports insufficient coverage instead of inventing a grounded answer', () => {
    const result = buildRunContext({
      prompt: 'Which goal reflects my marathon training?',
      policy: {
        requestClass: 'capability_question',
        participatingCapabilities: ['goals'],
        usePrivateContext: true,
        clarification: null,
        policyReason: 'bounded-capability-evidence-request',
      },
      sources,
      now: new Date('2026-07-22T12:00:00.000Z'),
    });

    expect(result.evidence).toEqual([]);
    expect(result.coverage).toMatchObject({ sufficient: false, includedCount: 0 });
    expect(result.coverage.note).toMatch(/did not find relevant evidence/i);
  });

  test('uses semantic broad scope to review an inventory without prompt-term matching', () => {
    const inventory: CapabilityEvidenceSource[] = Array.from({ length: 130 }, (_, index) => ({
      capabilityId: 'money',
      object: {
        type: index < 20 ? 'money_category' : 'money_transaction',
        id: `money-${index + 1}`,
        label: index < 20 ? `Budget ${index + 1}` : `Merchant ${index + 1}`,
      },
      searchableText: index < 20 ? 'monthly allocation' : 'merchant purchase',
      summary: 'Current authoritative Money evidence.',
      authority: 'authoritative',
      observedAt: '2026-08-11T12:00:00.000Z',
    }));

    const result = buildRunContext({
      prompt: 'Help me understand whether this system fits my life.',
      policy: {
        requestClass: 'capability_question', participatingCapabilities: ['money'],
        usePrivateContext: true, clarification: null, policyReason: 'semantic-route:system review',
      },
      sources: inventory,
      evidenceScope: 'broad',
    });

    expect(result.evidence).toHaveLength(120);
    expect(result.omissions).toHaveLength(10);
    expect(result.evidence[0]?.includedBecause).toBe('Included in the authorized broad capability review.');
    expect(result.coverage).toMatchObject({ consideredCount: 130, includedCount: 120, omittedCount: 10 });
  });

  test('uses a Money review digest instead of attaching raw transactions to a broad category-structure review', () => {
    const inventory: CapabilityEvidenceSource[] = [
      {
        capabilityId: 'money',
        object: { type: 'money_category_review', id: 'current', label: 'Current category review' },
        searchableText: 'money budget category structure merge split irregular review',
        summary: 'Derived transaction and category patterns.', authority: 'derived',
        observedAt: '2026-08-31T12:00:00.000Z',
      },
      ...Array.from({ length: 2 }, (_, index): CapabilityEvidenceSource => ({
        capabilityId: 'money',
        object: { type: 'money_category', id: `category-${index + 1}`, label: `Category ${index + 1}` },
        searchableText: 'money budget category current month',
        summary: 'Current category totals.', authority: 'authoritative',
        observedAt: '2026-08-31T12:00:00.000Z',
      })),
      ...Array.from({ length: 5 }, (_, index): CapabilityEvidenceSource => ({
        capabilityId: 'money',
        object: { type: 'money_transaction', id: `transaction-${index + 1}`, label: `Merchant ${index + 1}` },
        searchableText: 'money transaction merchant current',
        summary: 'Current transaction.', authority: 'authoritative',
        observedAt: '2026-08-31T12:00:00.000Z',
      })),
    ];

    const result = buildRunContext({
      prompt: "I'm not convinced I have ask the right budget categories right now. What do you think about them?",
      policy: {
        requestClass: 'capability_question', participatingCapabilities: ['money'], usePrivateContext: true,
        clarification: null, policyReason: 'bounded-capability-evidence-request',
      },
      sources: inventory,
      evidenceScope: 'broad',
    });

    expect(result.evidence.map((item) => item.object.type)).toEqual([
      'money_category_review', 'money_category', 'money_category',
    ]);
    expect(result.omissions).toHaveLength(5);
    expect(result.omissions.every((item) => item.reason === 'Summarized into the Money category review digest.')).toBe(true);
    expect(result.coverage).toMatchObject({ consideredCount: 8, includedCount: 3, omittedCount: 5 });
    expect(result.coverage.note).toMatch(/transaction patterns are summarized/i);
  });

  test('grounds a bulk Money category action in the complete bounded category inventory', () => {
    const categorySources: CapabilityEvidenceSource[] = [
      'Dress and Grooming',
      '🎮 Entertainment',
      'Entrepreneurship',
      '⛽ Cars and Transportation',
      '🥬 Groceries',
      'Health & Activities',
      '🏠 Housing & Utilities',
      '🍽 Restaurants',
      '🛒 Shopping',
    ].map((label, index) => ({
      capabilityId: 'money',
      object: { type: 'money_category', id: `category-${index + 1}`, label },
      searchableText: `money budget spending category current month ${label}`,
      summary: 'Current authoritative category.',
      authority: 'authoritative',
      observedAt: '2026-08-04T22:20:00.000Z',
    }));
    const allMoneySources: CapabilityEvidenceSource[] = [{
      capabilityId: 'money',
      object: { type: 'money_plan_limit', id: 'current', label: 'Current Budget answer' },
      searchableText: 'money budget current plan', summary: 'Current living limit answer.',
      authority: 'authoritative', observedAt: '2026-08-04T22:20:00.000Z',
    }, ...categorySources];

    const result = buildRunContext({
      prompt: 'Add an emoji to every budget category that does not have one.',
      policy: {
        requestClass: 'capability_action',
        participatingCapabilities: ['money'],
        usePrivateContext: true,
        clarification: null,
        policyReason: 'semantic-route:bulk category rename',
      },
      sources: allMoneySources,
      actionContract: {
        operationIds: ['money.category.rename'], targetScope: 'all_matching',
        targetQuery: 'Add an emoji to every budget category that does not have one.',
      },
      now: new Date('2026-08-04T22:24:00.000Z'),
    });

    expect(result.evidence.map((item) => item.object.id)).toEqual(
      categorySources.map((source) => source.object.id),
    );
    expect(result.coverage).toMatchObject({
      sufficient: true,
      consideredCount: 9,
      includedCount: 9,
      omittedCount: 0,
    });
  });

  test('uses bounded participating-capability evidence for a referential action retry', () => {
    const moneySources: CapabilityEvidenceSource[] = Array.from({ length: 10 }, (_, index) => ({
      capabilityId: 'money',
      object: { type: 'money_category', id: `category-${index + 1}`, label: `Category ${index + 1}` },
      searchableText: `money budget category ${index + 1}`,
      summary: 'Current authoritative category.',
      authority: 'authoritative',
      observedAt: '2026-08-04T22:20:00.000Z',
    }));

    const result = buildRunContext({
      prompt: 'Can you try that again?',
      policy: {
        requestClass: 'capability_action',
        participatingCapabilities: ['money'],
        usePrivateContext: true,
        clarification: null,
        policyReason: 'conversation-follow-up:money',
      },
      sources: moneySources,
      actionContract: {
        operationIds: ['money.category.rename'], targetScope: 'all_matching',
        targetQuery: 'Add an emoji to every budget category that does not have one.',
      },
      now: new Date('2026-08-04T22:24:00.000Z'),
    });

    expect(result.evidence).toHaveLength(10);
    expect(result.omissions).toHaveLength(0);
    expect(result.evidence.every((item) => item.includedBecause.includes('complete matching target set'))).toBe(true);
  });

  test.each([
    { capabilityId: 'goals' as const, objectType: 'goal', prompt: 'Update every goal.' },
    { capabilityId: 'todos' as const, objectType: 'activity', prompt: 'Delete all activities.' },
    { capabilityId: 'chapters' as const, objectType: 'chapter', prompt: 'Add the same note to each chapter.' },
  ])('resolves all matching $objectType records without per-action bulk registration', ({
    capabilityId, objectType, prompt,
  }) => {
    const matching = Array.from({ length: 17 }, (_, index): CapabilityEvidenceSource => ({
      capabilityId,
      object: { type: objectType, id: `${objectType}-${index + 1}`, label: `${objectType} ${index + 1}` },
      searchableText: `${objectType} current`, summary: 'Current authoritative record.',
      authority: 'authoritative', observedAt: '2026-08-04T22:20:00.000Z',
    }));
    const result = buildRunContext({
      prompt,
      policy: {
        requestClass: 'capability_action', participatingCapabilities: [capabilityId],
        usePrivateContext: true, clarification: null, policyReason: 'test',
      },
      sources: matching,
      actionContract: { operationIds: [], targetScope: 'all_matching', targetQuery: prompt },
    });

    expect(result.evidence).toHaveLength(17);
    expect(result.omissions).toHaveLength(0);
  });

  test('resolves only past-due Activities for an all-matching overdue cleanup', () => {
    const activitySources: CapabilityEvidenceSource[] = [
      {
        capabilityId: 'todos',
        object: { type: 'activity', id: 'overdue-1', label: 'Old errand' },
        searchableText: 'old errand past-due past due overdue',
        summary: 'Scheduled before today.', authority: 'authoritative', observedAt: '2026-08-04T10:00:00.000Z',
      },
      {
        capabilityId: 'todos',
        object: { type: 'activity', id: 'today-1', label: 'Remove reminder from today errand' },
        searchableText: 'remove reminder date today errand scheduled today',
        summary: 'Scheduled today.', authority: 'authoritative', observedAt: '2026-08-05T10:00:00.000Z',
      },
    ];
    const prompt = 'Look through all my past-due to-dos and remove their due dates and reminders.';

    const result = buildRunContext({
      prompt,
      policy: {
        requestClass: 'capability_action', participatingCapabilities: ['todos'],
        usePrivateContext: true, clarification: null, policyReason: 'test',
      },
      sources: activitySources,
      actionContract: {
        operationIds: ['activities.update'], targetScope: 'all_matching', targetQuery: prompt,
      },
      now: new Date('2026-08-05T18:00:00.000Z'),
    });

    expect(result.evidence.map((item) => item.object.id)).toEqual(['overdue-1']);
    expect(result.omissions).toHaveLength(0);
  });
});
