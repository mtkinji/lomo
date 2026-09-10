export const statuses = ['unreviewed', 'needs_changes', 'approved', 'deferred'];
export const priorities = ['normal', 'high'];
export function reviewStatus(review, variant) {
  if (!review) return 'unreviewed';
  return review.fixtureVersion === variant.revision ? review.status : 'recheck';
}
export function summary(variants, reviews) {
  const result = { total: variants.length, unreviewed: 0, needs_changes: 0, approved: 0, deferred: 0, recheck: 0 };
  for (const variant of variants) result[reviewStatus(reviews[variant.id], variant)]++;
  return result;
}
export function parseImport(text, variants) {
  const data = JSON.parse(text);
  if (!data || data.schemaVersion !== 1 || !data.reviews || typeof data.reviews !== 'object' || Array.isArray(data.reviews)) throw new Error('Expected a version 1 review export.');
  const known = new Set(variants.map(v => v.id));
  const clean = Object.create(null);
  for (const [id, r] of Object.entries(data.reviews)) {
    if (!known.has(id)) throw new Error(`Unknown variant: ${id}. Nothing was imported.`);
    if (!r || !statuses.includes(r.status) || !priorities.includes(r.priority) || typeof r.notes !== 'string' || r.notes.length > 20000 || !Number.isInteger(r.fixtureVersion) || r.fixtureVersion < 1 || typeof r.updatedAt !== 'string' || !Number.isFinite(Date.parse(r.updatedAt))) throw new Error(`Invalid review for ${id}. Nothing was imported.`);
    clean[id] = { status:r.status, priority:r.priority, notes:r.notes, fixtureVersion:r.fixtureVersion, updatedAt:r.updatedAt };
  }
  return clean;
}
export function mergeReviews(current, incoming) { return { ...current, ...incoming }; }
