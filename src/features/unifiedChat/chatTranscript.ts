import type { UnifiedChatMessage, UnifiedChatThread } from './types';

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatMessage(message: UnifiedChatMessage): string {
  const role = message.role === 'user' ? 'User' : 'Kwilt';
  const body = message.body.trim() || '_(Empty message)_';
  const attachmentNames = message.attachments
    .map((attachment) => oneLine(attachment.name))
    .filter(Boolean);
  const attachmentLine = attachmentNames.length > 0
    ? `\n\n_Attachments: ${attachmentNames.join(', ')}_`
    : '';

  return `## ${role} — ${message.createdAt}\n\n${body}${attachmentLine}`;
}

export function buildUnifiedChatTranscript(input: {
  thread: UnifiedChatThread;
  messages: readonly UnifiedChatMessage[];
}): string {
  const title = oneLine(input.thread.title) || 'Untitled chat';
  if (input.messages.length === 0) {
    return `# ${title}\n\n_No messages yet._`;
  }

  return [`# ${title}`, ...input.messages.map(formatMessage)].join('\n\n');
}
