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
      statusLabel: 'Failed',
      isFailed: true,
      isOpenable: false,
      sizeLabel: null,
      durationLabel: null,
      uploadError: 'Network unavailable',
    }));
  });
});
