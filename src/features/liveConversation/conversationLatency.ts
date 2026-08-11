import type { UnifiedChatRequestClass } from '../unifiedChat/requestPolicy';

export type ConversationLatencyMilestone =
  | 'speech_stopped'
  | 'transcript_final'
  | 'turn_started'
  | 'planning_complete'
  | 'context_ready'
  | 'answer_ready'
  | 'progress_audio_started'
  | 'speech_request_started'
  | 'playback_started';

const OUTPUT_KEYS: Partial<Record<ConversationLatencyMilestone, string>> = {
  transcript_final: 'transcript_final_ms',
  turn_started: 'turn_start_ms',
  planning_complete: 'planning_complete_ms',
  context_ready: 'context_ready_ms',
  answer_ready: 'answer_ready_ms',
  progress_audio_started: 'first_progress_audio_ms',
  speech_request_started: 'speech_request_ms',
  playback_started: 'first_audio_ms',
};

export type ConversationLatencyTracker = ReturnType<typeof createConversationLatencyTracker>;

export type ActiveConversationLatency = {
  tracker: ConversationLatencyTracker;
  planningStrategy: 'fast_direct' | 'full';
  requestClass: UnifiedChatRequestClass;
  fallbackUsed: boolean;
  published: boolean;
};

export function createConversationLatencyTracker(now = () => performance.now()) {
  const marks = new Map<ConversationLatencyMilestone, number>();
  return {
    mark(name: ConversationLatencyMilestone) {
      if (!marks.has(name)) marks.set(name, now());
    },
    snapshot(): Record<string, number> {
      const origin = marks.get('speech_stopped');
      if (origin === undefined) return {};
      return Object.entries(OUTPUT_KEYS).reduce<Record<string, number>>((result, [name, key]) => {
        const value = marks.get(name as ConversationLatencyMilestone);
        if (value !== undefined && key) {
          result[key] = Math.max(0, Math.round(value - origin));
        }
        return result;
      }, {});
    },
  };
}
