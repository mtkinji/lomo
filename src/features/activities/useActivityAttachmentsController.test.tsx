import { act, renderHook } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { cancelAudioRecording, getAttachmentDownloadUrl, startAudioRecording } from '../../services/attachments/activityAttachments';
import { previewRemoteAttachment } from '../../services/attachments/nativeAttachmentPreview';
import { useActivityAttachmentsController } from './useActivityAttachmentsController';

jest.mock('../../services/attachments/activityAttachments', () => ({
  cancelAudioRecording: jest.fn(async () => undefined),
  deleteAttachment: jest.fn(async () => undefined),
  getAttachmentDownloadUrl: jest.fn(async () => 'https://example.test/attachment'),
  startAudioRecording: jest.fn(async () => undefined),
  stopAudioRecordingAndAttachToActivity: jest.fn(async () => undefined),
}));

jest.mock('../../services/attachments/nativeAttachmentPreview', () => ({
  previewRemoteAttachment: jest.fn(async () => 'quick-look'),
}));

describe('useActivityAttachmentsController', () => {
  it('cancels an active recording when the recording sheet closes', async () => {
    const { result } = renderHook(() =>
      useActivityAttachmentsController({
        activity: { id: 'activity-1' } as Activity,
        detailsVisible: false,
        onOpenDetails: jest.fn(),
        onCloseDetails: jest.fn(),
        onCloseRecording: jest.fn(),
      }),
    );

    await act(async () => result.current.startRecording());
    expect(startAudioRecording).toHaveBeenCalledTimes(1);
    expect(result.current.isRecording).toBe(true);

    await act(async () => result.current.closeRecording());
    expect(cancelAudioRecording).toHaveBeenCalledTimes(1);
    expect(result.current.isRecording).toBe(false);
  });

  it('resolves a fresh signed URL and previews an uploaded attachment directly', async () => {
    const item = {
      id: 'attachment-1',
      fileName: 'Estimate.pdf',
      uploadStatus: 'uploaded',
    } as any;
    const { result } = renderHook(() =>
      useActivityAttachmentsController({
        activity: { id: 'activity-1' } as Activity,
        detailsVisible: false,
        onOpenDetails: jest.fn(),
        onCloseDetails: jest.fn(),
        onCloseRecording: jest.fn(),
      }),
    );

    await act(async () => result.current.preview(item));

    expect(getAttachmentDownloadUrl).toHaveBeenCalledWith('attachment-1');
    expect(previewRemoteAttachment).toHaveBeenCalledWith({
      url: 'https://example.test/attachment',
      fileName: 'Estimate.pdf',
    });
  });
});
