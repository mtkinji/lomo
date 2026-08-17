import { Directory, File, Paths } from 'expo-file-system';
import { remoteAudioAsset, type RemoteAudioAssetId } from './audioAssetCatalog';

export type AudioSourceKind = 'cache' | 'remote';
export type ResolvedAudioAsset = { uri: string; sourceKind: AudioSourceKind };

const CACHE_FOLDER = 'kwilt-audio';
const inFlightDownloads = new Map<RemoteAudioAssetId, Promise<string>>();

function cacheDirectory() {
  return new Directory(Paths.cache, CACHE_FOLDER);
}

function cachePath(id: RemoteAudioAssetId) {
  return new File(cacheDirectory(), remoteAudioAsset(id).cacheFileName);
}

async function verifiedCachePath(id: RemoteAudioAssetId) {
  const file = cachePath(id);
  const entry = remoteAudioAsset(id);
  if (file.exists && file.size === entry.expectedBytes) return file.uri;
  if (file.exists) {
    try { file.delete(); } catch { /* best-effort */ }
  }
  return null;
}

export async function resolveAudioAsset(id: RemoteAudioAssetId): Promise<ResolvedAudioAsset> {
  const cached = await verifiedCachePath(id);
  if (cached) return { uri: cached, sourceKind: 'cache' };
  void cacheAudioAsset(id).catch(() => undefined);
  return { uri: remoteAudioAsset(id).url, sourceKind: 'remote' };
}

export async function resolveLocalAudioAsset(id: RemoteAudioAssetId): Promise<ResolvedAudioAsset> {
  const uri = await cacheAudioAsset(id);
  if (!uri.startsWith('file:')) throw new Error('Audio cache did not return a local file URI');
  return { uri, sourceKind: 'cache' };
}

export function prefetchAudioAsset(id: RemoteAudioAssetId) {
  return cacheAudioAsset(id).then(() => undefined);
}

export function cacheAudioAsset(id: RemoteAudioAssetId): Promise<string> {
  const existing = inFlightDownloads.get(id);
  if (existing) return existing;

  const operation = (async () => {
    const cached = await verifiedCachePath(id);
    if (cached) return cached;

    const directory = cacheDirectory();
    const destination = cachePath(id);

    const entry = remoteAudioAsset(id);
    const temporary = new File(directory, `${entry.cacheFileName}.download`);
    directory.create({ intermediates: true, idempotent: true });
    if (temporary.exists) {
      try { temporary.delete(); } catch { /* best-effort */ }
    }

    try {
      const downloaded = await File.downloadFileAsync(entry.url, temporary, { idempotent: true });
      if (!downloaded.exists || downloaded.size !== entry.expectedBytes) {
        throw new Error('Audio download size mismatch');
      }
      if (destination.exists) {
        try { destination.delete(); } catch { /* best-effort */ }
      }
      downloaded.move(destination);
      return destination.uri;
    } catch (error) {
      if (temporary.exists) {
        try { temporary.delete(); } catch { /* best-effort */ }
      }
      throw error;
    }
  })();

  inFlightDownloads.set(id, operation);
  void operation.finally(() => {
    if (inFlightDownloads.get(id) === operation) inFlightDownloads.delete(id);
  }).catch(() => undefined);
  return operation;
}

export function clearAudioAssetDeliveryStateForTests() {
  inFlightDownloads.clear();
}
