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
});
