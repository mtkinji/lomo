export type TypedTurnControl =
  | { type: 'cancel_pending' }
  | { type: 'keep_pending_prefix'; count: number }
  | { type: 'edit_pending_activity_weekday'; weekday: number }
  | { type: 'keep_other_pending' }
  | { type: 'repeat_pending_next_week' };

const CANCEL_PENDING_PATTERNS = [
  /^never\s*mind\b/i,
  /^cancel\s+(?:that|it|the\s+change)\s*[.!?]*$/i,
  /^(?:do\s+not|don't)\s+(?:do|make|apply|send)\s+(?:that(?:\s+change)?|it|the\s+change)\s*[.!?]*$/i,
];

export function resolveTypedTurnControl(prompt: string): TypedTurnControl | null {
  const normalized = prompt.trim();
  if (CANCEL_PENDING_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { type: 'cancel_pending' };
  }
  if (/^(?:no,?\s+the\s+other\s+one|actually,?\s+keep\s+the\s+other\s+one)\s*[.!?]*$/i.test(normalized)) {
    return { type: 'keep_other_pending' };
  }
  if (/^(?:do\s+the\s+same\s+for\s+next\s+week|same\s+thing\s+next\s+week)\s*[.!?]*$/i.test(normalized)) {
    return { type: 'repeat_pending_next_week' };
  }
  const weekdayEdit = /^(?:move|reschedule)\s+(?:it|that)\s+(?:to|for)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*[.!?]*$/i
    .exec(normalized);
  if (weekdayEdit) {
    const weekdays: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    return {
      type: 'edit_pending_activity_weekday',
      weekday: weekdays[weekdayEdit[1]!.toLowerCase()]!,
    };
  }
  const selection = /^(?:only\s+(?:add|do|keep)|keep\s+just)\s+the\s+first\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s*[.!?]*$/i
    .exec(normalized);
  if (!selection) return null;
  const namedCounts: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  const count = namedCounts[selection[1]!.toLowerCase()] ?? Number(selection[1]);
  return Number.isInteger(count) && count >= 1 && count <= 10
    ? { type: 'keep_pending_prefix', count }
    : null;
}
