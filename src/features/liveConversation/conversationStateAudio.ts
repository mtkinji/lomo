export type ConversationStateAudioPlayer = {
  volume: number;
  seekTo(seconds: number): void | Promise<void>;
  play(): void;
  pause?(): void;
  remove(): void;
};

type ConversationStateAudioDependencies<Source> = {
  source: Source;
  gain: number;
  createPlayer(source: Source, options: { keepAudioSessionActive: true }): ConversationStateAudioPlayer;
};

/** Short, nonverbal receipt that speech ended and the turn entered the Chat runtime. */
export function createConversationStateAudio<Source>(
  dependencies: ConversationStateAudioDependencies<Source>,
) {
  let player: ConversationStateAudioPlayer | null = null;

  const ensurePlayer = () => {
    if (player) return player;
    player = dependencies.createPlayer(dependencies.source, { keepAudioSessionActive: true });
    player.volume = dependencies.gain;
    return player;
  };

  return {
    async playTurnReceived(): Promise<void> {
      try {
        const current = ensurePlayer();
        current.volume = dependencies.gain;
        await current.seekTo(0);
        current.play();
      } catch {
        try { player?.remove(); } catch { /* Best-effort feedback must not block the turn. */ }
        player = null;
      }
    },

    stop() {
      try { player?.pause?.(); } catch { /* The live audio route may already own playback. */ }
    },

    unload() {
      try { player?.remove(); } catch { /* The native player may already be released. */ }
      player = null;
    },
  };
}
