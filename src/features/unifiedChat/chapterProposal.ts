import { CHAPTER_USER_NOTE_MAX_LENGTH } from '../../services/chapters';

export type ChapterNotePatch = { note: string | null };

export type ChapterProposalOperation = {
  type: 'update_chapter_note';
  targetId: string;
  expectedUpdatedAt: string;
  payload: ChapterNotePatch;
};

export function parseChapterNotePatch(value: unknown): ChapterNotePatch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 1 || !Object.hasOwn(input, 'note')) return null;
  if (input.note !== null && typeof input.note !== 'string') return null;
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (note.length > CHAPTER_USER_NOTE_MAX_LENGTH) return null;
  return { note: note || null };
}
