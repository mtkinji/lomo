import * as React from 'react';
import type { RefObject } from 'react';
import { KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Activity } from '../../domain/types';
import { colors, spacing, typography } from '../../theme';
import { Icon } from '../../ui/Icon';
import { Card, HStack, Input } from '../../ui/primitives';

const QUICK_ADD_BAR_HEIGHT = 64;
const QUICK_ADD_IDLE_RAISE = 24;

type QuickAddDockProps = {
  value: string;
  onChangeText: (text: string) => void;
  inputRef: RefObject<TextInput | null>;
  isFocused: boolean;
  setIsFocused: (next: boolean) => void;
  onSubmit: () => void;
  onCollapse: () => void;

  reminderAt: string | null;
  scheduledDate: string | null;
  repeatRule: Activity['repeatRule'] | undefined;
  estimateMinutes: number | null;

  onPressReminder: () => void;
  onPressDueDate: () => void;
  onPressRepeat: () => void;
  onPressEstimate: () => void;

  /**
   * Reserve enough space so the last list rows can scroll above the dock.
   * This should be fed into the scroll view content container.
   */
  onReservedHeightChange?: (height: number) => void;
};

export function QuickAddDock({
  value,
  onChangeText,
  inputRef,
  isFocused,
  setIsFocused,
  onSubmit,
  onCollapse,
  reminderAt,
  scheduledDate,
  repeatRule,
  estimateMinutes,
  onPressReminder,
  onPressDueDate,
  onPressRepeat,
  onPressEstimate,
  onReservedHeightChange,
}: QuickAddDockProps) {
  const insets = useSafeAreaInsets();
  const activeBottomPadding = 0;
  const idleBottomPadding = Math.max(insets.bottom, spacing.sm);
  const bottomPadding = isFocused ? activeBottomPadding : idleBottomPadding;
  
  // Guard against blur events that fire immediately after focus (e.g., during layout transitions).
  const lastFocusTimeRef = React.useRef<number>(0);
  const BLUR_GUARD_MS = 300;

  // Minimum dock height used before we get a measurement.
  const fallbackHeight = QUICK_ADD_BAR_HEIGHT + bottomPadding + spacing.xs + (isFocused ? 0 : QUICK_ADD_IDLE_RAISE);

  const lastReservedHeightRef = React.useRef<number>(fallbackHeight);

  const reportReservedHeight = React.useCallback(
    (next: number) => {
      if (!onReservedHeightChange) return;
      if (next > 0 && next !== lastReservedHeightRef.current) {
        lastReservedHeightRef.current = next;
        onReservedHeightChange(next);
      }
    },
    [onReservedHeightChange],
  );

  return (
    <KeyboardAvoidingView
      style={styles.dock}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        pointerEvents="none"
        style={[styles.dockBackground, isFocused ? styles.dockBackgroundFocused : null]}
      />
      <View
        style={[
          styles.outer,
          isFocused ? styles.outerFocused : null,
          {
            paddingBottom: bottomPadding,
          },
        ]}
        onLayout={(event) => {
          const layoutHeight = Math.round(event.nativeEvent.layout.height);
          reportReservedHeight(layoutHeight);
        }}
      >
        <Pressable
          key="idle-gap-tap-shield"
          // Only block taps in the raised 24pt “gap” below the card (so the list behind is not clickable).
          // Keep this node mounted to avoid remounting the Card/TextInput when focus state flips.
          accessibilityRole="none"
          accessible={false}
          onPress={() => {}}
          pointerEvents={isFocused ? 'none' : 'auto'}
          style={[
            styles.idleGapTapShield,
            isFocused ? styles.idleGapTapShieldHidden : null,
          ]}
        />
        <Card
          key="quick-add-card"
          marginHorizontal={isFocused ? 0 : 'sm'}
          marginVertical={0}
          padding="xs"
          elevation={isFocused ? 'raised' : 'none'}
          style={[
            styles.card,
            isFocused ? styles.cardFocused : styles.cardIdleRaised,
          ]}
        >
          <HStack alignItems="center" space="md" style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isFocused ? 'Create activity' : 'Start adding an activity'}
              accessibilityState={{ disabled: isFocused ? value.trim().length === 0 : false }}
              onPress={() => {
                if (!isFocused) {
                  inputRef.current?.focus();
                  return;
                }
                if (value.trim().length === 0) {
                  return;
                }
                onSubmit();
              }}
              style={[styles.affordance, styles.affordanceIdle, isFocused && value.trim().length === 0 ? styles.affordanceDisabled : null]}
            >
              <Icon
                name="plus"
                size={16}
                color={isFocused && value.trim().length > 0 ? colors.accent : colors.textSecondary}
              />
            </Pressable>
            <Input
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              placeholder="Add an activity"
              placeholderTextColor={colors.textSecondary}
              variant="inline"
              returnKeyType="done"
              showSoftInputOnFocus
              blurOnSubmit
              onSubmitEditing={() => {
                if (value.trim().length === 0) {
                  onCollapse();
                  return;
                }
                onSubmit();
              }}
              onFocus={() => {
                lastFocusTimeRef.current = Date.now();
                // Animate the layout transition smoothly (card margins, elevation, border radius).
                LayoutAnimation.configureNext(
                  LayoutAnimation.create(
                    200,
                    LayoutAnimation.Types.easeInEaseOut,
                    LayoutAnimation.Properties.opacity | LayoutAnimation.Properties.scaleXY,
                  ),
                );
                setIsFocused(true);
              }}
              onBlur={() => {
                // Ignore blur events that fire too soon after focus (likely spurious layout-triggered blurs).
                const timeSinceFocus = Date.now() - lastFocusTimeRef.current;
                if (timeSinceFocus < BLUR_GUARD_MS) {
                  // Re-focus immediately to keep the keyboard open.
                  requestAnimationFrame(() => {
                    inputRef.current?.focus();
                  });
                  return;
                }
                // Animate the collapse transition smoothly.
                LayoutAnimation.configureNext(
                  LayoutAnimation.create(
                    200,
                    LayoutAnimation.Types.easeInEaseOut,
                    LayoutAnimation.Properties.opacity | LayoutAnimation.Properties.scaleXY,
                  ),
                );
                setIsFocused(false);
              }}
              autoCapitalize="sentences"
              autoCorrect
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              accessibilityLabel="Activity title"
            />
          </HStack>
          {isFocused ? (
            <HStack style={styles.toolsRow} alignItems="center" justifyContent="space-between">
              <HStack space="md" alignItems="center">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Set reminder"
                  onPress={onPressReminder}
                  style={[styles.toolButton, reminderAt ? styles.toolButtonActive : null]}
                >
                  <Icon name="bell" size={16} color={reminderAt ? colors.accent : colors.textSecondary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Set due date"
                  onPress={onPressDueDate}
                  style={[styles.toolButton, scheduledDate ? styles.toolButtonActive : null]}
                >
                  <Icon name="today" size={16} color={scheduledDate ? colors.accent : colors.textSecondary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Set repeat"
                  onPress={onPressRepeat}
                  style={[styles.toolButton, repeatRule ? styles.toolButtonActive : null]}
                >
                  <Icon name="refresh" size={16} color={repeatRule ? colors.accent : colors.textSecondary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Set time estimate"
                  onPress={onPressEstimate}
                  style={[styles.toolButton, estimateMinutes != null ? styles.toolButtonActive : null]}
                >
                  <Icon name="estimate" size={16} color={estimateMinutes != null ? colors.accent : colors.textSecondary} />
                </Pressable>
              </HStack>
            </HStack>
          ) : null}
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dockBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // Bleed the background out past the AppShell gutter so it reaches the bezel.
    left: -spacing.sm,
    right: -spacing.sm,
    backgroundColor: colors.shell,
  },
  dockBackgroundFocused: {
    backgroundColor: colors.canvas,
  },
  outer: {
    paddingHorizontal: 0,
    paddingTop: spacing.xs,
    backgroundColor: 'transparent',
  },
  idleGapTapShield: {
    position: 'absolute',
    left: -spacing.sm,
    right: -spacing.sm,
    bottom: 0,
    height: QUICK_ADD_IDLE_RAISE,
    // Transparent but intercepts touches.
    backgroundColor: 'transparent',
  },
  idleGapTapShieldHidden: {
    height: 0,
  },
  outerFocused: {
    // When active, treat the composer as a bottom drawer sheet.
    paddingTop: spacing.sm,
  },
  card: {
    marginVertical: 0,
    alignSelf: 'stretch',
    // Match input corner radius (`Input`, `EditableField`, `Combobox`).
    borderRadius: 12,
  },
  cardIdleRaised: {
    marginBottom: QUICK_ADD_IDLE_RAISE,
  },
  cardFocused: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  row: {
    flex: 1,
  },
  affordance: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affordanceIdle: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  affordanceDisabled: {
    opacity: 0.5,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textPrimary,
  },
  toolsRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toolButtonActive: {
    backgroundColor: colors.pine100,
  },
});


