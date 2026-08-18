import { resolveHouseholdAvatars, resolveSelfAvatar, uploadAvatar, removeAvatar } from './householdAvatars';
import { getAccessToken } from '../../../services/backend/auth';
import { uploadFileToSignedUrl } from '../../../services/files/uploadFileToSignedUrl';

jest.mock('../../../services/backend/auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('../../../services/edgeFunctions', () => ({
  getEdgeFunctionUrlCandidates: () => ['https://example.test/household-avatars'],
  getEdgeFunctionUrl: () => 'https://example.test/household-avatars',
}));
jest.mock('../../../utils/getEnv', () => ({ getSupabasePublishableKey: () => 'publishable-key' }));
jest.mock('../../../services/files/uploadFileToSignedUrl', () => ({ uploadFileToSignedUrl: jest.fn() }));

const mockFetch = jest.fn();

describe('Household avatar client boundary', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getAccessToken as jest.Mock).mockResolvedValue('access-token');
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  function response(body: unknown, ok = true, status = 200) {
    return { ok, status, text: jest.fn(async () => JSON.stringify(body)) };
  }

  it('parses a household projection without accepting raw identifiers or paths', async () => {
    mockFetch.mockResolvedValue(response({ members: [
      { membershipId: 'member-1', avatarSource: 'account', avatarUrl: 'https://signed.test/a' },
      { membershipId: 'member-2', avatarSource: 'initials', avatarUrl: null, userId: 'secret', storagePath: 'secret' },
    ] }));

    await expect(resolveHouseholdAvatars()).resolves.toEqual({
      'member-1': { avatarSource: 'account', avatarUrl: 'https://signed.test/a' },
      'member-2': { avatarSource: 'initials', avatarUrl: null },
    });
    expect(mockFetch).toHaveBeenCalledWith('https://example.test/household-avatars', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ action: 'resolve-household' }),
    }));
  });

  it('rejects malformed projections and non-https display URLs', async () => {
    mockFetch.mockResolvedValueOnce(response({ members: [{ membershipId: 'member-1', avatarSource: 'provider', avatarUrl: null }] }));
    await expect(resolveHouseholdAvatars()).rejects.toThrow('Invalid Household avatar response');
    mockFetch.mockResolvedValueOnce(response({ avatarSource: 'account', avatarUrl: 'file:///private/avatar.jpg' }));
    await expect(resolveSelfAvatar()).rejects.toThrow('Invalid avatar response');
  });

  it('uploads through init, signed PUT, and confirm while returning only the confirmed display URL', async () => {
    mockFetch
      .mockResolvedValueOnce(response({ uploadId: 'upload-1', upload: { signedUrl: 'https://upload.test/signed' } }))
      .mockResolvedValueOnce(response({ membershipId: 'member-2', avatarSource: 'dependent', avatarUrl: 'https://signed.test/new' }));

    await expect(uploadAvatar({
      source: 'dependent', membershipId: 'member-2', fileUri: 'file:///picked.jpg',
      mimeType: 'image/jpeg', sizeBytes: 123,
    })).resolves.toEqual({ avatarSource: 'dependent', avatarUrl: 'https://signed.test/new' });
    expect(uploadFileToSignedUrl).toHaveBeenCalledWith({
      signedUrl: 'https://upload.test/signed', fileUri: 'file:///picked.jpg', mimeType: 'image/jpeg',
    });
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({
      body: JSON.stringify({
        action: 'confirm-upload', source: 'dependent', membershipId: 'member-2',
        uploadId: 'upload-1',
      }),
    }));
  });

  it('removes only the requested canonical source', async () => {
    mockFetch.mockResolvedValue(response({ membershipId: null, avatarSource: 'initials', avatarUrl: null }));
    await expect(removeAvatar({ source: 'account' })).resolves.toEqual({ avatarSource: 'initials', avatarUrl: null });
    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      body: JSON.stringify({ action: 'remove', source: 'account', membershipId: null }),
    }));
  });
});
