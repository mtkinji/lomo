import { parseChapterNotePatch } from './chapterProposal';

test('accepts one bounded Chapter note and normalizes clearing', () => {
  expect(parseChapterNotePatch({ note: '  Sleep mattered more than I expected.  ' }))
    .toEqual({ note: 'Sleep mattered more than I expected.' });
  expect(parseChapterNotePatch({ note: '   ' })).toEqual({ note: null });
  expect(parseChapterNotePatch({ note: 'x'.repeat(501) })).toBeNull();
  expect(parseChapterNotePatch({ note: 'Valid', status: 'ready' })).toBeNull();
});
