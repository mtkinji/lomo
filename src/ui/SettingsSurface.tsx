import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { KwiltSwitch, type KwiltSwitchProps } from './KwiltSwitch';
import { AppShell } from './layout/AppShell';

export function SettingsPage({
  children,
  contentStyle,
  onBack,
  title,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  onBack: () => void;
  title: string;
}) {
  return (
    <AppShell>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Go back from ${title}`}
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <Icon name="arrowLeft" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text selectable numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={[styles.content, contentStyle]}>
        {children}
      </ScrollView>
    </AppShell>
  );
}

export function SettingsGroup({ children, footer, title }: { children: ReactNode; footer?: string; title?: string }) {
  return (
    <View style={styles.groupBlock}>
      {title ? (
        <Text selectable style={styles.groupLabel}>
          {title}
        </Text>
      ) : null}
      <View style={styles.group}>{children}</View>
      {footer ? (
        <Text selectable style={styles.groupFooter}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function SettingsRow({
  destructive = false,
  disabled = false,
  onPress,
  title,
  value,
}: {
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  title: string;
  value?: string;
}) {
  const content = (
    <>
      <Text selectable={false} numberOfLines={1} style={[styles.rowTitle, destructive ? styles.rowTitleDestructive : null]}>
        {title}
      </Text>
      <View style={styles.rowTrailing}>
        {value ? (
          <Text selectable={false} numberOfLines={1} style={styles.rowValue}>
            {value}
          </Text>
        ) : null}
        {onPress ? <Icon name="chevronRight" size={17} color={colors.textSecondary} /> : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View accessibilityState={{ disabled }} style={[styles.row, disabled ? styles.disabled : null]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsToggleRow({
  disabled = false,
  enabled,
  onPress,
  title,
}: {
  disabled?: boolean;
  enabled: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      <Text selectable={false} numberOfLines={1} style={styles.rowTitle}>
        {title}
      </Text>
      <SettingsToggle accessibilityLabel={title} disabled={disabled} value={enabled} onPress={onPress} />
    </Pressable>
  );
}

export function SettingsToggle({
  accessibilityLabel,
  disabled = false,
  onPress,
  value,
}: Omit<KwiltSwitchProps, 'style'>) {
  return <KwiltSwitch accessibilityLabel={accessibilityLabel} disabled={disabled} value={value} onPress={onPress} />;
}

export function SettingsDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.shellAlt,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.shellAlt,
  },
  content: {
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 152,
  },
  groupBlock: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  groupLabel: {
    paddingHorizontal: spacing.md,
    color: colors.textSecondary,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  group: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  groupFooter: {
    ...typography.bodyXs,
    paddingHorizontal: spacing.md,
    color: colors.textSecondary,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  rowTitle: {
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  rowTitleDestructive: {
    color: colors.destructive,
  },
  rowTrailing: {
    maxWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  rowValue: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
});
