export type UnifiedChatVoiceInsertion = {
  prompt: string;
  selectionStart: number;
  selectionEnd: number;
};

function needsBoundarySpace(left: string, right: string): boolean {
  if (!left || !right || /\s$/.test(left) || /^\s/.test(right)) return false;
  if (/[([{\u201c\u2018'"\u2014-]$/.test(left)) return false;
  if (/^[,.;:!?)}\]\u201d\u2019'"\u2014-]/.test(right)) return false;
  return true;
}

export function insertUnifiedChatTranscriptAtSelection({
  currentPrompt,
  transcript,
  insertion,
}: {
  currentPrompt: string;
  transcript: string;
  insertion?: UnifiedChatVoiceInsertion | null;
}): string {
  const spoken = transcript.trim();
  if (!spoken) return currentPrompt;

  const selectionIsCurrent = insertion?.prompt === currentPrompt &&
    Number.isInteger(insertion.selectionStart) &&
    Number.isInteger(insertion.selectionEnd) &&
    insertion.selectionStart >= 0 &&
    insertion.selectionEnd >= insertion.selectionStart &&
    insertion.selectionEnd <= currentPrompt.length;

  if (!selectionIsCurrent || !insertion) {
    const draft = currentPrompt.trimEnd();
    return draft ? `${draft} ${spoken}` : spoken;
  }

  const before = currentPrompt.slice(0, insertion.selectionStart);
  const after = currentPrompt.slice(insertion.selectionEnd);
  const leadingSpace = needsBoundarySpace(before, spoken) ? ' ' : '';
  const trailingSpace = needsBoundarySpace(spoken, after) ? ' ' : '';
  return `${before}${leadingSpace}${spoken}${trailingSpace}${after}`;
}
