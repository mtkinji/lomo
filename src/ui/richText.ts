export function isProbablyHtml(value: string): boolean {
  if (!value) return false;
  // Basic heuristic: contains any HTML-ish tag.
  // This catches legacy underline (`<u>...</u>`) plus rich editor output (`<p>`, `<ul>`, etc).
  return /<\/?[a-z][\s\S]*?>/i.test(value);
}

function escapeHtml(text: string): string {
  return (text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(text: string): string {
  return (text ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => {
      const code = Number(num);
      if (!Number.isFinite(code)) return _;
      try {
        return String.fromCharCode(code);
      } catch {
        return _;
      }
    });
}

function renderLinesAsHtml(lines: string[]): string {
  const out: string[] = [];
  let i = 0;

  const pushParagraph = (paragraphLines: string[]) => {
    const inner = paragraphLines
      .map((l) => escapeHtml(l))
      .join('<br/>')
      // inline markdown-ish formatting inside paragraphs
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // italics: avoid matching bold by requiring single * on both sides
      .replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3');
    out.push(`<p>${inner}</p>`);
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Skip extra blank lines between blocks.
    if (!trimmed) {
      i += 1;
      continue;
    }

    // Unordered list block
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = (lines[i] ?? '').trim();
        if (!/^[-*]\s+/.test(t)) break;
        items.push(
          escapeHtml(t.replace(/^[-*]\s+/, ''))
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3')
        );
        i += 1;
      }
      out.push(`<ul>${items.map((it) => `<li>${it}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list block
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = (lines[i] ?? '').trim();
        if (!/^\d+\.\s+/.test(t)) break;
        items.push(
          escapeHtml(t.replace(/^\d+\.\s+/, ''))
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1<em>$2</em>$3')
        );
        i += 1;
      }
      out.push(`<ol>${items.map((it) => `<li>${it}</li>`).join('')}</ol>`);
      continue;
    }

    // Paragraph block: consume until blank line or list start.
    const paragraph: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? '';
      const t = l.trim();
      if (!t) break;
      if (/^[-*]\s+/.test(t)) break;
      if (/^\d+\.\s+/.test(t)) break;
      paragraph.push(l);
      i += 1;
    }
    if (paragraph.length) pushParagraph(paragraph);
  }

  return out.join('');
}

export function plainTextToHtml(text: string): string {
  const raw = (text ?? '').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  const html = renderLinesAsHtml(lines);
  return html || '<p></p>';
}

export function legacyMarkdownToHtml(text: string): string {
  // This expects the legacy LongTextField formatting:
  // - Bold: **text**
  // - Italic: *text*
  // - UL: "- " prefixes
  // - OL: "1. " prefixes
  // - Link: [text](url)
  // - Underline: <u>text</u> (already HTML)
  return plainTextToHtml(text);
}

export function normalizeToHtml(value: string): string {
  const raw = value ?? '';
  if (!raw.trim()) return '<p></p>';
  if (isProbablyHtml(raw)) return raw;
  // Treat everything else as legacy "plain/markdown-ish" text.
  return legacyMarkdownToHtml(raw);
}

export function htmlToPlainText(html: string): string {
  const raw = html ?? '';
  if (!raw) return '';
  // Preserve basic structure.
  let text = raw
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\s*div[^>]*>/gi, '')
    .replace(/<\/\s*ul\s*>/gi, '\n')
    .replace(/<\/\s*ol\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  text = decodeHtmlEntities(text);
  // Collapse excessive whitespace/newlines.
  text = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

/**
 * Best-effort conversion for user-entered rich text fields.
 * - Accepts HTML (rich editor output) or legacy plain/markdown-ish strings
 * - Returns readable plain text for previews, prompts, search, etc.
 */
export function richTextToPlainText(value: string): string {
  return htmlToPlainText(normalizeToHtml(value));
}

/**
 * Sanitize user-entered rich text HTML from the WebView editor.
 *
 * Goal: prevent "surprising" formatting on paste (e.g. Google Docs / Notes often
 * inject background colors and inline styles).
 *
 * We intentionally keep semantic tags produced by the editor (p/strong/em/u/ul/ol/li/a)
 * and strip presentational attributes/tags that tend to sneak in via paste.
 */
export function sanitizeRichTextHtml(html: string): string {
  const raw = html ?? '';
  if (!raw) return raw;

  // 1) Strip inline style attributes (these are the primary source of pasted bg colors).
  let out = raw
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sstyle='[^']*'/gi, '')
    .replace(/\sbgcolor="[^"]*"/gi, '')
    .replace(/\sbgcolor='[^']*'/gi, '');

  // 2) Remove common presentational wrapper tags while preserving inner text.
  out = out
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/<\/?font[^>]*>/gi, '');

  // 2.5) IMPORTANT: Do NOT strip "blank paragraphs" (`<p><br></p>`).
  // These are how the editor represents intentional blank lines (double-enter).
  // Removing them makes Enter feel broken and also changes user-authored spacing.

  // 3) Defensive: remove empty style attributes left behind (rare).
  out = out.replace(/\sstyle=\s*(?:""|''|\s)/gi, '');

  return out;
}

