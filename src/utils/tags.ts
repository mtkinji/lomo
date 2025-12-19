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


