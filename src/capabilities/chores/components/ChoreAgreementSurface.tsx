import type { LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Icon } from '../../../ui/Icon';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Text } from '../../../ui/primitives';
import type { ChoreAgreementProjection } from '../domain/choreLearning';

export function ChoreTokenValue({ value, context }: {
  value: number;
  context: 'balance' | 'earning' | 'earned';
}) {
  const accessibilityLabel = context === 'balance'
    ? `${value} token${value === 1 ? '' : 's'}`
    : `${context === 'earned' ? 'Earned' : 'Earns'} ${value} token${value === 1 ? '' : 's'}`;
  const visibleLabel = `${value} token${value === 1 ? '' : 's'}`;
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.tokenValue}>
      <Icon name="circleDollarSign" size={16} color={colors.textSecondary} />
      <Text tone="secondary">{visibleLabel}</Text>
    </View>
  );
}

export function ChoreAgreementBar({ agreement, onOpen, onLayout }: {
  agreement: ChoreAgreementProjection;
  onOpen: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const insets = useSafeAreaInsets();
  const hasAgreement = Boolean(agreement.headline);
  if (!hasAgreement && agreement.tokenBalance == null) return null;

  return (
    <View
      onLayout={onLayout}
      style={[styles.barHost, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
      testID="chores.agreement.bar"
    >
      <View style={styles.barContent}>
        {hasAgreement ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="How my chores work"
            onPress={onOpen}
            style={({ pressed }) => [styles.agreementPressable, pressed && styles.pressed]}
          >
            <Text variant="label" numberOfLines={2}>{agreement.headline}</Text>
            {agreement.supporting ? (
              <Text tone="secondary" numberOfLines={2}>{agreement.supporting}</Text>
            ) : null}
          </Pressable>
        ) : <View style={styles.agreementPressable} />}
        {agreement.tokenBalance != null ? (
          <ChoreTokenValue value={agreement.tokenBalance} context="balance" />
        ) : null}
      </View>
    </View>
  );
}

export function ChoreAgreementDrawer({ visible, agreement, onClose }: {
  visible: boolean;
  agreement: ChoreAgreementProjection;
  onClose: () => void;
}) {
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['48%', '70%']} initialSnapIndex={0}>
      <BottomDrawerScrollView
        testID="chores.agreement.drawer"
        contentContainerStyle={styles.drawerContent}
      >
        <BottomDrawerHeader
          variant="withClose"
          title="How my chores work"
          onClose={onClose}
          closeAccessibilityLabel="Close how my chores work"
        />
        <View style={styles.sections}>
          {agreement.sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text variant="label">{section.label}</Text>
              {section.id === 'tokens' && agreement.tokenBalance != null ? (
                <ChoreTokenValue value={agreement.tokenBalance} context="balance" />
              ) : null}
              <Text tone="secondary">{section.body}</Text>
            </View>
          ))}
        </View>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  barHost: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.shell,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  barContent: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  agreementPressable: { minHeight: 44, flex: 1, minWidth: 0, gap: spacing.xs, justifyContent: 'center' },
  tokenValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  pressed: { opacity: 0.65 },
  drawerContent: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sections: { gap: spacing.xl },
  section: { gap: spacing.xs },
});
