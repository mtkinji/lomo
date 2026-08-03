import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  MAX_UNIFIED_CHAT_ATTACHMENT_BYTES,
  MAX_UNIFIED_CHAT_MEDIA_ATTACHMENT_BYTES,
  normalizeUnifiedChatAttachmentDraft,
  normalizeUnifiedChatTextAttachment,
  type UnifiedChatAttachment,
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
const SUPPORTED_DOCUMENT_TYPES = [
  ...TEXT_DOCUMENT_TYPES,
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
];

function localAttachmentId(): string {
  return `chat-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function decodedBase64Bytes(payload: string): number {
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(payload.length * 3 / 4) - padding);
}

export async function pickUnifiedChatAttachment(): Promise<UnifiedChatAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: SUPPORTED_DOCUMENT_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) return null;
  const mimeType = asset.mimeType?.toLowerCase().split(';')[0].trim() ?? 'application/octet-stream';
  const isText = TEXT_DOCUMENT_TYPES.includes(mimeType) || (!mimeType.startsWith('image/') && mimeType !== 'application/pdf');
  const sizeLimit = isText ? MAX_UNIFIED_CHAT_ATTACHMENT_BYTES : MAX_UNIFIED_CHAT_MEDIA_ATTACHMENT_BYTES;
  if (typeof asset.size === 'number' && asset.size > sizeLimit) {
    throw new Error(isText
      ? 'Each Chat document must be 100 KB or smaller.'
      : 'Each Chat image or PDF must be 5 MB or smaller.');
  }
  const file = new File(asset.uri);
  if (isText) {
    const content = await file.text();
    return normalizeUnifiedChatTextAttachment({
      id: localAttachmentId(), name: asset.name, mimeType,
      sizeBytes: asset.size ?? content.length, content,
    });
  }
  const base64 = await file.base64();
  return normalizeUnifiedChatAttachmentDraft({
    id: localAttachmentId(), name: asset.name, mimeType,
    sizeBytes: decodedBase64Bytes(base64), dataUrl: `data:${mimeType};base64,${base64}`,
  });
}

/** @deprecated Use pickUnifiedChatAttachment. */
export const pickUnifiedChatTextAttachment = pickUnifiedChatAttachment;
