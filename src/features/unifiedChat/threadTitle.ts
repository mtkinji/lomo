export type ThreadTitleTurn = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export const OPENING_THREAD_TITLE_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'kwilt_opening_thread_title',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title'],
      properties: { title: { type: 'string' } },
    },
  },
};

export const COMPRESSION_METADATA_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'kwilt_conversation_metadata',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'summary'],
      properties: {
        title: { type: 'string' },
        summary: { type: 'string' },
      },
    },
  },
};

const QUOTED_TITLE = /^["'\u2018\u2019\u201c\u201d].*["'\u2018\u2019\u201c\u201d]$/;
const GENERIC_TITLE = /^(new\s+chat|chat|conversation|discussion|untitled)(\b|\s+about\b)/i;

export function normalizeSuggestedThreadTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '').trim();
  if (!title || title.length > 72 || QUOTED_TITLE.test(title) || GENERIC_TITLE.test(title)) {
    return null;
  }
  const words = title.split(' ').filter(Boolean);
  return words.length >= 3 && words.length <= 7 ? title : null;
}

function transcript(turns: readonly ThreadTitleTurn[]): string {
  return turns
    .filter((turn) => turn.role !== 'system')
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content.trim()}`)
    .join('\n');
}

export function buildOpeningTitleMessages(turns: readonly ThreadTitleTurn[]): ThreadTitleTurn[] {
  return [
    {
      role: 'system',
      content:
        'Name this conversation from its opening exchange. Return a specific 3–7 word title in JSON. ' +
        'Do not use sensitive details, names, dates, quotes, or generic labels such as New chat or Conversation about. ' +
        'Describe the practical subject, not the act of chatting.',
    },
    { role: 'user', content: transcript(turns) },
  ];
}

export function parseOpeningTitleResponse(raw: string): string | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return normalizeSuggestedThreadTitle((value as Record<string, unknown>).title);
  } catch {
    return null;
  }
}

export function buildCompressionMetadataMessages(input: {
  existingSummary?: string;
  newTurns: readonly ThreadTitleTurn[];
}): ThreadTitleTurn[] {
  return [
    {
      role: 'system',
      content:
        'Maintain a compact durable memory summary and a stable title for an ongoing coaching conversation. ' +
        'Return JSON with summary and title. The summary must use 8–16 short bullet points, stay under 1200 characters, ' +
        'and preserve stable facts, preferences, constraints, goals, decisions, and commitments without speculation. ' +
        'The title must be a specific 3–7 word title reflecting the conversation’s current durable subject. ' +
        'Do not use sensitive details, names, dates, quotes, or generic chat labels.',
    },
    {
      role: 'user',
      content: [
        input.existingSummary?.trim()
          ? `Existing durable memory summary:\n${input.existingSummary.trim()}`
          : 'Existing durable memory summary: (none)',
        `New conversation turns:\n${transcript(input.newTurns)}`,
      ].join('\n\n'),
    },
  ];
}

export function parseCompressionMetadataResponse(raw: string): {
  title: string;
  summary: string;
} | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const title = normalizeSuggestedThreadTitle(record.title);
    const summary = typeof record.summary === 'string' ? record.summary.trim() : '';
    if (!title || !summary || summary.length > 1200) return null;
    return { title, summary };
  } catch {
    return null;
  }
}
