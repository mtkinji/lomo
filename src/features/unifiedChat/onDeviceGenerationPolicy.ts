import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  KwiltGenerationJobId,
  KwiltLocalPromotion,
} from '@kwilt/agent-runtime';
import { posthogClient } from '../../services/analytics/posthogClient';

const STORAGE_KEY = 'kwilt:on-device-generation-policy:v1';
const FLAG_PREFIX = 'kwilt-on-device-generation-';

type EffectiveLocalPromotion = KwiltLocalPromotion | 'disabled';

type PolicyStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

type FeatureFlags = {
  getFeatureFlag?: (key: string) => boolean | string | null | undefined;
};

type CachedPolicy = {
  disabledJobs: KwiltGenerationJobId[];
};

function parseDisabledJobs(raw: string | null): Set<KwiltGenerationJobId> {
  if (!raw) return new Set();
  try {
    const value = JSON.parse(raw) as Partial<CachedPolicy>;
    if (!Array.isArray(value.disabledJobs)) return new Set();
    return new Set(value.disabledJobs.filter((job): job is KwiltGenerationJobId => (
      typeof job === 'string'
    )));
  } catch {
    return new Set();
  }
}

export function createOnDeviceGenerationPolicy({
  storage,
  flags,
}: {
  storage: PolicyStorage;
  flags?: FeatureFlags;
}) {
  let disabledJobs: Set<KwiltGenerationJobId> | undefined;

  const hydrate = async () => {
    if (disabledJobs) return;
    const raw = await storage.getItem(STORAGE_KEY).catch(() => null);
    disabledJobs = parseDisabledJobs(raw);
  };

  const persist = async () => {
    if (!disabledJobs) return;
    const cached: CachedPolicy = {
      disabledJobs: [...disabledJobs].sort(),
    };
    await storage.setItem(STORAGE_KEY, JSON.stringify(cached)).catch(() => undefined);
  };

  return {
    async resolve(
      jobId: KwiltGenerationJobId,
      bundledPromotion: KwiltLocalPromotion,
    ): Promise<EffectiveLocalPromotion> {
      if (bundledPromotion !== 'default') return bundledPromotion;
      await hydrate();

      let remoteValue: boolean | string | null | undefined;
      try {
        remoteValue = flags?.getFeatureFlag?.(`${FLAG_PREFIX}${jobId}`);
      } catch {
        remoteValue = undefined;
      }
      if (remoteValue === false) {
        disabledJobs?.add(jobId);
        await persist();
      } else if (remoteValue === true && disabledJobs?.delete(jobId)) {
        await persist();
      }

      return disabledJobs?.has(jobId) ? 'disabled' : bundledPromotion;
    },
  };
}

const defaultPolicy = createOnDeviceGenerationPolicy({
  storage: AsyncStorage,
  flags: posthogClient as FeatureFlags | undefined,
});

export const resolveOnDeviceGenerationPromotion = defaultPolicy.resolve;
