import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnvVar } from '../utils/getEnv';

const STORAGE_KEY = 'lomo.openAiApiKey';
const LOG_PREFIX = '[openAiKey]';

const describeKey = (key?: string | null) =>
  key ? { present: true, length: key.length } : { present: false };

const devLog = (context: string, details?: Record<string, unknown>) => {
  if (!__DEV__) {
    return;
  }
  if (details) {
    console.log(`${LOG_PREFIX} ${context}`, details);
  } else {
    console.log(`${LOG_PREFIX} ${context}`);
  }
};

let inMemoryKey = getEnvVar<string>('openAiApiKey');
let loadPromise: Promise<string | undefined> | null = null;

devLog('boot', { envKey: describeKey(inMemoryKey) });

export async function resolveOpenAiApiKey(): Promise<string | undefined> {
  if (inMemoryKey) {
    devLog('resolve:memory-hit', describeKey(inMemoryKey));
    return inMemoryKey;
  }

  if (!loadPromise) {
    devLog('resolve:storage-load-start');
    loadPromise = (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        devLog('resolve:storage-result', describeKey(stored));
        if (stored) {
          inMemoryKey = stored;
          return stored;
        }
      } catch (err) {
        console.warn('Failed to read stored OpenAI key', err);
        devLog('resolve:storage-error', {
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        loadPromise = null;
      }
      return undefined;
    })();
  } else {
    devLog('resolve:awaiting-existing-read');
  }

  return loadPromise;
}

export async function injectOpenAiApiKey(key: string): Promise<void> {
  inMemoryKey = key;
  devLog('inject', describeKey(key));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, key);
    devLog('inject:stored');
  } catch (err) {
    console.warn('Unable to persist OpenAI key', err);
    devLog('inject:error', { message: err instanceof Error ? err.message : String(err) });
  }
}

export async function clearInjectedOpenAiApiKey(): Promise<void> {
  inMemoryKey = undefined;
  devLog('clear');
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    devLog('clear:stored-key-removed');
  } catch (err) {
    console.warn('Unable to clear stored OpenAI key', err);
    devLog('clear:error', { message: err instanceof Error ? err.message : String(err) });
  }
}

export function getCachedOpenAiApiKey(): string | undefined {
  devLog('getCached', describeKey(inMemoryKey));
  return inMemoryKey;
}

if (__DEV__) {
  // Expose helpers so developers can inject keys from the JS console.
  // @ts-expect-error - attaching helpers for dev ergonomics.
  globalThis.setLomoOpenAiKey = injectOpenAiApiKey;
  // @ts-expect-error - attaching helpers for dev ergonomics.
  globalThis.clearLomoOpenAiKey = clearInjectedOpenAiApiKey;
}


