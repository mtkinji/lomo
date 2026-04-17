import { getChapterHistorySnippet } from './chapterSnippet';

describe('getChapterHistorySnippet', () => {
  // Phase 3.1 of docs/chapters-plan.md: `sections[key=signal].caption`
  // is the preferred source for list-card snippets. This test locks in
  // the preference order so the caption work doesn't regress back to the
  // article body when a caption is present.
  it('prefers sections.signal.caption over story.body (Phase 3.1)', () => {
    const snippet = getChapterHistorySnippet({
      sections: [
        { key: 'signal', caption: 'The Work Arc closed "Workfront" after 23 days — one of 12 finishes.' },
        { key: 'story', body: 'Long article body that should not win when a caption exists.' },
      ],
    });
    expect(snippet).toBe('The Work Arc closed "Workfront" after 23 days — one of 12 finishes.');
  });

  it('truncates a caption at a word boundary when it exceeds maxChars', () => {
    const caption = 'a b c d e f g h i j k l m n o p q r s t u v w x y z one two three four five six seven';
    const snippet = getChapterHistorySnippet({
      sections: [{ key: 'signal', caption }],
    }, 40);
    expect(snippet.length).toBeLessThanOrEqual(40);
    expect(snippet.endsWith('\u2026')).toBe(true);
  });

  it('falls back to sections.story.body when signal is absent (legacy chapters)', () => {
    const snippet = getChapterHistorySnippet({
      sections: [
        { key: 'story', body: 'First sentence. Second sentence should not appear.' },
      ],
    });
    expect(snippet).toBe('First sentence.');
  });

  it('returns empty string when no narrative or caption exists', () => {
    expect(getChapterHistorySnippet(null)).toBe('');
    expect(getChapterHistorySnippet({ sections: [] })).toBe('');
    expect(getChapterHistorySnippet({ sections: [{ key: 'highlights', bullets: [] }] })).toBe('');
  });
});
