import type { ChapterRow } from '../../../services/chapters';
import { updateChapterNote, type ChapterActionStoreBoundary } from './chapterActions';

const before: ChapterRow = {
  id: 'chapter-1', user_id: 'user-1', template_id: 'template-1', period_start: '2026-07-13',
  period_end: '2026-07-20', period_key: '2026-W29', input_summary: {}, metrics: {}, output_json: {},
  status: 'ready', error: null, emailed_at: null, user_note: null, user_note_updated_at: null,
  created_at: 'before', updated_at: 'before',
};

function harness() {
  let chapter = before;
  const store: ChapterActionStoreBoundary = {
    getChapter: async () => chapter,
    updateNote: jest.fn(async (_id, note) => {
      chapter = { ...chapter, user_note: note, user_note_updated_at: 'after' };
      return chapter;
    }),
  };
  return { store, chapter: () => chapter };
}

describe('Chapter capability actions', () => {
  it('returns one normalized receipt for native and Chat note updates', async () => {
    const ui = harness();
    const chat = harness();
    const input = { chapterId: before.id, note: 'Sleep mattered.', expectedUpdatedAt: 'before' };
    expect(await updateChapterNote(input, ui.store)).toEqual(await updateChapterNote(input, chat.store));
    expect(ui.chapter().user_note).toBe('Sleep mattered.');
  });

  it('rejects a stale version before calling persistence', async () => {
    const { store } = harness();
    await expect(updateChapterNote({
      chapterId: before.id, note: 'Changed', expectedUpdatedAt: 'stale',
    }, store)).rejects.toThrow('changed after this action was prepared');
    expect(store.updateNote).not.toHaveBeenCalled();
  });
});
