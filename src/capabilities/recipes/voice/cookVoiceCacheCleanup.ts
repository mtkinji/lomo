import { Directory, File, Paths } from 'expo-file-system';

const LEGACY_COOK_VOICE_PREFIX = 'kwilt-cook-voice-';
const LEGACY_COOK_VOICE_TTL_MS = 60 * 60 * 1_000;

export function shouldDeleteLegacyCookVoiceFile(
  file: { name: string; modificationTime: number | null },
  now = Date.now(),
): boolean {
  return file.name.startsWith(LEGACY_COOK_VOICE_PREFIX) &&
    file.modificationTime !== null &&
    now - file.modificationTime > LEGACY_COOK_VOICE_TTL_MS;
}

let sweepStarted = false;

export async function sweepLegacyCookVoiceCacheOnce(now = Date.now()): Promise<void> {
  if (sweepStarted) return;
  sweepStarted = true;
  let entries: (Directory | File)[];
  try {
    entries = new Directory(Paths.cache).list();
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!(entry instanceof File) || !shouldDeleteLegacyCookVoiceFile(entry, now)) continue;
    try {
      entry.delete();
    } catch {
      // Cleanup is best-effort and must never block voice startup.
    }
  }
}
