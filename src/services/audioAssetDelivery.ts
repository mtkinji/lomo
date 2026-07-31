import * as FileSystem from 'expo-file-system/legacy';
import { remoteAudioAsset, type RemoteAudioAssetId } from './audioAssetCatalog';

export type AudioSourceKind = 'cache' | 'remote';
export type ResolvedAudioAsset = { uri: string; sourceKind: AudioSourceKind };

const CACHE_FOLDER = 'kwilt-audio/';
const inFlightDownloads = new Map<RemoteAudioAssetId, Promise<string>>();

function cacheDirectory() {
  return FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}${CACHE_FOLDER}` : null;
}

function cachePath(id: RemoteAudioAssetId) {
  const directory = cacheDirectory();
  return directory ? `${directory}${remoteAudioAsset(id).cacheFileName}` : null;
}

async function verifiedCachePath(id: RemoteAudioAssetId) {
  const path = cachePath(id);
  if (!path) return null;
  const entry = remoteAudioAsset(id);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && !info.isDirectory && info.size === entry.expectedBytes) return path;
  if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
  return null;
}

export async function resolveAudioAsset(id: RemoteAudioAssetId): Promise<ResolvedAudioAsset> {
  const cached = await verifiedCachePath(id);
  if (cached) return { uri: cached, sourceKind: 'cache' };
  void cacheAudioAsset(id).catch(() => undefined);
  return { uri: remoteAudioAsset(id).url, sourceKind: 'remote' };
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
    if (!directory || !destination) throw new Error('Audio cache is unavailable');

    const entry = remoteAudioAsset(id);
    const temporary = `${destination}.download`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => undefined);

    try {
      const result = await FileSystem.downloadAsync(entry.url, temporary);
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Audio download failed with status ${result.status}`);
      }
      const info = await FileSystem.getInfoAsync(temporary);
      if (!info.exists || info.isDirectory || info.size !== entry.expectedBytes) {
        throw new Error('Audio download size mismatch');
      }
      await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined);
      await FileSystem.moveAsync({ from: temporary, to: destination });
      return destination;
    } catch (error) {
      await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => undefined);
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
