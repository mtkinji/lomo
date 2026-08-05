import type { ActivityAttachment } from '../../domain/types';

export type ActivityAttachmentPresentation = {
  kind: ActivityAttachment['kind'];
  kindLabel: string;
  name: string;
  descriptionLabel: string;
  mediaIcon: 'image' | 'play' | 'mic' | 'fileText';
  showsPhotoThumbnail: boolean;
  statusLabel: 'Uploading' | 'Failed' | 'Uploaded';
  isOpenable: boolean;
  isFailed: boolean;
  sizeLabel: string | null;
  durationLabel: string | null;
  createdAtLabel: string | null;
  uploadError: string | null;
};

function compactFileType(fileName: string, kindLabel: string): string {
  const extension = /\.([a-z0-9]{1,5})$/i.exec(fileName.trim())?.[1];
  return extension ? extension.toUpperCase() : kindLabel;
}

function formatBytes(bytes: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return null;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
  const gigabytes = megabytes / 1024;
  return `${gigabytes.toFixed(gigabytes < 10 ? 1 : 0)} GB`;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function buildActivityAttachmentPresentation(
  attachment: ActivityAttachment,
  locale?: string,
): ActivityAttachmentPresentation {
  const status = attachment.uploadStatus;
  const kindLabel = attachment.kind === 'photo'
    ? 'Photo'
    : attachment.kind === 'video'
      ? 'Video'
      : attachment.kind === 'audio'
        ? 'Audio'
        : 'Document';
  const createdAt = new Date(attachment.createdAt);
  const name = attachment.fileName.trim() || 'Attachment';
  const sizeLabel = formatBytes(attachment.sizeBytes);
  const durationLabel = formatDuration(attachment.durationSeconds);
  const uploadError = attachment.uploadError?.trim() || null;
  const fileTypeLabel = compactFileType(name, kindLabel);
  const preferredDetail = attachment.kind === 'audio' || attachment.kind === 'video'
    ? durationLabel ?? sizeLabel
    : sizeLabel;
  const descriptionLabel = status === 'uploading'
    ? 'Uploading'
    : status === 'failed'
      ? uploadError ? `Failed · ${uploadError}` : 'Upload failed'
      : [fileTypeLabel, preferredDetail].filter(Boolean).join(' · ');

  return {
    kind: attachment.kind,
    kindLabel,
    name,
    descriptionLabel,
    mediaIcon: attachment.kind === 'photo'
      ? 'image'
      : attachment.kind === 'video'
        ? 'play'
        : attachment.kind === 'audio'
          ? 'mic'
          : 'fileText',
    showsPhotoThumbnail: attachment.kind === 'photo' && status === 'uploaded',
    statusLabel: status === 'uploading' ? 'Uploading' : status === 'failed' ? 'Failed' : 'Uploaded',
    isOpenable: status === 'uploaded',
    isFailed: status === 'failed',
    sizeLabel,
    durationLabel,
    createdAtLabel: Number.isNaN(createdAt.getTime()) ? null : createdAt.toLocaleString(locale),
    uploadError,
  };
}
