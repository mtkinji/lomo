import { File } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { fetch as expoFetch } from 'expo/fetch';
import { getAccessToken } from '../../services/backend/auth';
import { getSupabasePublishableKey, getSupabaseUrl } from '../../utils/getEnv';
export async function homePhotoSource(path: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to see photos.');
  return {
    uri: `${getSupabaseUrl()}/storage/v1/object/authenticated/home-moments/${path}?v=${randomUUID()}`,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: getSupabasePublishableKey() ?? '',
      'Cache-Control': 'no-store',
    },
  };
}
export async function uploadHomePhoto(uri: string, path: string) {
  const source = await homePhotoSource(path);
  const response = await expoFetch(
    source.uri.replace('/object/authenticated/', '/object/').split('?')[0],
    {
      method: 'POST',
      body: new File(uri),
      headers: {
        ...source.headers,
        'Cache-Control': 'max-age=0',
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
    },
  );
  if (!response.ok)
    throw new Error('Photo upload failed. Your draft is saved; try again.');
}
