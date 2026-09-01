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
        facts: {
          type: 'array',
          minItems: 1,
          maxItems: 6,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['text', 'evidence'],
            properties: {
              text: { type: 'string' },
              evidence: {
                type: 'array',
                maxItems: 6,
                uniqueItems: true,
                items: { type: 'string', pattern: '^E[1-9][0-9]*$' },
              },
            },
          },
        },
        inference: { type: ['string', 'null'] },
        uncertainty: { type: 'string' },
      },
    },
  },
};

export type GroundedAnswer = {
  answer: string;
  facts: Array<{ text: string; evidence: string[] }>;
  inference: string | null;
  uncertainty: string;
};

export type GroundedAnswerParseOptions = {
  allowedEvidenceRefs?: readonly string[];
};

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const sanitized = sanitizeVisibleAssistantText(value).slice(0, max).trim();
  return sanitized || null;
}

function parseFact(
  value: unknown,
  allowedEvidenceRefs: ReadonlySet<string> | null,
): GroundedAnswer['facts'][number] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const text = clean(record.text, 1000);
  if (!text || !Array.isArray(record.evidence) || record.evidence.length > 6) return null;
  const evidence = [...new Set(record.evidence)].filter(
    (item): item is string => typeof item === 'string' && /^E[1-9][0-9]*$/.test(item),
  );
  if (evidence.length !== record.evidence.length) return null;
  if (allowedEvidenceRefs) {
    if (allowedEvidenceRefs.size > 0 && evidence.length === 0) return null;
    if (allowedEvidenceRefs.size === 0 && evidence.length > 0) return null;
    if (evidence.some((reference) => !allowedEvidenceRefs.has(reference))) return null;
  }
  return { text, evidence };
}

export function parseGroundedAnswer(
  raw: string,
  options: GroundedAnswerParseOptions = {},
): GroundedAnswer | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const answer = clean(record.answer, 4000);
    const uncertainty = clean(record.uncertainty, 1000);
    const allowedEvidenceRefs = options.allowedEvidenceRefs
      ? new Set(options.allowedEvidenceRefs)
      : null;
    const parsedFacts = Array.isArray(record.facts)
      ? record.facts.slice(0, 6).map((item) => parseFact(item, allowedEvidenceRefs))
      : [];
    const facts = parsedFacts.filter((item): item is GroundedAnswer['facts'][number] => Boolean(item));
    const inference = record.inference === null ? null : clean(record.inference, 2000);
    if (!answer || !uncertainty || facts.length === 0 || facts.length !== parsedFacts.length ||
        (record.inference !== null && !inference)) return null;
    return { answer, facts, inference, uncertainty };
  } catch {
    return null;
  }
}

export function formatGroundedAnswer(answer: GroundedAnswer): string {
  return [
    answer.answer,
    `What Kwilt found\n${answer.facts.map((fact) => `- ${fact.text}`).join('\n')}`,
    ...(answer.inference ? [`What that may mean\n${answer.inference}`] : []),
    `Limits\n${answer.uncertainty}`,
  ].join('\n\n');
}
