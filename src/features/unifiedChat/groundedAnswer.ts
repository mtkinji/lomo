import { sanitizeVisibleAssistantText } from './visibleAssistantText';

export const GROUNDED_ANSWER_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'kwilt_grounded_answer',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['answer', 'facts', 'inference', 'uncertainty'],
      properties: {
        answer: { type: 'string' },
        facts: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string' } },
        inference: { type: ['string', 'null'] },
        uncertainty: { type: 'string' },
      },
    },
  },
};

export type GroundedAnswer = {
  answer: string;
  facts: string[];
  inference: string | null;
  uncertainty: string;
};

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const sanitized = sanitizeVisibleAssistantText(value).slice(0, max).trim();
  return sanitized || null;
}

export function parseGroundedAnswer(raw: string): GroundedAnswer | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const answer = clean(record.answer, 4000);
    const uncertainty = clean(record.uncertainty, 1000);
    const facts = Array.isArray(record.facts)
      ? record.facts.map((item) => clean(item, 1000)).filter((item): item is string => Boolean(item)).slice(0, 6)
      : [];
    const inference = record.inference === null ? null : clean(record.inference, 2000);
    if (!answer || !uncertainty || facts.length === 0 || (record.inference !== null && !inference)) return null;
    return { answer, facts, inference, uncertainty };
  } catch {
    return null;
  }
}

export function formatGroundedAnswer(answer: GroundedAnswer): string {
  return [
    answer.answer,
    `What Kwilt found\n${answer.facts.map((fact) => `- ${fact}`).join('\n')}`,
    ...(answer.inference ? [`What that may mean\n${answer.inference}`] : []),
    `Limits\n${answer.uncertainty}`,
  ].join('\n\n');
}
