import { ActivityIndicator, Image, Platform, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { VStack } from '../../ui/primitives';
import { Text } from '../../ui/Typography';
import { styles } from './activityDetailStyles';
import type { ActivityAttachmentsController } from './useActivityAttachmentsController';

type ActivityAttachmentSheetsProps = {
  detailsVisible: boolean;
  recordingVisible: boolean;
  bottomInset: number;
  controller: ActivityAttachmentsController;
};

export function ActivityAttachmentSheets({
  detailsVisible,
  recordingVisible,
  bottomInset,
  controller,
}: ActivityAttachmentSheetsProps) {
  const { presentation } = controller;

  return (
    <>
      <BottomDrawer
        visible={detailsVisible}
        onClose={controller.closeDetails}
        snapPoints={Platform.OS === 'ios' ? ['70%', '96%'] : ['66%', '94%']}
        scrimToken="pineSubtle"
        enableContentPanningGesture
        sheetStyle={{ paddingBottom: 0, paddingTop: 0, paddingHorizontal: 0 }}
      >
        <BottomDrawerScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing['2xl'] + bottomInset,
          }}
        >
          {!controller.selected || !presentation ? (
            <>
              <BottomDrawerHeader
                title="Attachment"
                variant="minimal"
                containerStyle={styles.sheetHeader}
                titleStyle={styles.sheetTitle}
              />
              <Text style={styles.sheetBody}>No attachment selected.</Text>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.attachmentPreviewFrame,
                  presentation.kind === 'photo'
                    ? { aspectRatio: controller.photoAspectRatio }
                    : { height: 164 },
                ]}
              >
                {controller.isLoadingDownloadUrl ? (
                  <View style={styles.attachmentPreviewPlaceholder}>
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                    <Text style={styles.attachmentPreviewPlaceholderText}>Loading...</Text>
                  </View>
                ) : presentation.kind === 'photo' && controller.downloadUrl ? (
                  <Image
                    source={{ uri: controller.downloadUrl }}
                    style={styles.attachmentPreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.attachmentPreviewPlaceholder}>
                    <Icon
                      name={presentation.kind === 'video' ? 'image' : presentation.kind === 'audio' ? 'mic' : 'paperclip'}
                      size={22}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.attachmentPreviewPlaceholderText}>
                      {presentation.kind === 'photo' ? 'Preview unavailable' : 'Preview available for photos'}
                    </Text>
                  </View>
                )}
              </View>

              <BottomDrawerHeader
                title={presentation.name}
                variant="minimal"
                containerStyle={styles.sheetHeader}
                titleStyle={styles.sheetTitle}
              />
              <Text style={[styles.sheetBody, { marginBottom: spacing.md }]}>
                {presentation.kindLabel}
                {presentation.sizeLabel ? ` · ${presentation.sizeLabel}` : ''}
                {presentation.durationLabel ? ` · ${presentation.durationLabel}` : ''}
              </Text>

              <View style={styles.rowsCard}>
                <View style={[styles.row, styles.rowContent]}>
                  <Text style={styles.rowLabel}>Status</Text>
                  <Text style={[styles.rowValue, presentation.isFailed ? { color: colors.destructive } : null]}>
                    {presentation.statusLabel}
                  </Text>
                </View>
                {presentation.createdAtLabel ? (
                  <>
                    <View style={styles.cardSectionDivider} />
                    <View style={[styles.row, styles.rowContent]}>
                      <Text style={styles.rowLabel}>Added</Text>
                      <Text style={styles.rowValue}>{presentation.createdAtLabel}</Text>
                    </View>
                  </>
                ) : null}
                {presentation.uploadError ? (
                  <>
                    <View style={styles.cardSectionDivider} />
                    <View style={[styles.row, styles.rowContent]}>
                      <Text style={styles.rowLabel}>Error</Text>
                      <Text style={[styles.rowValue, { color: colors.destructive }]} numberOfLines={2}>
                        {presentation.uploadError}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>

              <View style={{ marginTop: spacing.md }}>
                <VStack space="sm">
                  <Button
                    variant="primary"
                    fullWidth
                    disabled={!presentation.isOpenable || !controller.downloadUrl}
                    accessibilityLabel="Download attachment"
                    onPress={() => controller.shareSelected().catch(() => undefined)}
                  >
                    <Text style={[styles.sheetRowLabel, { color: colors.primaryForeground }]}>Download</Text>
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    accessibilityLabel="Delete attachment"
                    onPress={controller.confirmDeleteSelected}
                  >
                    <Text style={[styles.sheetRowLabel, { color: colors.destructive }]}>Delete</Text>
                  </Button>
                </VStack>
              </View>
            </>
          )}
        </BottomDrawerScrollView>
      </BottomDrawer>

      <BottomDrawer
        visible={recordingVisible}
        onClose={() => controller.closeRecording().catch(() => undefined)}
        snapPoints={Platform.OS === 'ios' ? ['52%'] : ['48%']}
        scrimToken="pineSubtle"
      >
        <View style={styles.sheetContent}>
          <BottomDrawerHeader
            title="Record audio"
            variant="minimal"
            containerStyle={styles.sheetHeader}
            titleStyle={styles.sheetTitle}
          />
          <Text style={[styles.sheetBody, { marginBottom: spacing.md }]}>
            Record a quick voice note and attach it to this to-do.
          </Text>
          <VStack space="sm">
            <Button
              variant={controller.isRecording ? 'outline' : 'primary'}
              fullWidth
              accessibilityLabel={controller.isRecording ? 'Recording in progress' : 'Start recording'}
              testID="e2e.activityDetail.attachments.record.start"
              onPress={() => controller.startRecording().catch(() => undefined)}
            >
              <Text style={[styles.sheetRowLabel, !controller.isRecording ? { color: colors.primaryForeground } : null]}>
                {controller.isRecording ? 'Recording...' : 'Start recording'}
              </Text>
            </Button>
            <Button
              variant={controller.isRecording ? 'primary' : 'outline'}
              fullWidth
              accessibilityLabel="Stop recording and attach"
              testID="e2e.activityDetail.attachments.record.stopAttach"
              onPress={() => controller.stopAndAttachRecording().catch(() => undefined)}
            >
              <Text style={[styles.sheetRowLabel, controller.isRecording ? { color: colors.primaryForeground } : null]}>
                Stop & save
              </Text>
            </Button>
            <Button
              variant="outline"
              fullWidth
              accessibilityLabel="Cancel recording"
              testID="e2e.activityDetail.attachments.record.cancel"
              onPress={() => controller.cancelRecording().catch(() => undefined)}
            >
              <Text style={styles.sheetRowLabel}>Cancel</Text>
            </Button>
          </VStack>
        </View>
      </BottomDrawer>
    </>
  );
}
