/**
 * Action-triggered check-in approval sheet.
 *
 * Shows up after a user completes a meaningful piece of work on a shared
 * goal (an activity, a focus session, or the goal itself). Frames the
 * moment as a compact confirmation, and offers Skip / Send on the
 * auto-generated specific draft text.
 *
 * Closing the sheet without sending records a dismissal and keeps the
 * pending draft recoverable from the Partners sheet. Skip clears the
 * draft. Send routes through `submitCheckin` and clears the draft.
 *
 * This sheet is intentionally simple — celebration and surrounding UI
 * carry the emotional weight so the check-in message can stay concrete
 * and specific.
 */

import { Alert, StyleSheet, View } from 'react-native';

import { BottomDrawer } from '../../ui/BottomDrawer';
import { Button } from '../../ui/Button';
import { HStack, Text, VStack } from '../../ui/primitives';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import { cardSurfaceStyle, colors, fonts, spacing, typography } from '../../theme';
import {
  type CheckinDraft,
  shouldConfirmSkip,
} from '../../services/checkinDrafts';

export type CheckinApprovalSheetProps = {
  visible: boolean;
  draft: CheckinDraft | null;
  /** Names of partners in the audience — used for partner-aware invitation copy. */
  partnerNames: ReadonlyArray<string>;
  /** Count of partners in the audience; used when names are unavailable. */
  partnerCount?: number;
  /** Goal title — used as fallback context in the title. */
  goalTitle?: string | null;
  busy?: boolean;
  /** Called when user taps Send. Receives the final approved text. */
  onSend: (text: string) => void;
  /** Called when user taps Skip (after confirmation if needed). */
  onSkip: () => void;
  /** Called when user closes the sheet (dismisses without sending). */
  onDismiss: () => void;
};

export function CheckinApprovalSheet({
  visible,
  draft,
  partnerNames,
  partnerCount = partnerNames.length,
  busy = false,
  onSend,
  onSkip,
  onDismiss,
}: CheckinApprovalSheetProps) {
  const finalText = (draft?.draftText ?? '').trim();
  const canSend = finalText.length > 0 && !busy;

  if (!draft) {
    return null;
  }

  const headerTitle = formatHeaderLine(partnerNames, partnerCount);

  const handleSend = () => {
    if (!canSend) return;
    onSend(finalText);
  };

  const handleSkip = () => {
    if (busy) return;
    if (shouldConfirmSkip(draft)) {
      Alert.alert(
        'Skip this check-in?',
        'This will clear the draft. Your completed work stays in Kwilt.',
        [
          { text: 'Keep collecting', style: 'cancel' },
          { text: 'Skip', style: 'destructive', onPress: () => onSkip() },
        ]
      );
      return;
    }
    onSkip();
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onDismiss}
      snapPoints={['30%']}
      dynamicSizing
      keyboardAvoidanceEnabled={false}
      scrimToken="pineSubtle"
      sheetStyle={styles.compactSheet}
      handleContainerStyle={styles.compactHandleContainer}
      handleStyle={styles.compactHandle}
    >
      <View style={styles.surface}>
        <Text style={styles.title} numberOfLines={2}>{headerTitle}</Text>

        <VStack space="sm" style={styles.body}>
          <View style={styles.previewCard}>
            <HStack space="sm" alignItems="flex-start">
              <ProfileAvatar name="You" size={32} borderRadius={16} />
              <VStack flex={1} space="xs">
                <HStack space="xs" alignItems="center">
                  <Text style={styles.previewActor}>You</Text>
                  <Text style={styles.previewTime}>just now</Text>
                </HStack>
                <Text style={styles.previewText} numberOfLines={3}>
                  {finalText || 'Say what you finished.'}
                </Text>
              </VStack>
            </HStack>
          </View>

          <HStack alignItems="center" space="sm" style={styles.actions}>
            <View style={{ flex: 1 }} />
            <Button
              variant="ghost"
              size="compact"
              label="Skip"
              onPress={handleSkip}
              disabled={busy}
              accessibilityLabel="Skip this check-in"
            />
            <Button
              variant="primary"
              size="compact"
              label={busy ? 'Sending…' : 'Send'}
              onPress={handleSend}
              disabled={!canSend}
              accessibilityLabel="Send check-in"
            />
          </HStack>
        </VStack>
      </View>
    </BottomDrawer>
  );
}

function formatHeaderLine(partnerNames: ReadonlyArray<string>, partnerCount: number): string {
  const cleaned = partnerNames.map((n) => (n ?? '').trim()).filter((n) => n.length > 0);
  const count = Math.max(partnerCount, cleaned.length);
  if (cleaned.length === 1 && count === 1) {
    return `Send ${cleaned[0]} a check-in`;
  }
  if (cleaned.length === 2 && count === 2) {
    return `Send ${cleaned[0]} and ${cleaned[1]} a check-in`;
  }
  if (cleaned.length > 0 && count > 1) {
    return `Send ${cleaned[0]} + ${count - 1} others a check-in`;
  }
  return `Send a check-in to your ${count > 1 ? 'partners' : 'partner'}`;
}

const styles = StyleSheet.create({
  surface: {
    paddingBottom: spacing.sm,
  },
  compactSheet: {
    paddingTop: 0,
  },
  compactHandleContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  compactHandle: {
    width: 52,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  body: {
    paddingTop: 0,
  },
  previewCard: {
    ...cardSurfaceStyle,
    borderRadius: 12,
    padding: spacing.sm,
  },
  previewActor: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  previewTime: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontSize: 12,
  },
  previewText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    marginTop: spacing.md,
    justifyContent: 'flex-end',
  },
});
