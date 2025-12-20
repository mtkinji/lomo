export const formatTags = (tags: string[] | null | undefined) => {
  if (!Array.isArray(tags) || tags.length === 0) return '';
  return tags.join(', ');
};

/**
 * Parse a user-entered comma-separated tags string into a normalized array.
 * - Trims whitespace
 * - Drops empty entries
 * - De-dupes case-insensitively while preserving first-seen casing/order
 */
export const parseTags = (raw: string) => {
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of parts) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
};

/**
 * Ultra-lightweight, deterministic tag suggestion.
 * No network calls; intended for "AI autofill" affordances on empty tag inputs.
 */
export const suggestTagsFromText = (...texts: Array<string | null | undefined>) => {
  const raw = texts
    .filter((t): t is string => Boolean(t && t.trim().length > 0))
    .join(' ')
    .toLowerCase();

  const keywordToTag: Record<string, string> = {
    dinner: 'cooking',
    cook: 'cooking',
    cooking: 'cooking',
    bake: 'cooking',
    practice: 'practice',
    rehearsal: 'practice',
    workout: 'fitness',
    gym: 'fitness',
    run: 'fitness',
    running: 'fitness',
    walk: 'fitness',
    read: 'reading',
    reading: 'reading',
    email: 'admin',
    inbox: 'admin',
    budget: 'finance',
    bills: 'finance',
    groceries: 'errands',
    grocery: 'errands',
    errands: 'errands',
    outdoors: 'outdoors',
  };

  const stopwords = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'but',
    'by',
    'for',
    'from',
    'how',
    'i',
    'if',
    'in',
    'into',
    'is',
    'it',
    'me',
    'my',
    'of',
    'on',
    'or',
    'our',
    'so',
    'that',
    'the',
    'this',
    'to',
    'up',
    'we',
    'will',
    'with',
    'you',
    'your',
  ]);

  const words = raw
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopwords.has(w));

  const out: string[] = [];
  const seen = new Set<string>();

  for (const w of words) {
    const tag = keywordToTag[w] ?? w;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 3) break;
  }

  return out.length > 0 ? out : ['general'];
};


