// Transient record of where a ChapterDetailScreen open was initiated from.
//
// Used by the `chapter_viewed` analytics event (Phase 1.1 of
// docs/chapters-plan.md). The detail screen can't see the
// originating deep-link URL directly, so the RootNavigator URL handler
// stashes a hint here when the incoming URL targets `chapters/<id>` (e.g.
// from the weekly digest email). The detail screen reads + clears the hint
// on mount; any open not preceded by a stashed hint is treated as `'list'`
// (in-app navigation from ChaptersScreen) or falls back to `'deep_link'`
// when no explicit hint is available and the open is clearly URL-driven.
//
// Intentionally tiny and synchronous — this is not persistent state.

export type ChapterOpenSource = 'list' | 'email' | 'push' | 'deep_link';

type Hint = {
  source: ChapterOpenSource;
  utmCampaign?: string | null;
  /** Epoch ms; used to age-out stale hints if the detail screen never mounts. */
  stampedAtMs: number;
};

const HINT_TTL_MS = 30_000;
const hintsByChapterId = new Map<string, Hint>();

export function recordChapterOpenHint(
  chapterId: string,
  source: ChapterOpenSource,
  utmCampaign?: string | null,
): void {
  const id = (chapterId ?? '').trim();
  if (!id) return;
  hintsByChapterId.set(id, {
    source,
    utmCampaign: utmCampaign ?? null,
    stampedAtMs: Date.now(),
  });
}

/** Consume (read + clear) the most recent hint for the given chapter. */
export function consumeChapterOpenHint(chapterId: string): Hint | null {
  const id = (chapterId ?? '').trim();
  if (!id) return null;
  const hint = hintsByChapterId.get(id);
  if (!hint) return null;
  hintsByChapterId.delete(id);
  if (Date.now() - hint.stampedAtMs > HINT_TTL_MS) return null;
  return hint;
}

/** Test-only helper; do not call from production code. */
export function __resetChapterOpenHintsForTest(): void {
  hintsByChapterId.clear();
}
