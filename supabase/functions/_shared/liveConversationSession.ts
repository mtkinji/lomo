export const LIVE_CONVERSATION_CHANNELS = ['chat'] as const;
export type LiveConversationChannel = typeof LIVE_CONVERSATION_CHANNELS[number];

export type LiveConversationSessionRequest = {
  channel: LiveConversationChannel;
  locale?: string;
};

export function parseLiveConversationSessionRequest(value: unknown): LiveConversationSessionRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.channel !== 'chat') return null;
  if (record.locale !== undefined && (typeof record.locale !== 'string' || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(record.locale))) {
    return null;
  }
  return { channel: 'chat', ...(record.locale ? { locale: record.locale } : {}) };
}

export async function buildLiveConversationSafetyIdentifier(userId: string, secret: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`kwilt-live:${secret}:${userId}`),
  );
  return `kwilt_${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 48)}`;
}

export function buildOpenAiLiveConversationClientSecretRequest(input: {
  model: string;
  transcriptionModel: string;
  locale?: string;
}) {
  return {
    session: {
      type: 'realtime',
      model: input.model,
      instructions: [
        'You are Kwilt Conversation Mode. Keep spoken responses concise and warm.',
        'For every user request, call kwilt.run exactly once before giving a final answer.',
        'Pass only the current Realtime input item id and channel context version 1.',
        'Never invent, paraphrase, or pass transcript text as a tool argument.',
        'The tool result is authoritative. Read its terminal message without claiming any action beyond that result.',
      ].join(' '),
      output_modalities: ['audio'],
      audio: {
        input: {
          transcription: {
            model: input.transcriptionModel,
            ...(input.locale ? { languages: [input.locale.split('-')[0].toLowerCase()] } : {}),
          },
          turn_detection: {
            type: 'server_vad',
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          voice: 'marin',
        },
      },
      tools: [{
        type: 'function',
        name: 'kwilt.run',
        description: 'Submit the current finalized user utterance to Kwilt durable Chat and wait for its authoritative result.',
        parameters: {
          type: 'object',
          properties: {
            realtimeItemId: {
              type: 'string',
              description: 'The OpenAI Realtime conversation item id for the current user utterance.',
            },
            channelContextVersion: {
              type: 'integer',
              enum: [1],
              description: 'The Kwilt channel context schema version.',
            },
          },
          required: ['realtimeItemId', 'channelContextVersion'],
          additionalProperties: false,
        },
      }],
      tool_choice: 'required',
    },
  };
}

export function extractEphemeralClientSecret(value: unknown): { value: string; expiresAt: number | null } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const secret = value as Record<string, unknown>;
  if (typeof secret.value !== 'string' || secret.value.length < 12) return null;
  return {
    value: secret.value,
    expiresAt: typeof secret.expires_at === 'number' && Number.isFinite(secret.expires_at)
      ? secret.expires_at
      : null,
  };
}

export function summarizeOpenAiError(value: unknown): {
  code: string | null;
  type: string | null;
  param: string | null;
} {
  const error = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>).error
    : null;
  const record = error && typeof error === 'object' && !Array.isArray(error)
    ? error as Record<string, unknown>
    : {};
  return {
    code: typeof record.code === 'string' ? record.code : null,
    type: typeof record.type === 'string' ? record.type : null,
    param: typeof record.param === 'string' ? record.param : null,
  };
}
