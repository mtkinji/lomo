import { buildUnifiedChatTranscript } from './chatTranscript';
import type { UnifiedChatMessage, UnifiedChatThread } from './types';

const thread: UnifiedChatThread = {
  id: 'thread-1',
  title: 'Budget Category Recommendations',
  titleSource: 'generated',
  status: 'active',
  archivedAt: null,
  createdAt: '2026-08-04T15:04:00.000Z',
  updatedAt: '2026-08-04T15:05:00.000Z',
};

function message(
  id: string,
  role: UnifiedChatMessage['role'],
  body: string,
  createdAt: string,
  attachmentNames: string[] = [],
): UnifiedChatMessage {
  return {
    id,
    threadId: thread.id,
    role,
    body,
    feedback: null,
    createdAt,
    updatedAt: createdAt,
    attachments: attachmentNames.map((name, index) => ({
      id: `attachment-${index}`,
      messageId: id,
      name,
      mimeType: 'text/plain',
      sizeBytes: 12,
      content: 'private attachment content',
      kind: 'text',
      status: 'ready',
      createdAt,
    })),
  };
}

describe('buildUnifiedChatTranscript', () => {
  test('formats the visible conversation as paste-ready Markdown', () => {
    const transcript = buildUnifiedChatTranscript({
      thread,
      messages: [
        message(
          'message-1',
          'user',
          'Can you help me rethink these categories?\nSavings can wait.',
          '2026-08-04T15:04:10.000Z',
          ['current-budget.txt'],
        ),
        message(
          'message-2',
          'assistant',
          'Yes. I would start with health and wellness.',
          '2026-08-04T15:05:00.000Z',
        ),
      ],
    });

    expect(transcript).toBe([
      '# Budget Category Recommendations',
      '',
      '## User — 2026-08-04T15:04:10.000Z',
      '',
      'Can you help me rethink these categories?\nSavings can wait.',
      '',
      '_Attachments: current-budget.txt_',
      '',
      '## Kwilt — 2026-08-04T15:05:00.000Z',
      '',
      'Yes. I would start with health and wellness.',
    ].join('\n'));
    expect(transcript).not.toContain('private attachment content');
  });

  test('keeps an empty chat useful without inventing a turn', () => {
    expect(buildUnifiedChatTranscript({ thread, messages: [] })).toBe([
      '# Budget Category Recommendations',
      '',
      '_No messages yet._',
    ].join('\n'));
  });
});
