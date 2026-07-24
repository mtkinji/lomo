import {
  buildSemanticRequestRouterPrompt,
  parseSemanticRequestRoute,
  SEMANTIC_REQUEST_ROUTE_RESPONSE_FORMAT,
} from './semanticRequestRouter';

describe('semanticRequestRouter', () => {
  it('publishes a strict structured-output contract', () => {
    expect(SEMANTIC_REQUEST_ROUTE_RESPONSE_FORMAT).toMatchObject({
      type: 'json_schema',
      json_schema: {
        strict: true,
        schema: {
          additionalProperties: false,
          required: [
            'requestClass',
            'participatingCapabilities',
            'usePrivateContext',
            'confidence',
            'reason',
          ],
        },
      },
    });

    const capabilitiesSchema = SEMANTIC_REQUEST_ROUTE_RESPONSE_FORMAT.json_schema.schema
      .properties.participatingCapabilities;
    expect(capabilitiesSchema).not.toHaveProperty('uniqueItems');
  });

  it('parses a valid bounded semantic route', () => {
    expect(parseSemanticRequestRoute(JSON.stringify({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan', 'todos'],
      usePrivateContext: true,
      confidence: 0.91,
      reason: 'The user wants help arranging an existing task tomorrow.',
    }))).toEqual({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan', 'todos'],
      usePrivateContext: true,
      confidence: 0.91,
      reason: 'The user wants help arranging an existing task tomorrow.',
    });
  });

  it('accepts relationship memory as a bounded capability', () => {
    expect(parseSemanticRequestRoute(JSON.stringify({
      requestClass: 'capability_action',
      participatingCapabilities: ['relationships'],
      usePrivateContext: true,
      confidence: 0.96,
      reason: 'The user explicitly corrected a remembered birthday.',
    }))).toMatchObject({ participatingCapabilities: ['relationships'] });
  });

  it.each([
    ['unknown capability', { requestClass: 'capability_question', participatingCapabilities: ['money'], usePrivateContext: true, confidence: 0.9, reason: 'Money.' }],
    ['invalid confidence', { requestClass: 'general', participatingCapabilities: [], usePrivateContext: false, confidence: 2, reason: 'General.' }],
    ['private general answer', { requestClass: 'general', participatingCapabilities: [], usePrivateContext: true, confidence: 0.9, reason: 'General.' }],
    ['private route without a capability', { requestClass: 'capability_question', participatingCapabilities: [], usePrivateContext: true, confidence: 0.9, reason: 'Missing owner.' }],
    ['unsupported field', { requestClass: 'general', participatingCapabilities: [], usePrivateContext: false, confidence: 0.9, reason: 'General.', chainOfThought: 'hidden' }],
  ])('rejects %s', (_label, value) => {
    expect(parseSemanticRequestRoute(JSON.stringify(value))).toBeNull();
  });

  it('builds a bounded prompt from labels and recent dialogue without record bodies', () => {
    const prompt = buildSemanticRequestRouterPrompt({
      prompt: 'Can you fit that in after lunch?',
      visibleContext: [{
        capabilityId: 'todos',
        objectType: 'activity',
        objectId: 'private-id',
        label: 'Call the school',
      }],
      recentTurns: [
        { role: 'user', content: 'Earlier '.repeat(500) },
        { role: 'assistant', content: 'We discussed tomorrow.' },
      ],
      capabilityDescriptions: [
        { capabilityId: 'plan', description: 'Plans and schedules a day.' },
        { capabilityId: 'todos', description: 'Reads and changes Activities.' },
      ],
    });

    expect(prompt).toContain('Call the school');
    expect(prompt).toContain('activity');
    expect(prompt).not.toContain('private-id');
    expect(prompt.length).toBeLessThan(7000);
    expect(prompt).toContain('Do not answer the user');
  });
});
