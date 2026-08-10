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

export function buildOpenAiLiveTranscriptionClientSecretRequest(input: {
  model: string;
  locale?: string;
}) {
  return {
    session: {
      type: 'transcription',
      audio: {
        input: {
          transcription: {
            model: input.model,
            ...(input.locale ? { language: input.locale.split('-')[0].toLowerCase() } : {}),
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 350,
          },
        },
      },
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
