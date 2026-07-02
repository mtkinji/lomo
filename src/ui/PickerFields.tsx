import * as React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import { BottomDrawer, BottomDrawerScrollView } from './BottomDrawer';
import { Icon, type IconName } from './Icon';
import { Input } from './Input';
import { HStack, VStack } from './Stack';
import { Text } from './Typography';

export type PickerFieldOption = {
  value: string;
  label: string;
  subtitle?: string;
  keywords?: string[];
  disabled?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
};

export type PickerFieldRecommendedOption = PickerFieldOption & {
  recommendedLabel?: string;
};

type PickerFieldSize = 'default' | 'compact';
type PickerFieldVariant = 'outline' | 'filled';

type PickerFieldTriggerRenderArgs = {
  selectedLabel: string;
  open: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type PickerFieldTriggerProps = {
  value: string;
  options: PickerFieldOption[];
  placeholder: string;
  accessibilityLabel: string;
  allowDeselect?: boolean;
  disabled?: boolean;
  size?: PickerFieldSize;
  leadingIcon?: IconName;
  fieldVariant?: PickerFieldVariant;
  onPress: () => void;
  onClear?: () => void;
};

type SinglePickerProps = {
  options: PickerFieldOption[];
  value: string;
  onValueChange: (nextValue: string) => void;
  title?: string;
  placeholder: string;
  accessibilityLabel: string;
  allowDeselect?: boolean;
  disabled?: boolean;
  size?: PickerFieldSize;
  leadingIcon?: IconName;
  fieldVariant?: PickerFieldVariant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderTrigger?: (args: PickerFieldTriggerRenderArgs) => React.ReactNode;
};

type RelationPickerProps = SinglePickerProps & {
  title: string;
  searchPlaceholder?: string;
  emptyText?: string;
  recommendedOption?: PickerFieldRecommendedOption;
};

const OPTION_ROW_HEIGHT = 56;
const SHEET_HANDLE_HEIGHT = 24;
const SHEET_TITLE_HEIGHT = 48;
const SHEET_VERTICAL_PADDING = spacing.sm + spacing.md;
const MIN_SHEET_HEIGHT = 180;
const MAX_FIXED_SHEET_HEIGHT_RATIO = 0.68;

function getSelectedLabel(options: PickerFieldOption[], value: string) {
  if (!value) return '';
  return options.find((option) => option.value === value)?.label ?? '';
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function optionMatchesQuery(option: PickerFieldOption, query: string) {
  if (!query) return true;
  if (option.label.toLowerCase().includes(query)) return true;
  const subtitle = option.subtitle?.toLowerCase() ?? '';
  if (subtitle.includes(query)) return true;
  if (query.length < 3) return false;
  return (option.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(query));
}

function PickerFieldTrigger({
  value,
  options,
  placeholder,
  accessibilityLabel,
  allowDeselect = true,
  disabled,
  size = 'default',
  leadingIcon,
  fieldVariant = 'outline',
  onPress,
  onClear,
}: PickerFieldTriggerProps) {
  const selectedLabel = React.useMemo(() => getSelectedLabel(options, value), [options, value]);
  const showClear = Boolean(value) && allowDeselect && !disabled && onClear;
  const inputSize = size === 'compact' ? 'sm' : 'md';
  const inputStyle = size === 'compact' ? styles.valueInputCompact : styles.valueInput;
  const fieldContainerStyle =
    size === 'compact' ? styles.fieldContainerCompact : styles.fieldContainer;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={[styles.trigger, disabled && styles.triggerDisabled]}
    >
      <View pointerEvents="none">
        <Input
          value={selectedLabel}
          placeholder={placeholder}
          editable={false}
          variant={fieldVariant}
          elevation="flat"
          leadingIcon={leadingIcon}
          size={inputSize}
          containerStyle={[styles.valueContainer, fieldContainerStyle]}
          inputStyle={inputStyle}
        />
      </View>
      <View pointerEvents="box-none" style={styles.accessoryRow}>
        {showClear ? (
          <Pressable
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onClear?.();
            }}
            accessibilityRole="button"
            accessibilityLabel="Remove selection"
            style={styles.clearButton}
          >
            <Icon name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        <View pointerEvents="none" style={styles.chevronWrapper}>
          <Icon name="chevronsUpDown" size={16} color={colors.textSecondary} />
        </View>
      </View>
    </Pressable>
  );
}

function PickerOptionRow({
  option,
  selected,
  recommendedLabel,
  onPress,
}: {
  option: PickerFieldOption;
  selected: boolean;
  recommendedLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.label}
      disabled={option.disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        pressed && !option.disabled ? styles.optionRowPressed : null,
        option.disabled ? styles.optionRowDisabled : null,
      ]}
    >
      <HStack alignItems="center" justifyContent="space-between" style={styles.optionRowInner}>
        <HStack alignItems="center" space="sm" style={styles.optionLeft}>
          {option.leftElement ? <View style={styles.leftSlot}>{option.leftElement}</View> : null}
          <VStack space="xs" style={styles.optionTextStack}>
            <Text style={styles.optionLabel} numberOfLines={1}>
              {option.label}
            </Text>
            {option.subtitle ? (
              <Text style={styles.optionSubtitle} numberOfLines={1}>
                {option.subtitle}
              </Text>
            ) : null}
          </VStack>
        </HStack>
        {option.rightElement ? (
          option.rightElement
        ) : (
          <HStack alignItems="center" space="sm">
            {recommendedLabel ? <Text style={styles.recommendedText}>{recommendedLabel}</Text> : null}
            <View style={styles.checkSlot}>
              {selected ? <Icon name="check" size={18} color={colors.textPrimary} /> : null}
            </View>
          </HStack>
        )}
      </HStack>
    </Pressable>
  );
}

