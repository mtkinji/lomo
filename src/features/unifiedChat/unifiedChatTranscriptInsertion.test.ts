import { insertUnifiedChatTranscriptAtSelection } from './unifiedChatTranscriptInsertion';

describe('insertUnifiedChatTranscriptAtSelection', () => {
  test('inserts dictated text at the saved cursor position', () => {
    expect(insertUnifiedChatTranscriptAtSelection({
      currentPrompt: 'Call Mom tomorrow',
      transcript: 'about dinner',
      insertion: { prompt: 'Call Mom tomorrow', selectionStart: 8, selectionEnd: 8 },
    })).toBe('Call Mom about dinner tomorrow');
  });

  test('replaces the exact selected range', () => {
    expect(insertUnifiedChatTranscriptAtSelection({
      currentPrompt: 'Call the school tomorrow',
      transcript: 'Mom',
      insertion: { prompt: 'Call the school tomorrow', selectionStart: 5, selectionEnd: 15 },
    })).toBe('Call Mom tomorrow');
  });

  test('keeps punctuation attached at the insertion boundary', () => {
    expect(insertUnifiedChatTranscriptAtSelection({
      currentPrompt: 'Call Mom.',
      transcript: 'about dinner',
      insertion: { prompt: 'Call Mom.', selectionStart: 8, selectionEnd: 8 },
    })).toBe('Call Mom about dinner.');
  });

  test('falls back to appending when the draft changed after recording began', () => {
    expect(insertUnifiedChatTranscriptAtSelection({
      currentPrompt: 'A newer draft',
      transcript: 'dictated thought',
      insertion: { prompt: 'Old draft', selectionStart: 3, selectionEnd: 3 },
    })).toBe('A newer draft dictated thought');
  });
});
