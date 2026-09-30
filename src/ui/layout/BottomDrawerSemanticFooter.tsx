import { StyleSheet, useWindowDimensions, View } from 'react-native';

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
  variant?: 'ghost' | 'link';
};

export type BottomDrawerFooterConfig = {
  primaryAction?: BottomDrawerFooterAction;
  secondaryAction?: BottomDrawerSecondaryAction;
  status?: string;
  showTopBorder?: boolean;
  actionLayout?: 'row' | 'stacked' | 'responsive';
};

export function shouldStackBottomDrawerFooterActions(
  layout: NonNullable<BottomDrawerFooterConfig['actionLayout']>,
  fontScale: number,
): boolean {
  return layout === 'stacked' || (layout === 'responsive' && fontScale >= 1.3);
}

function FooterActionButton({
  action,
  primary,
  stacked,
}: {
  action: BottomDrawerFooterAction | BottomDrawerSecondaryAction;
  primary: boolean;
  stacked: boolean;
}) {
  const destructive = !primary && 'tone' in action && action.tone === 'destructive';
  const secondaryVariant = !primary && 'variant' in action ? action.variant : undefined;

  return (
    <Button
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      disabled={action.disabled}
      loading={action.loading}
      loadingLabel={action.loadingLabel}
      haptic={action.haptic}
      onPress={action.onPress}
      testID={action.testID}
      variant={primary ? 'primary' : secondaryVariant ?? 'ghost'}
      size={secondaryVariant === 'link' ? 'inline' : 'default'}
      style={[
        primary ? styles.primaryAction : styles.secondaryAction,
        stacked ? styles.stackedAction : null,
      ]}
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
  actionLayout = 'row',
}: BottomDrawerFooterConfig) {
  const { fontScale } = useWindowDimensions();
  const stacked = shouldStackBottomDrawerFooterActions(actionLayout, fontScale);

  return (
    <View testID="bottom-drawer.semantic-footer" style={styles.footer}>
      {status ? <Text tone="secondary">{status}</Text> : null}
      <View
        testID="bottom-drawer.semantic-footer.actions"
        style={[styles.actions, stacked ? styles.actionsStacked : null]}
      >
        {secondaryAction ? (
          <FooterActionButton action={secondaryAction} primary={false} stacked={stacked} />
        ) : null}
        {primaryAction ? (
          <FooterActionButton action={primaryAction} primary stacked={stacked} />
        ) : null}
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
  actionsStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  primaryAction: {
    flexShrink: 1,
  },
  secondaryAction: {
    flexShrink: 1,
  },
  stackedAction: {
    alignSelf: 'stretch',
  },
});
