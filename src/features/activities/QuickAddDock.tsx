import * as React from 'react';
import type { RefObject } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Activity } from '../../domain/types';
import { colors, spacing, typography } from '../../theme';
import { cardElevation } from '../../theme/surfaces';
import { Icon } from '../../ui/Icon';
import { Card, HStack, Input } from '../../ui/primitives';

const QUICK_ADD_BAR_HEIGHT = 64;
// Idle state was intentionally “raised” off the bottom by 24pt; keep it flush to the bottom.
const QUICK_ADD_IDLE_RAISE = 0;
const QUICK_ADD_FOCUSED_TOP_RADIUS = 22;
const QUICK_ADD_TOP_SHADOW_HEIGHT = 32;
const QUICK_ADD_TOP_SHADOW_ALPHA = cardElevation.overlay.shadowOpacity;

const KEYBOARD_FALLBACK_DURATION_MS = 250;
const KEYBOARD_DEFAULT_GUESS_HEIGHT = 320;

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
  const backgroundTopInset = isFocused ? spacing.sm + QUICK_ADD_FOCUSED_TOP_RADIUS : 0;

  // Animate the dock like a bottom drawer: the surface remains anchored to the bottom of the phone,
  // and when the keyboard opens the visible controls are pushed up while the bottom part stays hidden
  // under the keyboard. This gives us "drawer" surface area behind the keyboard.
  //
  // NOTE(Android): RN only emits `keyboardDidShow/Hide` (after the animation). To avoid the dock
  // feeling delayed, we start a best-guess animation on focus and then correct to the real height.
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const lastKnownKeyboardHeightRef = React.useRef<number>(KEYBOARD_DEFAULT_GUESS_HEIGHT);
  const androidGuessInFlightRef = React.useRef(false);
  const keyboardHeightSv = useSharedValue(0);

  const outerAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: keyboardHeightSv.value + bottomPadding,
    };
  }, [bottomPadding]);

  // Extend the dock surface *under* the keyboard so iOS keyboard corner transparency
  // reveals the quick-add surface (white), not the app shell or system wallpaper.
  const dockBackgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      bottom: -keyboardHeightSv.value,
    };
  });

  React.useEffect(() => {
    const animateTo = (nextHeight: number, e?: any) => {
      const duration =
        typeof e?.duration === 'number' && Number.isFinite(e.duration)
          ? e.duration
          : KEYBOARD_FALLBACK_DURATION_MS;
      const easing = ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1);
      // Android emits the "real" height only after the keyboard animation finishes. If we already
      // ran the best-guess animation on focus, snap to the actual value instead of animating again
      // (a second animation reads as a stutter/jitter).
      if (Platform.OS === 'android' && androidGuessInFlightRef.current && nextHeight > 0) {
        keyboardHeightSv.value = nextHeight;
        androidGuessInFlightRef.current = false;
      } else {
        keyboardHeightSv.value = withTiming(nextHeight, { duration, easing });
        if (Platform.OS === 'android' && nextHeight === 0) {
          androidGuessInFlightRef.current = false;
        }
      }

      setKeyboardHeight(nextHeight);
      if (nextHeight > 0) lastKnownKeyboardHeightRef.current = nextHeight;
    };

    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillShow', (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        animateTo(next, e);
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', (e: any) => {
        animateTo(0, e);
      });
      const frameSub = Keyboard.addListener('keyboardWillChangeFrame', (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        animateTo(next, e);
      });

      return () => {
        showSub.remove();
        hideSub.remove();
        frameSub.remove();
      };
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      const next = e?.endCoordinates?.height ?? 0;
      animateTo(next, e);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', (e: any) => {
      animateTo(0, e);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeightSv]);
  
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
    <>
      <View style={styles.dock}>
      {isFocused ? (
        Platform.OS === 'ios' ? (
          <View pointerEvents="none" style={styles.topShadowIos} />
        ) : (
          <View pointerEvents="none" style={styles.topShadowAndroid}>
            <LinearGradient
              colors={['rgba(15,23,42,0)', `rgba(15,23,42,${QUICK_ADD_TOP_SHADOW_ALPHA})`]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        )
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dockBackground,
          { top: backgroundTopInset },
          isFocused ? styles.dockBackgroundFocused : null,
          isFocused ? styles.dockBackgroundBleedFull : null,
          dockBackgroundAnimatedStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.outer,
          isFocused ? styles.outerFocused : null,
          outerAnimatedStyle,
        ]}
        onLayout={(event) => {
          const layoutHeight = Math.round(event.nativeEvent.layout.height);
          const reservedHeight = isFocused ? Math.max(0, layoutHeight - keyboardHeight) : layoutHeight;
          reportReservedHeight(reservedHeight);
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
          elevation={isFocused ? 'overlay' : 'none'}
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
                // NOTE(Android): Avoid running a LayoutAnimation at the same time as the keyboard
                // “drawer” animation. Two different animation systems competing over layout can
                // produce a subtle stutter.
                setIsFocused(true);

                // Android keyboard height events arrive after the keyboard finishes animating.
                // Kick off an immediate "best guess" so the dock moves with the keyboard visually,
                // then `keyboardDidShow` will correct the exact height.
                if (Platform.OS === 'android') {
                  androidGuessInFlightRef.current = true;
                  const guess = lastKnownKeyboardHeightRef.current;
                  keyboardHeightSv.value = withTiming(guess, {
                    duration: KEYBOARD_FALLBACK_DURATION_MS,
                    easing: ReanimatedEasing.bezier(0.25, 0.1, 0.25, 1),
                  });
                }
              }}
              onBlur={() => {
                // Ignore blur events that fire too soon after focus (likely spurious layout-triggered blurs).
                const timeSinceFocus = Date.now() - lastFocusTimeRef.current;
                if (timeSinceFocus < BLUR_GUARD_MS) {
                  // Re-focus immediately to keep the keyboard open.
                  //
                  // IMPORTANT: Doing this asynchronously (e.g. `requestAnimationFrame`) can result in
                  // iOS showing a caret without presenting the keyboard, because the focus is no longer
                  // considered user-initiated. Keep this synchronous.
                  inputRef.current?.focus();
                  return;
                }
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
      </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  topShadowIos: {
    position: 'absolute',
    // Align the shadow to where the focused dock surface begins (outer paddingTop).
    top: spacing.sm,
    left: -spacing.sm,
    right: -spacing.sm,
    height: 1,
    // Keep the caster visually invisible while still allowing iOS to compute a shadow.
    backgroundColor: colors.card,
    shadowColor: cardElevation.overlay.shadowColor,
    shadowOpacity: cardElevation.overlay.shadowOpacity,
    shadowRadius: cardElevation.overlay.shadowRadius,
    shadowOffset: { width: 0, height: -Math.abs(cardElevation.overlay.shadowOffset.height) },
    // Android ignores negative shadow offsets, so we use a gradient fallback there.
    elevation: 0,
  },
  topShadowAndroid: {
    position: 'absolute',
    left: -spacing.sm,
    right: -spacing.sm,
    // Place the gradient just above the dock so it darkens the content above (casts "upwards").
    top: spacing.sm - QUICK_ADD_TOP_SHADOW_HEIGHT,
    height: QUICK_ADD_TOP_SHADOW_HEIGHT,
  },
  dockBackground: {
    position: 'absolute',
    bottom: 0,
    // Bleed the background out past the AppShell gutter so it reaches the bezel.
    left: -spacing.sm,
    right: -spacing.sm,
    backgroundColor: colors.shell,
  },
  dockBackgroundFocused: {
    backgroundColor: colors.canvas,
  },
  dockBackgroundBleedFull: {
    // Over-bleed horizontally while focused so keyboard corner transparency always shows white.
    left: -999,
    right: -999,
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


