jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-file-system', () => ({
  File: class MockFile {
    uri: string;
    constructor(uri: string) { this.uri = uri; }
  },
}));

import { uploadFileToSignedUrl } from './uploadFileToSignedUrl';
import { fetch as expoFetch } from 'expo/fetch';

const mockExpoFetch = expoFetch as jest.Mock;

describe('uploadFileToSignedUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExpoFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  it('uploads the original local file as the binary request body', async () => {
    await uploadFileToSignedUrl({
      signedUrl: 'https://storage.example/upload',
      fileUri: 'file:///recording.m4a',
      mimeType: 'audio/m4a',
    });

    expect(mockExpoFetch).toHaveBeenCalledWith('https://storage.example/upload', {
      method: 'PUT',
      body: expect.objectContaining({ uri: 'file:///recording.m4a' }),
      headers: { 'Content-Type': 'audio/m4a' },
    });
  });

  it('preserves upload failure status reporting', async () => {
    mockExpoFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(uploadFileToSignedUrl({
      signedUrl: 'https://storage.example/upload',
      fileUri: 'file:///photo.jpg',
    })).rejects.toThrow('Upload failed (status 403)');
  });
});