function FixedOptionsSheet({
  open,
  options,
  value,
  title,
  allowDeselect = true,
  onOpenChange,
  onValueChange,
}: {
  open: boolean;
  options: PickerFieldOption[];
  value: string;
  title?: string;
  allowDeselect?: boolean;
  onOpenChange: (open: boolean) => void;
  onValueChange: (nextValue: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxSheetHeight = Math.max(
    MIN_SHEET_HEIGHT,
    Math.floor((windowHeight - insets.top) * MAX_FIXED_SHEET_HEIGHT_RATIO),
  );
  const titleHeight = title ? SHEET_TITLE_HEIGHT : 0;
  const bottomPadding = Math.max(insets.bottom, spacing.md);
  const snapHeight = Math.min(
    maxSheetHeight,
    Math.max(
      MIN_SHEET_HEIGHT,
      SHEET_HANDLE_HEIGHT + titleHeight + SHEET_VERTICAL_PADDING + bottomPadding + options.length * OPTION_ROW_HEIGHT,
    ),
  );

  const handleSelect = React.useCallback(
    (nextValue: string) => {
      const option = options.find((candidate) => candidate.value === nextValue);
      if (option?.disabled) return;
      onValueChange(allowDeselect && nextValue === value ? '' : nextValue);
      onOpenChange(false);
    },
    [allowDeselect, onOpenChange, onValueChange, options, value],
  );

  return (
    <BottomDrawer
      visible={open}
      onClose={() => onOpenChange(false)}
      snapPoints={[snapHeight]}
      dismissOnBackdropPress
      dynamicSizing={false}
    >
      <BottomDrawerScrollView
        style={styles.fixedSheetList}
        contentContainerStyle={[styles.fixedSheetContent, { paddingBottom: bottomPadding + spacing.sm }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {title ? (
          <View style={styles.fixedSheetHeader}>
            <Text style={styles.fixedSheetTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : null}
        {options.map((option) => (
          <PickerOptionRow
            key={option.value}
            option={option}
            selected={option.value === value}
            onPress={() => handleSelect(option.value)}
          />
        ))}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

function FixedSetPickerField(props: SinglePickerProps) {
  const {
    options,
    value,
    onValueChange,
    allowDeselect = true,
    disabled,
    open: controlledOpen,
    onOpenChange,
    renderTrigger,
  } = props;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange],
  );
  const selectedLabel = React.useMemo(() => getSelectedLabel(options, value), [options, value]);

  const handleClear = React.useCallback(() => {
    setOpen(false);
    onValueChange('');
  }, [onValueChange, setOpen]);

  const handlePress = React.useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled, setOpen]);

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ selectedLabel, open, disabled, onPress: handlePress })
      ) : (
        <PickerFieldTrigger
          {...props}
          allowDeselect={allowDeselect}
          disabled={disabled}
          onPress={handlePress}
          onClear={allowDeselect ? handleClear : undefined}
        />
      )}
      <FixedOptionsSheet
        open={open}
        options={options}
        value={value}
        title={props.title}
        allowDeselect={allowDeselect}
        onOpenChange={setOpen}
        onValueChange={onValueChange}
      />
    </>
  );
}

export function EnumPickerField(props: SinglePickerProps) {
  return <FixedSetPickerField {...props} />;
}

export function SmallSetPickerField(props: SinglePickerProps) {
  return <FixedSetPickerField {...props} />;
}

