import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hybrid storage for Supabase Auth:
 * - Writes are mirrored into an in-memory Map immediately (sync in JS).
 * - Writes are also persisted to AsyncStorage (async).
 *
 * This significantly reduces "invalid flow state" issues in Expo Go where the
 * PKCE code verifier/state write may not flush before the app backgrounds into
 * the browser.
 */
export class SupabaseAuthStorage {
  private memory = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    if (this.memory.has(key)) return this.memory.get(key) ?? null;
    const v = await AsyncStorage.getItem(key);
    if (typeof v === 'string') {
      this.memory.set(key, v);
      return v;
    }
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memory.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Best-effort: memory cache is enough to complete in-flight auth flows.
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memory.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}


