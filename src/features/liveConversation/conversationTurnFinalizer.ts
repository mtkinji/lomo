import type { LiveConversationProviderEvent } from './openAiRealtimeEvents';

export type FinalizedConversationUtterance = {
  itemId: string;
  transcript: string;
  source: 'provider_final' | 'frozen_provisional';
};

type ConversationTurnFinalizerDependencies = {
  fallbackDelayMs: number;
  onFinalized(utterance: FinalizedConversationUtterance): void;
};

export function createConversationTurnFinalizer(
  dependencies: ConversationTurnFinalizerDependencies,
) {
  const provisionalByItemId = new Map<string, string>();
  const pendingByItemId = new Map<string, ReturnType<typeof setTimeout>>();
  const finalizedItemIds = new Set<string>();

  const finalize = (utterance: FinalizedConversationUtterance) => {
    if (finalizedItemIds.has(utterance.itemId)) return;
    const transcript = utterance.transcript.trim();
    if (!transcript) return;
    finalizedItemIds.add(utterance.itemId);
    const pending = pendingByItemId.get(utterance.itemId);
    if (pending) clearTimeout(pending);
    pendingByItemId.delete(utterance.itemId);
    provisionalByItemId.delete(utterance.itemId);
    dependencies.onFinalized({ ...utterance, transcript });
  };

  return {
    handle(event: LiveConversationProviderEvent) {
      if (event.type === 'speech_started') {
        provisionalByItemId.set(event.itemId, '');
        return;
      }
      if (event.type === 'transcript_delta') {
        if (finalizedItemIds.has(event.itemId)) return;
        provisionalByItemId.set(
          event.itemId,
          `${provisionalByItemId.get(event.itemId) ?? ''}${event.delta}`,
        );
        return;
      }
      if (event.type === 'speech_stopped') {
        if (finalizedItemIds.has(event.itemId) || pendingByItemId.has(event.itemId)) return;
        pendingByItemId.set(event.itemId, setTimeout(() => {
          pendingByItemId.delete(event.itemId);
          finalize({
            itemId: event.itemId,
            transcript: provisionalByItemId.get(event.itemId) ?? '',
            source: 'frozen_provisional',
          });
        }, dependencies.fallbackDelayMs));
        return;
      }
      if (event.type === 'transcript_final') {
        finalize({
          itemId: event.itemId,
          transcript: event.transcript,
          source: 'provider_final',
        });
      }
    },

    reset() {
      pendingByItemId.forEach((pending) => clearTimeout(pending));
      pendingByItemId.clear();
      provisionalByItemId.clear();
      finalizedItemIds.clear();
    },
  };
}
