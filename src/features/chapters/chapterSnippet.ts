// One-line snippet for Chapter list cards + detail previews (Phase 2.2 of
// docs/chapters-plan.md). Mirrors the server-side snippet
// logic in `supabase/functions/_shared/emailTemplates.ts::extractChapterSnippet`
// so in-app snippets and email-digest snippets stay consistent.
//
// Rules (single sentence, list-card-friendly):
//   1. Prefer `output_json.sections[key=story].body`.
//   2. Fall back to the first non-empty `sections[].body` or legacy
//      `outputJson.narrative` string.
//   3. Strip leading markdown `##` subheads; they're article scaffolding,
//      not prose.
//   4. Slice at the first sentence boundary (`.`, `?`, `!`), fallback to
//      the paragraph break, fallback to a word-boundary ellipsis.
//
// Returns `''` when no narrative is available.

const DEFAULT_MAX_CHARS = 140;

export function getChapterHistorySnippet(outputJson: unknown, maxChars: number = DEFAULT_MAX_CHARS): string {
  const raw = pickNarrative(outputJson);
  if (!raw) return '';
  const cleaned = stripLeadingSubheads(raw).replace(/\r\n/g, '\n').trim();
  if (!cleaned) return '';

  // Prefer the first sentence.
  const sentenceMatch = cleaned.match(/^[^.!?\n]{12,}?[.!?](?:\s|$)/);
  if (sentenceMatch) {
    const candidate = sentenceMatch[0].trim();
    if (candidate.length <= maxChars) return candidate;
  }

  // Fall back to the first paragraph.
  const paragraphBreak = cleaned.indexOf('\n\n');
  const firstParagraph = paragraphBreak >= 0 ? cleaned.slice(0, paragraphBreak).trim() : cleaned;
  if (firstParagraph.length <= maxChars) return firstParagraph;

  // Truncate at a word boundary.
  const slice = firstParagraph.slice(0, maxChars - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const safe = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${safe.trimEnd()}\u2026`;
}

function pickNarrative(outputJson: unknown): string {
  if (!outputJson || typeof outputJson !== 'object') return '';
  const obj = outputJson as Record<string, unknown>;

  if (typeof obj.narrative === 'string' && obj.narrative.trim().length > 0) {
    return obj.narrative;
  }

  const sections = obj.sections;
  if (!Array.isArray(sections)) return '';
  const story = sections.find(
    (s): s is { key: 'story'; body: unknown } =>
      s != null && typeof s === 'object' && (s as { key?: unknown }).key === 'story',
  );
  if (story && typeof story.body === 'string' && story.body.trim().length > 0) return story.body;

  for (const s of sections) {
    if (s && typeof s === 'object' && typeof (s as { body?: unknown }).body === 'string') {
      const body = (s as { body: string }).body;
      if (body.trim().length > 0) return body;
    }
  }
  return '';
}

function stripLeadingSubheads(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let skippingLeading = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (skippingLeading && (trimmed === '' || trimmed.startsWith('## '))) continue;
    skippingLeading = false;
    out.push(line);
  }
  return out.join('\n');
}
