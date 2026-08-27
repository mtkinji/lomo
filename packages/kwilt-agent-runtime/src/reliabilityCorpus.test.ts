import {
  RELIABILITY_CORPUS,
  RELIABILITY_CORPUS_VERSION,
  validateReliabilityCorpus,
  type ReliabilityScenario,
} from './reliabilityCorpus';

describe('cross-channel reliability corpus', () => {
  test('has a stable version and stable unique scenario ids', () => {
    expect(RELIABILITY_CORPUS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(Object.isFrozen(RELIABILITY_CORPUS)).toBe(true);

    const ids = RELIABILITY_CORPUS.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  test('requires typed and dictated wording for every channel-neutral intent', () => {
    for (const scenario of RELIABILITY_CORPUS) {
      expect(scenario.utterances.typed.length).toBeGreaterThan(0);
      expect(scenario.utterances.dictated.length).toBeGreaterThan(0);
      expect(scenario.utterances.typed.every((item) => item.trim().length > 0)).toBe(true);
      expect(scenario.utterances.dictated.every((item) => item.trim().length > 0)).toBe(true);
    }
  });

  test('covers required operations and capability families', () => {
    const ids = RELIABILITY_CORPUS.map((scenario) => scenario.id);
    for (const operation of [
      'read', 'create', 'update', 'complete', 'delete', 'review',
      'handoff', 'ambiguity', 'retry', 'stop', 'steer',
    ]) {
      expect(ids.some((id) => id.includes(`-${operation}-`) || id.endsWith(`-${operation}`))).toBe(true);
    }

    const capabilityIds = new Set(RELIABILITY_CORPUS.map((scenario) => scenario.capabilityId));
    expect(capabilityIds).toEqual(new Set([
      'goals', 'activities', 'plan', 'money', 'food', 'screen_time', 'relationships', 'agent_run',
    ]));
  });

  test('declares terminal outcome, authority, tool, and receipt expectations', () => {
    expect(validateReliabilityCorpus(RELIABILITY_CORPUS)).toEqual([]);
    for (const scenario of RELIABILITY_CORPUS) {
      expect([
        'completed', 'needs_review', 'awaiting_client_action',
        'needs_input', 'unavailable', 'refused',
      ]).toContain(scenario.expectedOutcome);
      expect(['none', 'read', 'write_explicit']).toContain(scenario.expectedAuthorization);
      expect(Array.isArray(scenario.requiredReceiptFields)).toBe(true);
    }
  });

  test('validator rejects duplicate ids and incomplete scenario contracts', () => {
    const valid = RELIABILITY_CORPUS[0];
    const invalid = {
      ...valid,
      id: 'Not Stable',
      utterances: { typed: [], dictated: ['   '] },
      expectedOutcome: 'maybe',
      expectedAuthorization: 'implicit',
      requiredReceiptFields: ['runId', 'runId', ''],
    } as unknown as ReliabilityScenario;

    expect(validateReliabilityCorpus([valid, valid, invalid])).toEqual(expect.arrayContaining([
      expect.stringContaining('duplicate scenario id'),
      expect.stringContaining('stable kebab-case id'),
      expect.stringContaining('typed utterance'),
      expect.stringContaining('dictated utterance'),
      expect.stringContaining('expected outcome'),
      expect.stringContaining('expected authorization'),
      expect.stringContaining('receipt fields'),
    ]));
  });
});
