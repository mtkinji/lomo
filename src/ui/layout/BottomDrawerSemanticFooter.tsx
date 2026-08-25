import { StyleSheet, View } from 'react-native';

import { spacing } from '../../theme';
import { Button } from '../Button';
import { ButtonLabel, Text } from '../Typography';
import type { HapticsEvent } from '../../services/HapticsService';

export type BottomDrawerFooterAction = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  testID?: string;
  haptic?: HapticsEvent | false;
};

export type BottomDrawerSecondaryAction = BottomDrawerFooterAction & {
  tone?: 'neutral' | 'destructive';
};

export type BottomDrawerFooterConfig = {
  primaryAction: BottomDrawerFooterAction;
  secondaryAction?: BottomDrawerSecondaryAction;
  status?: string;
  showTopBorder?: boolean;
};

function FooterActionButton({
  action,
  primary,
}: {
  action: BottomDrawerFooterAction | BottomDrawerSecondaryAction;
  primary: boolean;
}) {
  const destructive = !primary && 'tone' in action && action.tone === 'destructive';

  return (
    <Button
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      disabled={action.disabled}
      loading={action.loading}
      loadingLabel={action.loadingLabel}
      haptic={action.haptic}
      onPress={action.onPress}
      testID={action.testID}
      variant={primary ? 'primary' : 'ghost'}
      style={primary ? styles.primaryAction : styles.secondaryAction}
    >
      {destructive ? <ButtonLabel tone="destructive">{action.label}</ButtonLabel> : action.label}
    </Button>
  );
}

/**
 * Semantic completion region for a bounded drawer task.
 * BottomDrawer owns its outer geometry and safe-area placement; this component
 * owns only action hierarchy and optional status.
 */
export function BottomDrawerSemanticFooter({
  primaryAction,
  secondaryAction,
  status,
}: BottomDrawerFooterConfig) {
  return (
    <View testID="bottom-drawer.semantic-footer" style={styles.footer}>
      {status ? <Text tone="secondary">{status}</Text> : null}
      <View testID="bottom-drawer.semantic-footer.actions" style={styles.actions}>
        {secondaryAction ? (
          <FooterActionButton action={secondaryAction} primary={false} />
        ) : null}
        <FooterActionButton action={primaryAction} primary />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  primaryAction: {
    flexShrink: 1,
  },
  secondaryAction: {
    flexShrink: 1,
  },
});
