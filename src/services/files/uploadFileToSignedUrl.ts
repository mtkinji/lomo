import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

export async function uploadFileToSignedUrl(params: {
  signedUrl: string;
  fileUri: string;
  mimeType?: string | null;
}): Promise<void> {
  const response = await expoFetch(params.signedUrl, {
    method: 'PUT',
    body: new File(params.fileUri),
    headers: {
      'Content-Type': params.mimeType?.trim() ? params.mimeType.trim() : 'application/octet-stream',
    },
  });
  if (!response.ok) {
    throw new Error(`Upload failed (status ${response.status})`);
  }
}
