/**
 * Pending check-in draft card.
 *
 * Renders the user's open check-in draft inside the Partners sheet's
 * Check-ins tab. Shows the draft text, queued items (with remove controls
 * when editing), partner audience, and the three primary actions:
 * Send, Edit, Skip.
 *
 * The card stays visible above the feed until the draft is sent, skipped,
 * or all items are removed. Closing the immediate or end-of-day prompt does
 * NOT clear it — the card is the recovery surface for collected progress.
 */

import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { HStack, Text, VStack } from '../../ui/primitives';
import { colors, fonts, spacing, typography } from '../../theme';
import {
  type CheckinDraft,
  describeDraftAgeLabel,
  getDraftAgeLabelText,
  shouldConfirmSkip,
} from '../../services/checkinDrafts';

type PendingCheckinDraftCardProps = {
  draft: CheckinDraft;
  /** Names of the partner audience (used in the "Shared with..." line). */
  partnerNames: ReadonlyArray<string>;
  busy?: boolean;
  /** Fires after the user confirms Send. Caller submits the check-in. */
  onSend: (text: string) => void;
  /** Fires after the user confirms Skip. Caller clears the draft. */
  onSkip: () => void;
  /** Persists item-level removes. */
  onRemoveItem: (itemId: string) => void;
};

export function PendingCheckinDraftCard({
  draft,
  partnerNames,
  busy = false,
  onSend,
  onSkip,
  onRemoveItem,
}: PendingCheckinDraftCardProps) {
  const [isEditing, setEditing] = useState(false);
  const [editText, setEditText] = useState<string>(draft.draftText);

  const includedItems = useMemo(
    () => draft.items.filter((i) => i.includeInDraft),
    [draft.items]
  );

  const label = getDraftAgeLabelText(describeDraftAgeLabel(draft));
  const audienceLine = formatAudienceLine(partnerNames);
  const displayText = isEditing ? editText : draft.draftText;
  const canSend = displayText.trim().length > 0 && !busy;

  const handleSend = () => {
    if (!canSend) return;
    onSend(displayText.trim());
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
    <View style={styles.card}>
      <HStack alignItems="center" justifyContent="space-between" style={styles.headerRow}>
        <View style={styles.labelPill}>
          <Icon name="messageCircle" size={12} color={colors.accent} />
          <Text style={styles.labelPillText}>{label}</Text>
        </View>
        {audienceLine ? <Text style={styles.audienceText}>{audienceLine}</Text> : null}
      </HStack>

      {draft.needsReapprovalAt ? (
        <View style={styles.reapprovalBanner}>
          <Icon name="users" size={13} color={colors.warning} />
          <Text style={styles.reapprovalBannerText}>
            Partners changed. Review before sending.
          </Text>
        </View>
      ) : null}

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

      {includedItems.length > 0 ? (
        <VStack space="xs" style={styles.itemsList}>
          {includedItems.map((item) => (
            <HStack key={item.id} alignItems="center" space="sm" style={styles.itemRow}>
              <View style={styles.itemBullet}>
                <Icon name="check" size={11} color={colors.accent} />
              </View>
              <Text style={styles.itemText} numberOfLines={2}>
                {item.title}
              </Text>
              {isEditing ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.title} from check-in`}
                  hitSlop={10}
                  onPress={() => onRemoveItem(item.id)}
                  style={styles.itemRemoveButton}
                >
                  <Icon name="close" size={14} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </HStack>
          ))}
        </VStack>
      ) : null}

      <Text style={styles.privacyHint}>Only send what you want partners to see.</Text>

      <HStack alignItems="center" space="sm" style={styles.actions}>
        <Button
          variant="ghost"
          size="compact"
          label={isEditing ? 'Done' : 'Edit'}
          onPress={() => {
            setEditing((current) => !current);
            if (isEditing) {
              // Leaving edit mode: persist text via onSend path is not desired; we keep local state in sync.
              // The card lifts the edited text into the parent on Send.
              return;
            }
            setEditText(draft.draftText);
          }}
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
    </View>
  );
}

function formatAudienceLine(partnerNames: ReadonlyArray<string>): string {
  const cleaned = partnerNames.map((n) => (n ?? '').trim()).filter((n) => n.length > 0);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return `Shared with ${cleaned[0]}`;
  if (cleaned.length === 2) return `Shared with ${cleaned[0]} + 1`;
  return `Shared with ${cleaned[0]} + ${cleaned.length - 1}`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shellAlt,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    marginBottom: spacing.xs,
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.pine100,
  },
  labelPillText: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
  audienceText: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  reapprovalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.scheduleYellow,
  },
  reapprovalBannerText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  draftText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  editor: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.shell,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  itemsList: {
    paddingTop: spacing.xs,
  },
  itemRow: {
    alignItems: 'center',
  },
  itemBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.pine100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flex: 1,
  },
  itemRemoveButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: spacing.xs,
  },
});
