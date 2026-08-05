import { previewRemoteAttachment } from './nativeAttachmentPreview';

const params = {
  url: 'https://example.test/estimate.pdf',
  fileName: 'Estimate.pdf',
};

describe('previewRemoteAttachment', () => {
  it('uses the iOS Quick Look bridge when available', async () => {
    const previewRemoteURL = jest.fn(async () => true);
    const openBrowser = jest.fn(async () => undefined);

    await expect(previewRemoteAttachment(params, {
      platformOS: 'ios',
      nativePreview: { previewRemoteURL },
      openBrowser,
      openExternal: jest.fn(async () => undefined),
    })).resolves.toBe('quick-look');

    expect(previewRemoteURL).toHaveBeenCalledWith(params.url, params.fileName);
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it('falls back to the in-app browser when the native bridge is absent or rejects', async () => {
    const openBrowser = jest.fn(async () => undefined);

    await expect(previewRemoteAttachment(params, {
      platformOS: 'ios',
      nativePreview: { previewRemoteURL: jest.fn(async () => { throw new Error('Unavailable'); }) },
      openBrowser,
      openExternal: jest.fn(async () => undefined),
    })).resolves.toBe('browser');

    expect(openBrowser).toHaveBeenCalledWith(params.url);
  });

  it('uses the platform URL handler when an in-app preview also fails', async () => {
    const openExternal = jest.fn(async () => undefined);

    await expect(previewRemoteAttachment(params, {
      platformOS: 'android',
      nativePreview: null,
      openBrowser: jest.fn(async () => { throw new Error('Unavailable'); }),
      openExternal,
    })).resolves.toBe('external');

    expect(openExternal).toHaveBeenCalledWith(params.url);
  });
});
