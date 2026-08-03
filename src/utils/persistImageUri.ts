import { Directory, File, Paths } from 'expo-file-system';

function guessImageExtension(uri: string): string {
  const withoutQuery = uri.split('?')[0] ?? uri;
  const lastDot = withoutQuery.lastIndexOf('.');
  if (lastDot === -1) return 'jpg';
  const ext = withoutQuery.slice(lastDot + 1).toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'heic') return ext;
  return 'jpg';
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

  const normalizedSubdir = subdir.replace(/^\/+/, '').replace(/\/+$/, '');
  const targetDir = new Directory(Paths.document, normalizedSubdir);
  try {
    targetDir.create({ intermediates: true, idempotent: true });
  } catch {
    // best-effort
  }

  const ext = guessImageExtension(uri);
  const filename = `${namePrefix}-${Date.now()}.${ext}`;
  const destination = new File(targetDir, filename);

  try {
    new File(uri).copy(destination);
    return destination.uri;
  } catch {
    // If copying fails (e.g. unsupported URI scheme), fall back to original.
    return uri;
  }
}



