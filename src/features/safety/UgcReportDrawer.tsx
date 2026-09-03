import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../ui/BottomDrawer';
import { Pressable } from '../../ui/HapticPressable';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { Button, Input, Text, VStack } from '../../ui/primitives';
import { useToastStore } from '../../store/useToastStore';
import {
  blockUgcUser,
  hideUgcTarget,
  reportErrorMessage,
  safetyReceiptPresentation,
  submitUgcReport,
  UGC_REPORT_REASONS,
  type UgcReportReason,
  type UgcReportTarget,
  type UgcSafetyFollowup,
} from '../../services/ugcSafety';

export function UgcReportDrawer({
  target,
  onClose,
  onBlocked,
  onHidden,
}: {
  target: UgcReportTarget | null;
  onClose: () => void;
  onBlocked?: () => void;
  onHidden?: () => void;
}) {
  const showToast = useToastStore((state) => state.showToast);
  const [reason, setReason] = useState<UgcReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [receiptFollowup, setReceiptFollowup] = useState<UgcSafetyFollowup | null>(null);
  const submitted = receiptFollowup !== null;
  const receipt = target && receiptFollowup
    ? safetyReceiptPresentation(receiptFollowup, target.displayName)
    : null;

  useEffect(() => {
    if (!target) {
      setReason(null);
      setNote('');
      setBusy(false);
      setReceiptFollowup(null);
    }
  }, [target]);

  const close = () => {
    if (!busy) onClose();
  };

  return (
    <BottomDrawer
      visible={Boolean(target)}
      onClose={close}
      dismissable={!busy}
      snapPoints={submitted ? ['46%'] : ['78%']}
      keyboardBehavior="resize"
      sheetStyle={styles.sheet}
    >
      <BottomDrawerScrollView contentContainerStyle={styles.content}>
        <BottomDrawerHeader
          variant="withClose"
          title={submitted ? 'Report sent' : 'Get help with this'}
          subtitle={submitted
            ? 'Kwilt saved the context for review. Your identity is not shown to the other person.'
            : target ? `${target.contextLabel} from ${target.displayName}` : undefined}
          onClose={close}
        />

        {submitted && target ? (
          <VStack space="md">
            <View style={styles.receipt} accessibilityRole="alert">
              <Text style={styles.receiptTitle}>{receipt?.title}</Text>
              <Text style={styles.body}>{receipt?.body}</Text>
            </View>
            {receipt?.canBlock && target.reportedUserId ? (
              <Button
                variant="destructive"
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await blockUgcUser(target.reportedUserId!);
                    showToast({ message: `${target.displayName} blocked.`, variant: 'success' });
                    onBlocked?.();
                    onClose();
                  } catch {
                    showToast({ message: 'That person could not be blocked. Try again.', variant: 'danger' });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Blocking…' : `Block ${target.displayName}`}
              </Button>
            ) : null}
            {target.canHide ? (
              <Button
                variant="secondary"
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await hideUgcTarget(target);
                    showToast({ message: 'Response hidden from your Meal Plan.', variant: 'success' });
                    onHidden?.();
                    onClose();
                  } catch {
                    showToast({ message: 'That response could not be hidden. Try again.', variant: 'danger' });
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Hiding…' : 'Hide this response'}
              </Button>
            ) : null}
            <Button variant={target.canHide ? 'ghost' : 'secondary'} disabled={busy} onPress={onClose}>Done</Button>
            <Text style={styles.emergency}>Kwilt does not provide emergency response. Contact local emergency services if anyone is in immediate danger.</Text>
          </VStack>
        ) : (
          <VStack space="md">
            <Text style={styles.prompt}>What concerns you?</Text>
            <VStack space="xs">
              {UGC_REPORT_REASONS.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: reason === item.id }}
                  onPress={() => setReason(item.id)}
                  style={[styles.reason, reason === item.id && styles.reasonSelected]}
                >
                  <View style={[styles.radio, reason === item.id && styles.radioSelected]} />
                  <Text style={styles.reasonLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </VStack>
            <Input
              label="Anything else? (optional)"
              value={note}
              onChangeText={(value) => setNote(value.slice(0, 500))}
              multiline
              multilineMinHeight={88}
              multilineMaxHeight={120}
              editable={!busy}
              placeholder="Add a short note for the safety reviewer"
            />
            <Text style={styles.privacy}>The other person will not see who reported them. Kwilt preserves this item's context for safety review.</Text>
            <Button
              disabled={!reason || busy || !target}
              onPress={async () => {
                if (!reason || !target || busy) return;
                setBusy(true);
                try {
                  const result = await submitUgcReport({ target, reason, note });
                  setReceiptFollowup(result.followup);
                } catch (error) {
                  showToast({ message: reportErrorMessage(error), variant: 'danger' });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Sending…' : 'Send report'}
            </Button>
          </VStack>
        )}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },
  prompt: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  reason: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.shell,
  },
  reasonSelected: { borderColor: colors.textPrimary, backgroundColor: colors.fieldFillPressed },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.textSecondary },
  radioSelected: { borderWidth: 5, borderColor: colors.textPrimary },
  reasonLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  privacy: { ...typography.caption, color: colors.textSecondary },
  receipt: { padding: spacing.md, borderRadius: 14, backgroundColor: colors.shell },
  receiptTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  body: { ...typography.body, color: colors.textSecondary },
  emergency: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
