import type { ActivityAttachment } from '../../domain/types';
import { buildActivityAttachmentPresentation } from './activityAttachmentPresentation';

const attachment = (overrides: Partial<ActivityAttachment> = {}): ActivityAttachment => ({
  id: 'attachment-1',
  kind: 'audio',
  fileName: 'Voice note.m4a',
  mimeType: 'audio/mp4',
  sizeBytes: 1_572_864,
  durationSeconds: 65,
  storagePath: 'activity-1/voice.m4a',
  sharedWithGoalMembers: false,
  uploadStatus: 'uploaded',
  uploadError: null,
  createdAt: '2026-07-10T16:00:00.000Z',
  updatedAt: '2026-07-10T16:00:00.000Z',
  ...overrides,
});

describe('buildActivityAttachmentPresentation', () => {
  it('formats stable metadata and status labels', () => {
    expect(buildActivityAttachmentPresentation(attachment(), 'en-US')).toEqual(expect.objectContaining({
      kindLabel: 'Audio',
      name: 'Voice note.m4a',
      descriptionLabel: 'M4A · 1:05',
      mediaIcon: 'mic',
      statusLabel: 'Uploaded',
      isOpenable: true,
      sizeLabel: '1.5 MB',
      durationLabel: '1:05',
    }));
  });

  it('uses safe fallbacks for failed attachments', () => {
    expect(buildActivityAttachmentPresentation(attachment({
      fileName: '  ',
      uploadStatus: 'failed',
      uploadError: 'Network unavailable',
      sizeBytes: null,
      durationSeconds: null,
    }))).toEqual(expect.objectContaining({
      name: 'Attachment',
      descriptionLabel: 'Failed · Network unavailable',
      statusLabel: 'Failed',
      isFailed: true,
      isOpenable: false,
      sizeLabel: null,
      durationLabel: null,
      uploadError: 'Network unavailable',
    }));
  });

  it('prefers compact, recognizable metadata for each attachment kind', () => {
    expect(buildActivityAttachmentPresentation(attachment({
      kind: 'photo',
      fileName: 'Cabinet measurements.jpg',
      mimeType: 'image/jpeg',
      durationSeconds: null,
    }))).toEqual(expect.objectContaining({
      descriptionLabel: 'JPG · 1.5 MB',
      mediaIcon: 'image',
      showsPhotoThumbnail: true,
    }));

    expect(buildActivityAttachmentPresentation(attachment({
      kind: 'video',
      fileName: 'Walkthrough.mov',
      mimeType: 'video/quicktime',
      durationSeconds: 42,
    }))).toEqual(expect.objectContaining({
      descriptionLabel: 'MOV · 0:42',
      mediaIcon: 'play',
      showsPhotoThumbnail: false,
    }));

    expect(buildActivityAttachmentPresentation(attachment({
      kind: 'document',
      fileName: 'Contractor estimate.pdf',
      mimeType: 'application/pdf',
      durationSeconds: null,
    }))).toEqual(expect.objectContaining({
      descriptionLabel: 'PDF · 1.5 MB',
      mediaIcon: 'fileText',
      showsPhotoThumbnail: false,
    }));
  });

  it('makes transition states understandable without relying on color', () => {
    expect(buildActivityAttachmentPresentation(attachment({
      uploadStatus: 'uploading',
    })).descriptionLabel).toBe('Uploading');

    expect(buildActivityAttachmentPresentation(attachment({
      uploadStatus: 'failed',
      uploadError: null,
    })).descriptionLabel).toBe('Upload failed');
  });
});