export function RelationPickerField({
  options,
  value,
  onValueChange,
  placeholder,
  accessibilityLabel,
  allowDeselect = true,
  disabled,
  size = 'default',
  leadingIcon,
  fieldVariant = 'outline',
  title,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  recommendedOption,
  open: controlledOpen,
  onOpenChange,
  renderTrigger,
}: RelationPickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange],
  );
  const [query, setQuery] = React.useState('');
  const insets = useSafeAreaInsets();
  const selectedLabel = React.useMemo(() => getSelectedLabel(options, value), [options, value]);

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const displayOptions = React.useMemo(() => {
    const q = normalizeQuery(query);
    const recommendedBase = recommendedOption
      ? options.find((option) => option.value === recommendedOption.value) ?? recommendedOption
      : null;
    const recommendedMatches = recommendedBase && optionMatchesQuery(recommendedBase, q);
    const filtered = options.filter((option) => {
      if (recommendedMatches && option.value === recommendedBase.value) return false;
      return optionMatchesQuery(option, q);
    });
    return recommendedMatches ? [recommendedBase, ...filtered] : filtered;
  }, [options, query, recommendedOption]);

  const handleClear = React.useCallback(() => {
    setOpen(false);
    onValueChange('');
  }, [onValueChange, setOpen]);

  const handleSelect = React.useCallback(
    (nextValue: string) => {
      const option = displayOptions.find((candidate) => candidate.value === nextValue);
      if (option?.disabled) return;
      onValueChange(allowDeselect && nextValue === value ? '' : nextValue);
      setOpen(false);
    },
    [allowDeselect, displayOptions, onValueChange, setOpen, value],
  );

  const handlePress = React.useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled, setOpen]);

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ selectedLabel, open, disabled, onPress: handlePress })
      ) : (
        <PickerFieldTrigger
          value={value}
          options={options}
          placeholder={placeholder}
          accessibilityLabel={accessibilityLabel}
          allowDeselect={allowDeselect}
          disabled={disabled}
          size={size}
          leadingIcon={leadingIcon}
          fieldVariant={fieldVariant}
          onPress={handlePress}
          onClear={allowDeselect ? handleClear : undefined}
        />
      )}
      <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.relationScreen, { paddingTop: insets.top }]}
        >
          <View style={styles.relationHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close picker"
              onPress={() => setOpen(false)}
              hitSlop={10}
              style={styles.relationHeaderButton}
            >
              <Icon name="chevronLeft" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.relationTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.relationHeaderButton} />
          </View>

          <View style={styles.relationSearchRow}>
            <Icon name="search" size={20} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.muted}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.relationSearchInput}
            />
          </View>

          <ScrollView
            style={styles.relationList}
            contentContainerStyle={[styles.relationListContent, { paddingBottom: insets.bottom + spacing.xl }]}
            keyboardShouldPersistTaps="handled"
          >
            {displayOptions.length === 0 ? (
              <Text style={styles.emptyText}>{emptyText}</Text>
            ) : (
              displayOptions.map((option) => {
                const isRecommended = recommendedOption?.value === option.value;
                return (
                  <PickerOptionRow
                    key={option.value}
                    option={option}
                    selected={option.value === value}
                    recommendedLabel={isRecommended ? recommendedOption?.recommendedLabel ?? 'Recommended' : undefined}
                    onPress={() => handleSelect(option.value)}
                  />
                );
              })
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: '100%',
    position: 'relative',
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  valueContainer: {
    opacity: 1,
  },
  fieldContainer: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fieldContainerCompact: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  valueInput: {
    ...typography.body,
    color: colors.textPrimary,
    paddingRight: spacing['2xl'] + spacing.lg,
  },
  valueInputCompact: {
    ...typography.bodySm,
    color: colors.textPrimary,
    paddingRight: spacing['2xl'] + spacing.lg,
  },
  accessoryRow: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearButton: {
    height: 28,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  chevronWrapper: {
    height: 28,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedSheetList: {
    flex: 1,
  },
  fixedSheetContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  fixedSheetHeader: {
    height: SHEET_TITLE_HEIGHT,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  fixedSheetTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionRow: {
    minHeight: OPTION_ROW_HEIGHT,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  optionRowPressed: {
    backgroundColor: colors.shellAlt,
  },
  optionRowDisabled: {
    opacity: 0.6,
  },
  optionRowInner: {},
  optionLeft: {
    flex: 1,
    minWidth: 0,
  },
  leftSlot: {
    width: 24,
    alignItems: 'center',
  },
  optionTextStack: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  recommendedText: {
    ...typography.caption,
    color: colors.aiGradientEnd,
  },
  checkSlot: {
    width: 24,
    alignItems: 'center',
  },
  relationScreen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  relationHeader: {
    height: 56,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  relationHeaderButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relationTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  relationSearchRow: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  relationSearchInput: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  relationList: {
    flex: 1,
  },
  relationListContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
});
