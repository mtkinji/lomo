import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { pickUnifiedChatAttachment } from './unifiedChatAttachmentPicker';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    text: jest.fn(),
    base64: jest.fn(),
  })),
}));

function mockPickedFile(method: 'text' | 'base64', value: string) {
  (File as unknown as jest.Mock).mockImplementationOnce((uri: string) => ({
    uri,
    text: jest.fn(method === 'text' ? async () => value : async () => ''),
    base64: jest.fn(method === 'base64' ? async () => value : async () => ''),
  }));
}

describe('Unified Chat attachment picker', () => {
  test('reads text locally without manufacturing binary input', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false, assets: [{ uri: 'file:///week.md', name: 'week.md', mimeType: 'text/markdown', size: 14 }],
    });
    mockPickedFile('text', 'Monday: call');
    await expect(pickUnifiedChatAttachment()).resolves.toEqual(expect.objectContaining({
      name: 'week.md', content: 'Monday: call',
    }));
    expect(File).toHaveBeenCalledWith('file:///week.md');
  });

  test('reads image bytes as a bounded local data URL pending inspection', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false, assets: [{ uri: 'file:///screen.png', name: 'screen.png', mimeType: 'image/png', size: 3 }],
    });
    mockPickedFile('base64', 'YWJj');
    await expect(pickUnifiedChatAttachment()).resolves.toEqual(expect.objectContaining({
      name: 'screen.png', kind: 'image', status: 'inspecting',
      dataUrl: 'data:image/png;base64,YWJj',
    }));
    expect(File).toHaveBeenCalledWith('file:///screen.png');
  });
});
