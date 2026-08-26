import type { ChapterRow } from '../../../services/chapters';

export type ChapterActionStoreBoundary = {
  getChapter: (chapterId: string) => Promise<ChapterRow | null>;
  updateNote: (chapterId: string, note: string | null) => Promise<ChapterRow | null>;
};

export type ChapterActionReceipt = {
  operationId: 'chapters.note.update';
  status: 'completed';
  resultRefs: readonly [{ kind: 'chapter'; id: string }];
  reversible: true;
  result: ChapterRow;
  previous: ChapterRow;
};

export class ChapterActionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChapterActionConflictError';
  }
}

export const chapterUpdatedAt = (chapter: ChapterRow): string => (
  chapter.user_note_updated_at ?? chapter.updated_at
);

export async function updateChapterNote(
  input: { chapterId: string; note: string | null; expectedUpdatedAt?: string },
  store: ChapterActionStoreBoundary,
): Promise<ChapterActionReceipt> {
  const previous = await store.getChapter(input.chapterId);
  if (!previous) throw new ChapterActionConflictError('The Chapter is no longer available.');
  if (input.expectedUpdatedAt !== undefined && chapterUpdatedAt(previous) !== input.expectedUpdatedAt) {
    throw new ChapterActionConflictError('The Chapter changed after this action was prepared.');
  }
  const result = await store.updateNote(previous.id, input.note);
  if (!result) throw new ChapterActionConflictError('Kwilt could not save that Chapter note.');
  return {
    operationId: 'chapters.note.update',
    status: 'completed',
    resultRefs: [{ kind: 'chapter', id: result.id }],
    reversible: true,
    result,
    previous,
  };
}
