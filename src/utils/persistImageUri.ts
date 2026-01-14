import * as FileSystem from 'expo-file-system/legacy';

function guessImageExtension(uri: string): string {
  const withoutQuery = uri.split('?')[0] ?? uri;
  const lastDot = withoutQuery.lastIndexOf('.');
  if (lastDot === -1) return 'jpg';
  const ext = withoutQuery.slice(lastDot + 1).toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'heic') return ext;
  return 'jpg';
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Persist an image URI into app-owned storage so it survives app restarts/updates.
 *
 * ImagePicker commonly returns a transient cache path; storing that URI directly in
 * persisted app state can lead to "missing images after update".
 */
export async function persistImageUri(params: {
  uri: string;
  subdir: string;
  namePrefix: string;
}): Promise<string> {
  const { uri, subdir, namePrefix } = params;
  if (!uri) return uri;

  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) return uri;

  const targetDir = `${ensureTrailingSlash(baseDir)}${subdir.replace(/^\/+/, '').replace(/\/+$/, '')}/`;
  try {
    await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
  } catch {
    // best-effort
  }

  const ext = guessImageExtension(uri);
  const filename = `${namePrefix}-${Date.now()}.${ext}`;
  const dest = `${targetDir}${filename}`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    // If copying fails (e.g. unsupported URI scheme), fall back to original.
    return uri;
  }
}




