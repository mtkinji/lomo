type PlaybackStatus = {
  playing: boolean;
  didJustFinish: boolean;
  isLoaded?: boolean;
  error?: string | null;
};

type ConversationAudioPlayer = {
  play(): void;
  pause?(): void;
  remove(): void;
  addListener(
    event: 'playbackStatusUpdate',
    listener: (status: PlaybackStatus) => void,
  ): { remove(): void };
};

type ConversationSpeechFallback = {
  speak(text: string, onStart?: () => void): Promise<void>;
  stop(): Promise<void> | void;
};

type LiveConversationSpeechDependencies = {
  getAccessToken(): Promise<string | null | undefined>;
  getPublishableKey(): string | null | undefined;
  getFunctionUrl(): string | null | undefined;
  createPlayer(
    source: { uri: string; headers: Record<string, string> },
    options: {
      downloadFirst: false;
      keepAudioSessionActive: true;
      preferredForwardBufferDuration: 0;
      updateInterval: 100;
    },
  ): ConversationAudioPlayer;
  fallback: ConversationSpeechFallback;
  startTimeoutMs?: number;
};

type SpeechCallbacks = {
  onStart?: () => void;
  onFallback?: () => void;
};

export function createLiveConversationSpeech(dependencies: LiveConversationSpeechDependencies) {
  const startTimeoutMs = dependencies.startTimeoutMs ?? 8_000;
  let generation = 0;
  let active: { cancel(): void } | null = null;

  const cancelActive = async () => {
    const current = active;
    active = null;
    current?.cancel();
    await dependencies.fallback.stop();
  };

  return {
    async speakMessage(
      message: { id: string; body: string },
      callbacks: SpeechCallbacks = {},
    ): Promise<void> {
      generation += 1;
      const currentGeneration = generation;
      await cancelActive();
      if (generation !== currentGeneration) return;

      const [token, publishableKey, functionUrl] = await Promise.all([
        dependencies.getAccessToken(),
        Promise.resolve(dependencies.getPublishableKey()),
        Promise.resolve(dependencies.getFunctionUrl()),
      ]);
      if (generation !== currentGeneration) return;

      const fallbackOnly = async () => {
        if (generation !== currentGeneration) return;
        callbacks.onFallback?.();
        await dependencies.fallback.speak(message.body, callbacks.onStart);
      };
      if (!token?.trim() || !publishableKey?.trim() || !functionUrl?.trim()) {
        await fallbackOnly();
        return;
      }

      await new Promise<void>((resolve, reject) => {
        let player: ConversationAudioPlayer;
        try {
          player = dependencies.createPlayer({
            uri: `${functionUrl}?message_id=${encodeURIComponent(message.id)}`,
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: publishableKey,
              'x-kwilt-client': 'kwilt-mobile',
            },
          }, {
            downloadFirst: false,
            keepAudioSessionActive: true,
            preferredForwardBufferDuration: 0,
            updateInterval: 100,
          });
        } catch {
          void fallbackOnly().then(resolve, reject);
          return;
        }

        let settled = false;
        let started = false;
        let fallbackStarted = false;
        let playerRemoved = false;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let subscription: { remove(): void } | null = null;

        const removePlayer = () => {
          if (timeout) clearTimeout(timeout);
          timeout = null;
          subscription?.remove();
          subscription = null;
          if (playerRemoved) return;
          playerRemoved = true;
          try {
            player.remove();
          } catch {
            // A route interruption may have already released the native object.
          }
        };
        const finish = (error?: unknown) => {
          if (settled) return;
          settled = true;
          removePlayer();
          if (active?.cancel === cancel) active = null;
          if (error instanceof Error) reject(error);
          else resolve();
        };
        const useFallback = () => {
          if (settled || fallbackStarted || generation !== currentGeneration) return;
          fallbackStarted = true;
          removePlayer();
          if (active?.cancel === cancel) active = null;
          callbacks.onFallback?.();
          void Promise.resolve(dependencies.fallback.speak(message.body, callbacks.onStart)).then(
            () => finish(),
            (error) => finish(error),
          );
        };
        const cancel = () => {
          if (settled) return;
          try {
            player.pause?.();
          } catch {
            // The player may already be unavailable.
          }
          finish();
        };

        active = { cancel };
        subscription = player.addListener('playbackStatusUpdate', (status) => {
          if (status.playing && !started) {
            started = true;
            if (timeout) clearTimeout(timeout);
            timeout = null;
            callbacks.onStart?.();
          }
          if (status.didJustFinish) finish();
          else if (!started && status.isLoaded === false && status.error) useFallback();
        });
        timeout = setTimeout(useFallback, startTimeoutMs);
        try {
          player.play();
        } catch {
          useFallback();
        }
      });
    },

    async stop(): Promise<void> {
      generation += 1;
      await cancelActive();
    },
  };
}
