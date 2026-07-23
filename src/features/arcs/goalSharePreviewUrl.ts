export function normalizeGoalSharePreviewImageUrl(
  imageUrl: string | null | undefined,
): string | undefined {
  const raw = (imageUrl ?? '').trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
