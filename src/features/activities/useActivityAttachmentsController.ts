import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Share } from 'react-native';
import type { Activity, ActivityAttachment } from '../../domain/types';
import {
  cancelAudioRecording,
  deleteAttachment,
  getAttachmentDownloadUrl,
  startAudioRecording,
  stopAudioRecordingAndAttachToActivity,
} from '../../services/attachments/activityAttachments';
import {
  buildActivityAttachmentPresentation,
  type ActivityAttachmentPresentation,
} from './activityAttachmentPresentation';

type ActivityAttachmentsControllerProps = {
  activity: Activity | undefined;
  detailsVisible: boolean;
  onOpenDetails: () => void;
  onCloseDetails: () => void;
  onCloseRecording: () => void;
};

export type ActivityAttachmentsController = {
  selected: ActivityAttachment | null;
  presentation: ActivityAttachmentPresentation | null;
  downloadUrl: string | null;
  photoAspectRatio: number;
  isLoadingDownloadUrl: boolean;
  isRecording: boolean;
  openDetails: (attachment: ActivityAttachment) => void;
  closeDetails: () => void;
  shareSelected: () => Promise<void>;
  confirmDeleteSelected: () => void;
  startRecording: () => Promise<void>;
  stopAndAttachRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  closeRecording: () => Promise<void>;
};

export function useActivityAttachmentsController({
  activity,
  detailsVisible,
  onOpenDetails,
  onCloseDetails,
  onCloseRecording,
}: ActivityAttachmentsControllerProps): ActivityAttachmentsController {
  const [selected, setSelected] = useState<ActivityAttachment | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoadingDownloadUrl, setIsLoadingDownloadUrl] = useState(false);
  const [photoAspectRatio, setPhotoAspectRatio] = useState(4 / 3);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDownloadUrl(null);
    setIsLoadingDownloadUrl(false);
    setPhotoAspectRatio(4 / 3);
    if (!detailsVisible || !selected?.id) return;

    setIsLoadingDownloadUrl(true);
    getAttachmentDownloadUrl(selected.id)
      .then((url) => {
        if (cancelled) return;
        setDownloadUrl(url);
        if (selected.kind !== 'photo') return;
        Image.getSize(
          url,
          (width, height) => {
            if (!cancelled && width > 0 && height > 0) setPhotoAspectRatio(width / height);
          },
          () => undefined,
        );
      })
      .catch(() => {
        if (!cancelled) setDownloadUrl(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDownloadUrl(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailsVisible, selected]);

  const presentation = useMemo(
    () => selected ? buildActivityAttachmentPresentation(selected) : null,
    [selected],
  );

  const closeDetails = () => {
    onCloseDetails();
    setSelected(null);
    setDownloadUrl(null);
    setIsLoadingDownloadUrl(false);
    setPhotoAspectRatio(4 / 3);
  };

  const cancelRecording = async () => {
    setIsRecording(false);
    await cancelAudioRecording().catch(() => undefined);
    onCloseRecording();
  };

  return {
    selected,
    presentation,
    downloadUrl,
    photoAspectRatio,
    isLoadingDownloadUrl,
    isRecording,
    openDetails: (attachment) => {
      setSelected(attachment);
      onOpenDetails();
    },
    closeDetails,
    shareSelected: async () => {
      if (!presentation?.isOpenable || !downloadUrl) return;
      await Share.share({ url: downloadUrl, message: downloadUrl }).catch(async () => {
        await Linking.openURL(downloadUrl).catch(() => undefined);
      });
    },
    confirmDeleteSelected: () => {
      if (!activity || !selected) return;
      Alert.alert('Delete attachment?', 'This will remove it from this to-do.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteAttachment({ activityId: activity.id, attachmentId: selected.id }).catch(() => undefined);
            closeDetails();
          },
        },
      ]);
    },
    startRecording: async () => {
      if (isRecording) return;
      await startAudioRecording();
      setIsRecording(true);
    },
    stopAndAttachRecording: async () => {
      if (!activity || !isRecording) return;
      setIsRecording(false);
      await stopAudioRecordingAndAttachToActivity(activity).catch(() => undefined);
      onCloseRecording();
    },
    cancelRecording,
    closeRecording: async () => {
      if (isRecording) {
        await cancelRecording();
      } else {
        onCloseRecording();
      }
    },
  };
}
