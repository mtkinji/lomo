import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { pickUnifiedChatAttachment } from './unifiedChatAttachmentPicker';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  readAsStringAsync: jest.fn(),
}));

describe('Unified Chat attachment picker', () => {
  test('reads text locally without manufacturing binary input', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false, assets: [{ uri: 'file:///week.md', name: 'week.md', mimeType: 'text/markdown', size: 14 }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('Monday: call');
    await expect(pickUnifiedChatAttachment()).resolves.toEqual(expect.objectContaining({
      name: 'week.md', content: 'Monday: call',
    }));
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///week.md', { encoding: 'utf8' });
  });

  test('reads image bytes as a bounded local data URL pending inspection', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false, assets: [{ uri: 'file:///screen.png', name: 'screen.png', mimeType: 'image/png', size: 3 }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('YWJj');
    await expect(pickUnifiedChatAttachment()).resolves.toEqual(expect.objectContaining({
      name: 'screen.png', kind: 'image', status: 'inspecting',
      dataUrl: 'data:image/png;base64,YWJj',
    }));
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///screen.png', { encoding: 'base64' });
  });
});
