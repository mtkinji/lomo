export type TypedTurnControl = { type: 'cancel_pending' };

const CANCEL_PENDING_PATTERNS = [
  /^never\s*mind\b/i,
  /^cancel\s+(?:that|it|the\s+change)\s*[.!?]*$/i,
  /^(?:do\s+not|don't)\s+(?:do|make|apply|send)\s+(?:that(?:\s+change)?|it|the\s+change)\s*[.!?]*$/i,
];

export function resolveTypedTurnControl(prompt: string): TypedTurnControl | null {
  const normalized = prompt.trim();
  return CANCEL_PENDING_PATTERNS.some((pattern) => pattern.test(normalized))
    ? { type: 'cancel_pending' }
    : null;
}
