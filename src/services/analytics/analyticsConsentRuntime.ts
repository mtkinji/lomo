import { PostHogPersistedProperty } from 'posthog-react-native';

export type ConsentManagedAnalyticsClient = {
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
  ready: () => Promise<void>;
  reset: () => void;
  setPersistedProperty: (key: PostHogPersistedProperty, value: unknown) => void;
};

export function createAnalyticsConsentRuntime<T extends ConsentManagedAnalyticsClient>(
  createClient: () => T,
) {
  let client: T | undefined;
  let generation = 0;

  const withdraw = async (target: T): Promise<void> => {
    await target.ready();
    target.setPersistedProperty(PostHogPersistedProperty.Queue, null);
    target.setPersistedProperty(PostHogPersistedProperty.AiQueue, null);
    target.setPersistedProperty(PostHogPersistedProperty.LogsQueue, null);
    target.reset();
    await target.optOut();
  };

  return {
    getClient: () => client,
    apply: async (enabled: boolean): Promise<void> => {
      const applyGeneration = ++generation;
      if (!enabled) {
        const prior = client;
        client = undefined;
        if (!prior) return;

        await withdraw(prior);
        return;
      }

      if (client) return;
      const next = createClient();
      await next.ready();
      await next.optIn();
      if (generation === applyGeneration) {
        client = next;
      } else {
        await withdraw(next);
      }
    },
  };
}
