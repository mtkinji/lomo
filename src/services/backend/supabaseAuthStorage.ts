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
  private didAttemptAuthTokenMigration = false;
  private pendingWrites = new Set<Promise<unknown>>();
  private didClearAuthSessionKeys = false;

  /**
   * Supabase can kick off PKCE writes without awaiting our storage writes.
   * If we immediately background the app to open the system browser, iOS can
   * suspend/kill the JS context before AsyncStorage flushes the code verifier.
   *
   * `flush()` allows callers (our auth flow) to await all in-flight writes.
   */
  async flush(): Promise<void> {
    const pending = Array.from(this.pendingWrites);
    if (pending.length === 0) return;
    await Promise.allSettled(pending);
  }

  /**
   * Clear persisted Supabase session keys (refresh/access token blob) so the app can recover
   * from "Invalid Refresh Token" loops in dev/simulator environments.
   *
   * This is intentionally conservative: it removes our stable key plus any legacy Supabase keys
   * that look like session JSON so they can't re-migrate on next launch.
   */
  async clearAuthSessionKeys(): Promise<void> {
    if (this.didClearAuthSessionKeys) return;
    this.didClearAuthSessionKeys = true;

    let keys: string[] = [];
    try {
      const raw = await AsyncStorage.getAllKeys();
      keys = Array.isArray(raw) ? (raw as any) : [];
    } catch {
      keys = [];
    }

    const targetKey = 'kwilt.supabase.auth';
    const candidates = keys
      .filter((k) => typeof k === 'string')
      .filter((k) => {
        const kk = String(k ?? '');
        return (
          kk === targetKey ||
          kk.includes('auth-token') ||
          kk.includes('supabase.auth') ||
          (kk.startsWith('sb-') && kk.endsWith('-auth-token'))
        );
      });

    const toRemove = new Set<string>();
    // Always remove our stable key if present.
    toRemove.add(targetKey);

    // Remove legacy keys only if they look like session JSON (avoid deleting unrelated storage).
    for (const k of candidates) {
      if (k === targetKey) continue;
      try {
        const v = await AsyncStorage.getItem(k);
        if (typeof v !== 'string' || v.length < 20) continue;
        const looksLikeSession =
          v.includes('"access_token"') && v.includes('"refresh_token"') && v.includes('"user"');
        if (looksLikeSession) toRemove.add(k);
      } catch {
        // ignore
      }
    }

    // Clear memory cache and AsyncStorage.
    for (const k of Array.from(toRemove)) {
      this.memory.delete(k);
    }

    // Best-effort: flush any pending writes first so we don't race with auth internals.
    await this.flush().catch(() => undefined);

    await Promise.allSettled(
      Array.from(toRemove).map(async (k) => {
        try {
          await AsyncStorage.removeItem(k);
        } catch {
          // ignore
        }
      }),
    );
  }

  private async maybeMigrateAuthToken(targetKey: string): Promise<string | null> {
    if (this.didAttemptAuthTokenMigration) return null;
    this.didAttemptAuthTokenMigration = true;

    // We only attempt migration for our explicit stable storage key.
    if (targetKey !== 'kwilt.supabase.auth') return null;

    try {
      const keys = await AsyncStorage.getAllKeys();
      if (!Array.isArray(keys) || keys.length === 0) return null;

      // Supabase JS historically uses keys like:
      // - sb-<project-ref>-auth-token
      // - sb-auth-token
      // Some builds may also use other prefixes; we scan broadly but validate content.
      const candidates = keys
        .filter((k) => k !== targetKey)
        .filter((k) => {
          const kk = String(k ?? '');
          return (
            kk.includes('auth-token') ||
            kk.includes('supabase.auth') ||
            (kk.startsWith('sb-') && kk.endsWith('-auth-token'))
          );
        })
        .sort((a, b) => {
          // Prefer explicit auth-token keys.
          const aScore = a.includes('auth-token') ? 0 : 1;
          const bScore = b.includes('auth-token') ? 0 : 1;
          return aScore - bScore;
        });

      for (const k of candidates) {
        const v = await AsyncStorage.getItem(k);
        if (typeof v !== 'string' || v.length < 20) continue;

        // Heuristic: Supabase session JSON includes these fields.
        const looksLikeSession =
          v.includes('"access_token"') && v.includes('"refresh_token"') && v.includes('"user"');
        if (!looksLikeSession) continue;

        // Cache and persist under the new key.
        this.memory.set(targetKey, v);
        try {
          await AsyncStorage.setItem(targetKey, v);
        } catch (err) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[auth] failed to migrate supabase session storage key', err);
          }
        }
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[auth] migrated supabase session storage key:', { from: k, to: targetKey });
        }
        return v;
      }
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[auth] supabase session migration scan failed', err);
      }
    }

    return null;
  }

  async getItem(key: string): Promise<string | null> {
    if (this.memory.has(key)) return this.memory.get(key) ?? null;
    const v = await AsyncStorage.getItem(key);
    if (typeof v === 'string') {
      this.memory.set(key, v);
      return v;
    }
    const migrated = await this.maybeMigrateAuthToken(key);
    if (typeof migrated === 'string') return migrated;
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memory.set(key, value);
    let p: Promise<unknown> | null = null;
    try {
      p = AsyncStorage.setItem(key, value);
      this.pendingWrites.add(p);
      await p.finally(() => {
        if (p) this.pendingWrites.delete(p);
      });
    } catch (err) {
      // Best-effort: memory cache is enough to complete in-flight auth flows.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[auth] SupabaseAuthStorage setItem failed', { key }, err);
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memory.delete(key);
    let p: Promise<unknown> | null = null;
    try {
      p = AsyncStorage.removeItem(key);
      this.pendingWrites.add(p);
      await p.finally(() => {
        if (p) this.pendingWrites.delete(p);
      });
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[auth] SupabaseAuthStorage removeItem failed', { key }, err);
      }
    }
  }
}


