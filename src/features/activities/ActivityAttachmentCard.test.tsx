import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ActivityAttachment } from '../../domain/types';
import { getAttachmentDownloadUrl } from '../../services/attachments/activityAttachments';
import { ActivityAttachmentCard } from './ActivityAttachmentCard';

jest.mock('../../services/attachments/activityAttachments', () => ({
  getAttachmentDownloadUrl: jest.fn(async () => 'https://example.test/photo.jpg'),
}));

const attachment = (overrides: Partial<ActivityAttachment> = {}): ActivityAttachment => ({
  id: 'attachment-1',
  kind: 'photo',
  fileName: 'Cabinet measurements.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1_572_864,
  durationSeconds: null,
  storagePath: 'activity-1/photo.jpg',
  sharedWithGoalMembers: false,
  uploadStatus: 'uploaded',
  uploadError: null,
  createdAt: '2026-08-05T16:00:00.000Z',
  updatedAt: '2026-08-05T16:00:00.000Z',
  ...overrides,
});

describe('ActivityAttachmentCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows recognizable metadata and lazily resolves a photo thumbnail', async () => {
    const screen = render(
      <ActivityAttachmentCard
        attachment={attachment()}
        onPreview={jest.fn()}
        onOpenDetails={jest.fn()}
      />,
    );

    expect(screen.getByText('Cabinet measurements.jpg')).toBeTruthy();
    expect(screen.getByText('JPG · 1.5 MB')).toBeTruthy();
    await waitFor(() => expect(getAttachmentDownloadUrl).toHaveBeenCalledWith('attachment-1'));
    expect(screen.getByTestId('activity-attachment-thumbnail')).toHaveProp('source', {
      uri: 'https://example.test/photo.jpg',
    });
  });

  it('makes the card the preview action and keeps details independent', () => {
    const onPreview = jest.fn();
    const onOpenDetails = jest.fn();
    const item = attachment({ kind: 'document', fileName: 'Estimate.pdf', mimeType: 'application/pdf' });
    const screen = render(
      <ActivityAttachmentCard
        attachment={item}
        onPreview={onPreview}
        onOpenDetails={onOpenDetails}
      />,
    );

    fireEvent.press(screen.getByLabelText('Preview Estimate.pdf'));
    expect(onPreview).toHaveBeenCalledWith(item);
    expect(onOpenDetails).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Attachment options for Estimate.pdf'));
    expect(onOpenDetails).toHaveBeenCalledWith(item);
  });

  it('routes failed cards to their readable failure details', () => {
    const onPreview = jest.fn();
    const onOpenDetails = jest.fn();
    const failed = attachment({ uploadStatus: 'failed', uploadError: 'Network unavailable' });
    const screen = render(
      <ActivityAttachmentCard
        attachment={failed}
        onPreview={onPreview}
        onOpenDetails={onOpenDetails}
      />,
    );

    expect(screen.getByText('Failed · Network unavailable')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Review failed attachment Cabinet measurements.jpg'));
    expect(onOpenDetails).toHaveBeenCalledWith(failed);
    expect(onPreview).not.toHaveBeenCalled();
  });
});
