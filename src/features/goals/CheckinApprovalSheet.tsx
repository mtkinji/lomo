/**
 * Action-triggered check-in approval sheet.
 *
 * Shows up after a user completes a meaningful piece of work on a shared
 * goal (an activity, a focus session, or the goal itself). Frames the
 * moment as a celebration of what just moved, and offers Send / Edit /
 * Skip on the auto-generated specific draft text.
 *
 * Closing the sheet without sending records a dismissal and keeps the
 * pending draft recoverable from the Partners sheet. Skip clears the
 * draft. Send routes through `submitCheckin` and clears the draft.
 *
 * This sheet is intentionally simple — celebration and surrounding UI
 * carry the emotional weight so the check-in message can stay concrete
 * and specific.
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { Button } from '../../ui/Button';
import { HStack, Text, VStack } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import {
  type CheckinDraft,
  shouldConfirmSkip,
} from '../../services/checkinDrafts';

export type CheckinApprovalSheetProps = {
  visible: boolean;
  draft: CheckinDraft | null;
  /** Names of partners in the audience — used for "Share this with..." copy. */
  partnerNames: ReadonlyArray<string>;
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
  goalTitle,
  busy = false,
  onSend,
  onSkip,
  onDismiss,
}: CheckinApprovalSheetProps) {
  const [isEditing, setEditing] = useState(false);
  const [editText, setEditText] = useState<string>(draft?.draftText ?? '');

  // Reset local editor state whenever a new draft is shown.
  useEffect(() => {
    if (visible && draft) {
      setEditing(false);
      setEditText(draft.draftText);
    }
  }, [visible, draft?.id, draft?.draftText, draft]);

  const audienceLine = useMemo(() => formatAudienceLine(partnerNames), [partnerNames]);
  const finalText = (isEditing ? editText : draft?.draftText ?? '').trim();
  const canSend = finalText.length > 0 && !busy;

  if (!draft) {
    return null;
  }

  const headerTitle = composeTitle(draft, goalTitle ?? null);

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
    <BottomDrawer visible={visible} onClose={onDismiss} snapPoints={['62%']} scrimToken="pineSubtle">
      <View style={styles.surface}>
        <BottomDrawerHeader
          variant="withClose"
          title={headerTitle}
          subtitle={audienceLine || 'Send a check-in to your partners.'}
          onClose={onDismiss}
        />

        <VStack space="md" style={styles.body}>
          {isEditing ? (
            <TextInput
              style={styles.editor}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              maxLength={500}
              placeholder="Say what you finished."
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={styles.draftText}>{draft.draftText || 'Say what you finished.'}</Text>
          )}

          <Text style={styles.privacyHint}>Only send what you want partners to see.</Text>

          <HStack alignItems="center" space="sm" style={styles.actions}>
            <Button
              variant="ghost"
              size="compact"
              label={isEditing ? 'Done' : 'Edit'}
              onPress={() => setEditing((current) => !current)}
              disabled={busy}
              accessibilityLabel={isEditing ? 'Finish editing' : 'Edit check-in'}
            />
            <Button
              variant="ghost"
              size="compact"
              label="Skip"
              onPress={handleSkip}
              disabled={busy}
              accessibilityLabel="Skip this check-in"
            />
            <View style={{ flex: 1 }} />
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

function composeTitle(draft: CheckinDraft, goalTitle: string | null): string {
  const included = draft.items.filter((i) => i.includeInDraft);
  if (included.length === 0) {
    return goalTitle ? `${goalTitle} moved` : 'That moved.';
  }
  if (included.length === 1) {
    return 'That moved.';
  }
  return 'You moved this goal.';
}

function formatAudienceLine(partnerNames: ReadonlyArray<string>): string {
  const cleaned = partnerNames.map((n) => (n ?? '').trim()).filter((n) => n.length > 0);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return `Share this with ${cleaned[0]}?`;
  if (cleaned.length === 2) return `Share this with ${cleaned[0]} and ${cleaned[1]}?`;
  return `Share this with ${cleaned[0]} + ${cleaned.length - 1} others?`;
}

const styles = StyleSheet.create({
  surface: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  body: {
    paddingTop: spacing.sm,
  },
  draftText: {
    ...typography.titleSm,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  editor: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.shell,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  privacyHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: spacing.sm,
  },
});
