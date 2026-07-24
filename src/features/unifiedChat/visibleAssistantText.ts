const INTERNAL_TAG_PATTERN =
  /<\s*(?:think|thinking|analysis|reasoning|internal(?:[-_\s]dialog)?|scratchpad)\b[^>]*>[\s\S]*?<\s*\/\s*(?:think|thinking|analysis|reasoning|internal(?:[-_\s]dialog)?|scratchpad)\s*>/gi;
const INTERNAL_SECTION_HEADING_PATTERN =
  /^(?:internal\s+(?:agent\s+)?(?:dialog|monologue|notes?)|reasoning|analysis|scratchpad|thinking|chain[-\s]of[-\s]thought|private\s+notes?|plan)\s*[:\-]/i;
const LEADING_INTERNAL_PARAGRAPH_PATTERN =
  /^(?:(?:i|we)\s+(?:need|should|will|can|want|have|am going|'ll|will need)\b|(?:the\s+)?user\s+(?:wants|asked|is asking|needs|said|provided)\b)/i;
const INTERNAL_OBJECT_ID_PAREN_PATTERN =
  /\s*\((?:activity|goal|arc|chapter|proposal|run|thread|message)_[a-z0-9_-]+\)/gi;

export function sanitizeVisibleAssistantText(input: string): string {
  const paragraphs = input
    .replace(INTERNAL_TAG_PATTERN, '')
    .replace(INTERNAL_OBJECT_ID_PAREN_PATTERN, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/);
  let sawPublicParagraph = false;
  const visible: string[] = [];
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed || INTERNAL_SECTION_HEADING_PATTERN.test(trimmed)) continue;
    if (!sawPublicParagraph && LEADING_INTERNAL_PARAGRAPH_PATTERN.test(trimmed)) continue;
    sawPublicParagraph = true;
    visible.push(trimmed);
  }
  return visible.join('\n\n').trim();
}
