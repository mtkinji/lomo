import { parseAgentWorkbenchSurfaceMessage } from './workbenchProtocol';
import { buildFinalizedConversationRunMessage } from './finalizedConversationTurn';

describe('finalized Conversation turns', () => {
  it('maps one provider item to one stable durable run command', () => {
    const first = buildFinalizedConversationRunMessage({
      itemId: 'item-voice-1', transcript: '  Put the school call on my Plan tomorrow. ',
    });
    const replay = buildFinalizedConversationRunMessage({
      itemId: 'item-voice-1', transcript: 'Put the school call on my Plan tomorrow.',
    });

    expect(first.requestId).toBe('voice:item-voice-1');
    expect(replay.requestId).toBe(first.requestId);
    expect(parseAgentWorkbenchSurfaceMessage(first.payload)).toEqual({
      protocolVersion: 2,
      type: 'surface.command',
      requestId: 'voice:item-voice-1',
      command: { type: 'run.send', prompt: 'Put the school call on my Plan tomorrow.' },
    });
  });

  it('rejects an empty provider id or transcript', () => {
    expect(() => buildFinalizedConversationRunMessage({ itemId: '', transcript: 'Hello' })).toThrow();
    expect(() => buildFinalizedConversationRunMessage({ itemId: 'item-1', transcript: '  ' })).toThrow();
  });
});
