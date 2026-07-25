import { sanitizeVisibleAssistantText } from './visibleAssistantText';

export type UnifiedChatArtifactDraft = {
  title: string;
  kind: 'document' | 'checklist' | 'table' | 'code';
  content: string;
};

export const ASSISTANT_ARTIFACT_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'kwilt_assistant_answer', strict: true,
    schema: {
      type: 'object', additionalProperties: false, required: ['answer', 'artifact'],
      properties: {
        answer: { type: 'string' },
        artifact: {
          anyOf: [
            { type: 'null' },
            {
              type: 'object', additionalProperties: false,
              required: ['title', 'kind', 'content'],
              properties: {
                title: { type: 'string', maxLength: 120 },
                kind: { type: 'string', enum: ['document', 'checklist', 'table', 'code'] },
                content: { type: 'string', maxLength: 20000 },
              },
            },
          ],
        },
      },
    },
  },
};

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(record).sort();
  return keys.length === expected.length && expected.every((key, index) => keys[index] === key);
}

export function parseAssistantArtifactResponse(raw: string): {
  answer: string;
  artifact: UnifiedChatArtifactDraft | null;
} | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!hasExactKeys(record, ['answer', 'artifact'])) return null;
  const answer = typeof record.answer === 'string'
    ? sanitizeVisibleAssistantText(record.answer).trim().slice(0, 4000) : '';
  if (!answer) return null;
  if (record.artifact === null) return { answer, artifact: null };
  if (!record.artifact || typeof record.artifact !== 'object' || Array.isArray(record.artifact)) return null;
  const artifact = record.artifact as Record<string, unknown>;
  // An artifact is only editable content. Reject receipt-like status or proof
  // fields instead of silently accepting a payload that could imply action.
  if (!hasExactKeys(artifact, ['content', 'kind', 'title'])) return null;
  const title = typeof artifact.title === 'string'
    ? sanitizeVisibleAssistantText(artifact.title).trim().slice(0, 120) : '';
  const content = typeof artifact.content === 'string'
    ? artifact.content.replace(/\r\n?/g, '\n').trim() : '';
  const kind = artifact.kind;
  if (!title || !content || content.length > 20_000 ||
    (kind !== 'document' && kind !== 'checklist' && kind !== 'table' && kind !== 'code')) return null;
  return { answer, artifact: { title, kind, content } };
}
