import { normalizeStrictToolArguments, toStrictToolInputSchema } from './strictToolSchema';

describe('strict tool schemas', () => {
  const semanticSchema = {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1 },
      mode: { type: 'string', enum: ['quick', 'deep'] },
      note: { type: ['string', 'null'], maxLength: 100 },
      context: {
        type: 'object',
        properties: {
          timezone: { type: 'string' },
          locale: { type: 'string' },
        },
        required: ['timezone'],
      },
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    required: ['query', 'note'],
  } as const;

  test('closes every object and requires every wire property', () => {
    expect(toStrictToolInputSchema(semanticSchema)).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', minLength: 1 },
        mode: { type: ['string', 'null'], enum: ['quick', 'deep', null] },
        note: { type: ['string', 'null'], maxLength: 100 },
        context: {
          type: ['object', 'null'],
          additionalProperties: false,
          properties: {
            timezone: { type: 'string' },
            locale: { type: ['string', 'null'] },
          },
          required: ['timezone', 'locale'],
        },
        candidates: {
          type: ['array', 'null'],
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              label: { type: ['string', 'null'] },
            },
            required: ['id', 'label'],
          },
        },
      },
      required: ['query', 'mode', 'note', 'context', 'candidates'],
    });
  });

  test('removes only wire-added null optionals before semantic validation', () => {
    expect(normalizeStrictToolArguments(semanticSchema, {
      query: 'weeknight dinner',
      mode: null,
      note: null,
      context: { timezone: 'America/Denver', locale: null },
      candidates: [{ id: 'one', label: null }],
    })).toEqual({
      query: 'weeknight dinner',
      note: null,
      context: { timezone: 'America/Denver' },
      candidates: [{ id: 'one' }],
    });
  });

  test('does not mutate schemas or argument objects', () => {
    const schemaSnapshot = JSON.stringify(semanticSchema);
    const args = { query: 'x', mode: null, note: null, context: null, candidates: null };
    const argsSnapshot = JSON.stringify(args);
    toStrictToolInputSchema(semanticSchema);
    normalizeStrictToolArguments(semanticSchema, args);
    expect(JSON.stringify(semanticSchema)).toBe(schemaSnapshot);
    expect(JSON.stringify(args)).toBe(argsSnapshot);
  });

  test.each(['oneOf', 'anyOf', 'allOf', '$ref', 'patternProperties'])('%s is rejected explicitly', (keyword) => {
    expect(() => toStrictToolInputSchema({
      type: 'object',
      properties: { value: { type: 'string', [keyword]: [] } },
    })).toThrow(`Unsupported JSON Schema keyword at $.properties.value: ${keyword}`);
  });
});
