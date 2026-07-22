import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  MAX_UNIFIED_CHAT_ATTACHMENT_BYTES,
  normalizeUnifiedChatTextAttachment,
  type UnifiedChatTextAttachment,
} from './unifiedChatAttachmentPolicy';

const TEXT_DOCUMENT_TYPES = [
  'application/json',
  'application/xml',
  'application/yaml',
  'text/csv',
  'text/markdown',
  'text/plain',
  'text/tab-separated-values',
  'text/xml',
  'text/yaml',
];

function localAttachmentId(): string {
  return `chat-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function pickUnifiedChatTextAttachment(): Promise<UnifiedChatTextAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: TEXT_DOCUMENT_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) return null;
  if (typeof asset.size === 'number' && asset.size > MAX_UNIFIED_CHAT_ATTACHMENT_BYTES) {
    throw new Error('Each Chat document must be 100 KB or smaller.');
  }
  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return normalizeUnifiedChatTextAttachment({
    id: localAttachmentId(),
    name: asset.name,
    mimeType: asset.mimeType ?? 'text/plain',
    sizeBytes: asset.size ?? content.length,
    content,
  });
}
