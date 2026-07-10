import { act, renderHook } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { cancelAudioRecording, startAudioRecording } from '../../services/attachments/activityAttachments';
import { useActivityAttachmentsController } from './useActivityAttachmentsController';

jest.mock('../../services/attachments/activityAttachments', () => ({
  cancelAudioRecording: jest.fn(async () => undefined),
  deleteAttachment: jest.fn(async () => undefined),
  getAttachmentDownloadUrl: jest.fn(async () => 'https://example.test/attachment'),
  startAudioRecording: jest.fn(async () => undefined),
  stopAudioRecordingAndAttachToActivity: jest.fn(async () => undefined),
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
});
