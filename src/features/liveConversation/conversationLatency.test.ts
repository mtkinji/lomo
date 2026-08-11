import { createConversationLatencyTracker } from './conversationLatency';

describe('createConversationLatencyTracker', () => {
  it('projects durations from speech stop without retaining content', () => {
    let now = 1_000;
    const tracker = createConversationLatencyTracker(() => now);
    tracker.mark('speech_stopped');
    now = 1_180;
    tracker.mark('transcript_final');
    now = 1_260;
    tracker.mark('turn_started');
    now = 2_100;
    tracker.mark('planning_complete');
    now = 2_300;
    tracker.mark('context_ready');
    now = 2_900;
    tracker.mark('answer_ready');
    now = 3_350;
    tracker.mark('playback_started');

    expect(tracker.snapshot()).toEqual({
      transcript_final_ms: 180,
      turn_start_ms: 260,
      planning_complete_ms: 1100,
      context_ready_ms: 1300,
      answer_ready_ms: 1900,
      first_audio_ms: 2350,
    });
    expect(Object.keys(tracker.snapshot())).toEqual(expect.not.arrayContaining([
      'prompt', 'message', 'text', 'transcript', 'thread_id', 'run_id', 'object_id',
    ]));
  });

  it('omits stages that have not happened and preserves the first mark', () => {
    let now = 500;
    const tracker = createConversationLatencyTracker(() => now);
    tracker.mark('speech_stopped');
    now = 800;
    tracker.mark('speech_stopped');
    expect(tracker.snapshot()).toEqual({});
    now = 1_000;
    tracker.mark('answer_ready');
    expect(tracker.snapshot()).toEqual({ answer_ready_ms: 500 });
  });
});
