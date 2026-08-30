import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Typography';

export function UnifiedChatCenteredState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={unifiedChatScreenStyles.centeredState}>
      <Text style={unifiedChatScreenStyles.stateTitle}>{title}</Text>
      {body ? <Text style={unifiedChatScreenStyles.stateBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Button variant="primary" onPress={onAction}>{actionLabel}</Button>
      ) : null}
    </View>
  );
}

export const unifiedChatScreenStyles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  webViewContainer: { flex: 1, backgroundColor: colors.canvas },
  webView: { backgroundColor: colors.canvas },
  errorBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.scheduleYellow },
  errorText: { ...typography.bodySm, color: colors.textPrimary },
  processingNoticeBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.infoSurface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  processingNoticeText: { ...typography.bodySm, color: colors.textSecondary },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.md },
  recoveryState: { flex: 1, justifyContent: 'center', marginTop: 0, padding: spacing['2xl'] },
  stateTitle: { ...typography.titleMd, color: colors.textPrimary, textAlign: 'center' },
  stateBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  picker: { flex: 1, backgroundColor: colors.canvas },
  pickerHeader: { minHeight: 58, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contextPickerTitle: { ...typography.titleSm, color: colors.textPrimary },
  contextPickerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  contextChoice: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contextChoiceText: { flex: 1, paddingVertical: spacing.sm },
  threadList: { padding: spacing.md, gap: spacing.xs },
  threadTitle: { ...typography.body, color: colors.textPrimary },
  threadDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyListText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingTop: spacing['2xl'] },
});
