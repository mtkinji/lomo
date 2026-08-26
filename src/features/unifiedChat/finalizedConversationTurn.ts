import { AGENT_WORKBENCH_PROTOCOL_VERSION } from './workbenchProtocol';

export type FinalizedConversationTurn = {
  itemId: string;
  transcript: string;
};

export function buildFinalizedConversationRunMessage(
  utterance: FinalizedConversationTurn,
): { requestId: string; payload: string } {
  const itemId = utterance.itemId.trim();
  const transcript = utterance.transcript.trim();
  if (!itemId || !transcript) throw new Error('A finalized voice turn needs an item id and transcript.');
  const requestId = `voice:${itemId}`.slice(0, 200);
  return {
    requestId,
    payload: JSON.stringify({
      protocolVersion: AGENT_WORKBENCH_PROTOCOL_VERSION,
      type: 'surface.command',
      requestId,
      command: { type: 'run.send', prompt: transcript },
    }),
  };
}
