import { Asset } from 'expo-asset';
import { resolveLocalAudioAsset } from './audioAssetDelivery';
import {
  soundscapeLoopAdmission,
  type SoundscapeId,
} from './soundscapeCatalog';

export type PreparedSoundscapeLoopAsset = {
  uri: string;
  assetKey: string;
  sampleRateHz: 48_000;
  channels: 2;
};

export type SoundscapeAssetErrorCode =
  | 'download_failed'
  | 'bundled_asset_unavailable'
  | 'invalid_local_uri';

export class SoundscapeAssetError extends Error {
  constructor(
    public readonly code: SoundscapeAssetErrorCode,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.name = 'SoundscapeAssetError';
  }
}

function requireLocalUri(uri: string | null | undefined, code: SoundscapeAssetErrorCode): string {
  if (!uri?.startsWith('file:')) throw new SoundscapeAssetError(code);
  return uri;
}

export async function prepareSoundscapeLoopAsset(
  id: SoundscapeId,
): Promise<PreparedSoundscapeLoopAsset> {
  const admission = soundscapeLoopAdmission(id);
  let uri: string;

  if (admission.source.kind === 'bundled') {
    const asset = Asset.fromModule(admission.source.module);
    await asset.downloadAsync();
    uri = requireLocalUri(asset.localUri, 'bundled_asset_unavailable');
  } else {
    try {
      const resolved = await resolveLocalAudioAsset(admission.source.id);
      uri = requireLocalUri(resolved.uri, 'invalid_local_uri');
    } catch (error) {
      if (error instanceof SoundscapeAssetError) throw error;
      throw new SoundscapeAssetError('download_failed', { cause: error });
    }
  }

  return {
    uri,
    assetKey: admission.assetKey,
    sampleRateHz: admission.sampleRateHz,
    channels: admission.channels,
  };
}
