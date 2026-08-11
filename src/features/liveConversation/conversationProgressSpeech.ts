import type { ConversationProgressCueId } from './conversationProgressCue';

type ProgressPlaybackStatus = {
  playing: boolean;
  didJustFinish: boolean;
  isLoaded?: boolean;
  error?: string | null;
};

export type ConversationProgressPlayer = {
  play(): void;
  pause?(): void;
  remove(): void;
  addListener(
    event: 'playbackStatusUpdate',
    listener: (status: ProgressPlaybackStatus) => void,
  ): { remove(): void };
};

type ConversationProgressSpeechDependencies<Source> = {
  sourceForCue(cueId: ConversationProgressCueId): Source;
  createPlayer(
    source: Source,
    options: { downloadFirst: false; keepAudioSessionActive: true; updateInterval: 100 },
  ): ConversationProgressPlayer;
};

export function createConversationProgressSpeech<Source>(
  dependencies: ConversationProgressSpeechDependencies<Source>,
) {
  let active: {
    started: boolean;
    cancel(): void;
    completion: Promise<void>;
  } | null = null;

  const stop = () => {
    active?.cancel();
    active = null;
  };

  return {
    start(cueId: ConversationProgressCueId, onStart?: () => void): Promise<void> {
      stop();
      let player: ConversationProgressPlayer;
      try {
        player = dependencies.createPlayer(dependencies.sourceForCue(cueId), {
          downloadFirst: false,
          keepAudioSessionActive: true,
          updateInterval: 100,
        });
      } catch {
        return Promise.resolve();
      }
      let settled = false;
      let resolveCompletion: () => void = () => undefined;
      let subscription: { remove(): void } | null = null;
      const completion = new Promise<void>((resolve) => { resolveCompletion = resolve; });
      const finish = () => {
        if (settled) return;
        settled = true;
        subscription?.remove();
        subscription = null;
        try { player.remove(); } catch { /* The native player may already be released. */ }
        if (active?.completion === completion) active = null;
        resolveCompletion();
      };
      const current = {
        started: false,
        cancel: () => {
          if (settled) return;
          try { player.pause?.(); } catch { /* Interruption can release the audio route first. */ }
          finish();
        },
        completion,
      };
      active = current;
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.playing && !current.started) {
          current.started = true;
          onStart?.();
        }
        if (status.didJustFinish || (!current.started && status.isLoaded === false && status.error)) {
          finish();
        }
      });
      try { player.play(); } catch { finish(); }
      return completion;
    },

    async finishBeforeFinalAnswer(): Promise<void> {
      const current = active;
      if (!current) return;
      if (!current.started) current.cancel();
      await current.completion;
    },

    stop,
  };
}
