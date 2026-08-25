import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ActivityAttachment } from '../../domain/types';
import { getAttachmentDownloadUrl } from '../../services/attachments/activityAttachments';
import { colors, fonts, spacing, typography } from '../../theme';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Typography';
import { buildActivityAttachmentPresentation } from './activityAttachmentPresentation';
import { KwiltLoader } from '../../ui/KwiltLoader';

type ActivityAttachmentCardProps = {
  attachment: ActivityAttachment;
  onPreview: (attachment: ActivityAttachment) => void;
  onOpenDetails: (attachment: ActivityAttachment) => void;
};

export function ActivityAttachmentCard({
  attachment,
  onPreview,
  onOpenDetails,
}: ActivityAttachmentCardProps) {
  const presentation = React.useMemo(
    () => buildActivityAttachmentPresentation(attachment),
    [attachment],
  );
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setThumbnailUrl(null);
    if (!presentation.showsPhotoThumbnail) return;

    getAttachmentDownloadUrl(attachment.id)
      .then((url) => {
        if (!cancelled) setThumbnailUrl(url);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [attachment.id, presentation.showsPhotoThumbnail]);

  const cardAccessibilityLabel = presentation.isFailed
    ? `Review failed attachment ${presentation.name}`
    : presentation.isOpenable
      ? `Preview ${presentation.name}`
      : `${presentation.name} is uploading`;

  const handleCardPress = () => {
    if (presentation.isOpenable) {
      onPreview(attachment);
      return;
    }
    if (presentation.isFailed) onOpenDetails(attachment);
  };

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cardAccessibilityLabel}
        accessibilityState={{ disabled: !presentation.isOpenable && !presentation.isFailed }}
        disabled={!presentation.isOpenable && !presentation.isFailed}
        onPress={handleCardPress}
        style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
      >
        <View style={styles.media}>
          {thumbnailUrl ? (
            <Image
              testID="activity-attachment-thumbnail"
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : presentation.statusLabel === 'Uploading' ? (
            <KwiltLoader size="small" color={colors.textSecondary} />
          ) : (
            <Icon
              name={presentation.mediaIcon}
              size={presentation.kind === 'video' ? 20 : 22}
              color={presentation.isFailed ? colors.destructive : colors.textPrimary}
            />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {presentation.name}
          </Text>
          <Text
            style={[styles.description, presentation.isFailed ? styles.descriptionFailed : null]}
            numberOfLines={1}
          >
            {presentation.descriptionLabel}
            {attachment.sharedWithGoalMembers ? ' · Shared' : ''}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Attachment options for ${presentation.name}`}
        hitSlop={4}
        onPress={() => onOpenDetails(attachment)}
        style={({ pressed }) => [styles.options, pressed ? styles.optionsPressed : null]}
      >
        <Icon name="more" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: colors.fieldFill,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  primary: {
    minHeight: 68,
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.shellAlt,
  },
  media: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.fieldFillPressed,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  content: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center',
    rowGap: 2,
  },
  title: {
    ...typography.bodySm,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  descriptionFailed: {
    color: colors.destructive,
  },
  options: {
    width: 44,
    height: 44,
    marginHorizontal: 2,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionsPressed: {
    backgroundColor: colors.fieldFillPressed,
  },
});
