import { Pressable } from '@/src/ui/HapticPressable';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, fonts, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { KwiltSwitch, type KwiltSwitchProps } from './KwiltSwitch';
import { Input } from './Input';
import { AppShell } from './layout/AppShell';

export function SettingsPage({
  children,
  contentStyle,
  headerAction,
  onBack,
  title,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  headerAction?: ReactNode;
  onBack: () => void;
  title: string;
}) {
  return (
    <AppShell backgroundVariant="shellAlt">
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
        <View style={styles.headerAction}>{headerAction}</View>
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

export function SettingsInstructionSection({
  children,
  footer,
  steps,
  title,
}: {
  children: ReactNode;
  footer?: string;
  steps: string[];
  title: string;
}) {
  return (
    <View style={styles.instructionSection}>
      <Text selectable style={styles.groupLabel}>
        {title}
      </Text>
      <View style={styles.instructionList}>
        {steps.map((step, index) => (
          <Text selectable key={`${index}-${step}`} style={styles.instructionStep}>
            {index + 1}. {step}
          </Text>
        ))}
      </View>
      <View style={styles.instructionAction}>{children}</View>
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
  showsDisclosureIndicator,
  title,
  value,
}: {
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  showsDisclosureIndicator?: boolean;
  title: string;
  value?: string;
}) {
  const showDisclosure = showsDisclosureIndicator ?? Boolean(onPress);
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
        {showDisclosure ? <Icon name="chevronRight" size={17} color={colors.textSecondary} /> : null}
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
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsChoiceRow({
  description,
  disabled = false,
  onPress,
  selected,
  title,
}: {
  description?: string;
  disabled?: boolean;
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowCopy}>
        <Text selectable={false} numberOfLines={1} style={styles.rowTitle}>
          {title}
        </Text>
        {description ? (
          <Text selectable={false} style={styles.rowDescription}>
            {description}
          </Text>
        ) : null}
      </View>
      <View
        testID={`settings.choice.${title}.indicator`}
        style={[styles.choiceIndicator, selected ? styles.choiceIndicatorSelected : null]}
      >
        {selected ? <View testID={`settings.choice.${title}.dot`} style={styles.choiceDot} /> : null}
      </View>
    </Pressable>
  );
}

export function SettingsTextInputRow({
  accessibilityHint,
  autoCapitalize,
  editable = true,
  keyboardType,
  label,
  onBlur,
  onChangeText,
  value,
}: {
  accessibilityHint?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  editable?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  label: string;
  onBlur?: TextInputProps['onBlur'];
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.textInputRow}>
      <Text selectable={false} style={styles.textInputLabel}>
        {label}
      </Text>
      <View style={styles.textInputControl}>
        <Input
          accessibilityHint={accessibilityHint}
          accessibilityLabel={label}
          accentLabelOnFocus={false}
          autoCapitalize={autoCapitalize}
          editable={editable}
          elevation="flat"
          inputStyle={styles.textInputValue}
          keyboardType={keyboardType}
          onBlur={onBlur}
          onChangeText={onChangeText}
          value={value}
          variant="inline"
        />
      </View>
    </View>
  );
}

export function SettingsCopyField({
  copied,
  label,
  onPress,
  value,
}: {
  copied: boolean;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <View style={styles.copyBlock}>
      <Text selectable={false} style={styles.copyLabel}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copied ? `${label}. Copied` : `${label}. Copy`}
        accessibilityValue={{ text: value }}
        onPress={onPress}
        style={({ pressed }) => [styles.copyField, pressed ? styles.pressed : null]}
      >
        <Text selectable numberOfLines={2} style={styles.copyValue}>
          {value}
        </Text>
        <View style={styles.copyIcon}>
          <Icon
            name={copied ? 'check' : 'clipboard'}
            size={18}
            color={copied ? colors.success : colors.textSecondary}
          />
        </View>
      </Pressable>
    </View>
  );
}

export function SettingsToggleRow({
  description,
  disabled = false,
  enabled,
  onPress,
  switchTone,
  title,
  value,
}: {
  description?: string;
  disabled?: boolean;
  enabled: boolean;
  onPress: () => void;
  switchTone?: KwiltSwitchProps['tone'];
  title: string;
  value?: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: enabled, disabled }}
      accessibilityValue={value ? { text: value } : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, disabled ? styles.disabled : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.rowCopy}>
        <Text selectable={false} numberOfLines={1} style={styles.rowTitle}>
          {title}
        </Text>
        {description ? (
          <Text selectable={false} style={styles.rowDescription}>
            {description}
          </Text>
        ) : null}
      </View>
      <View pointerEvents="none" style={styles.toggleTrailing}>
        {value ? (
          <Text selectable={false} numberOfLines={1} style={styles.rowValue}>
            {value}
          </Text>
        ) : null}
        <SettingsToggle
          accessible={false}
          accessibilityLabel={title}
          disabled={disabled}
          tone={switchTone}
          value={enabled}
          onPress={onPress}
        />
      </View>
    </Pressable>
  );
}

export function SettingsToggle({
  accessible,
  accessibilityLabel,
  disabled = false,
  onPress,
  tone,
  value,
}: Omit<KwiltSwitchProps, 'style'>) {
  return (
    <KwiltSwitch
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      tone={tone}
      value={value}
      onPress={onPress}
    />
  );
}

export function SettingsDivider() {
  return <View testID="settings.divider" style={styles.divider} />;
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
  headerAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: fonts.medium,
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
  instructionSection: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  instructionList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  instructionAction: {
    marginTop: spacing.md,
  },
  instructionStep: {
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
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
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowDescription: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitleDestructive: {
    color: colors.destructive,
  },
  copyBlock: {
    gap: spacing.xs,
  },
  copyLabel: {
    paddingHorizontal: spacing.md,
    color: colors.textSecondary,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    lineHeight: 16,
  },
  copyValue: {
    flex: 1,
    minWidth: 0,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  copyField: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  copyIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTrailing: {
    maxWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  toggleTrailing: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  choiceIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIndicatorSelected: {
    borderColor: colors.textPrimary,
  },
  choiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textPrimary,
  },
  textInputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  textInputLabel: {
    flexShrink: 0,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  textInputControl: {
    flex: 1,
    minWidth: 0,
  },
  textInputValue: {
    color: colors.textSecondary,
    textAlign: 'right',
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
