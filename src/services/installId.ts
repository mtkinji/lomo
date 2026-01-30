import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_ID_STORAGE_KEY = 'kwilt-install-id-v1';

function generateUuidV4Fallback(): string {
  // Best-effort UUID (not cryptographically strong). This is used only as a
  // stable install identifier for quota bucketing before login.
  // Prefer native/web crypto.randomUUID when available.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getInstallId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_ID_STORAGE_KEY);
    if (existing && existing.trim().length > 0) return existing.trim();
  } catch {
    // If storage is temporarily unavailable/corrupted, fall back to an ephemeral ID.
    // Callers (like AI proxy) require *some* install id; persistence is best-effort.
  }

  const generated =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : generateUuidV4Fallback();

  try {
    await AsyncStorage.setItem(INSTALL_ID_STORAGE_KEY, generated);
  } catch {
    // best-effort only
  }
  return generated;
}


