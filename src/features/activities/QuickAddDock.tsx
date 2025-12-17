import * as React from 'react';
import { useMemo } from 'react';
import type { RefObject } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Activity } from '../../domain/types';
import { colors, spacing, typography } from '../../theme';
import { cardElevation } from '../../theme/surfaces';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Icon } from '../../ui/Icon';
import { HStack, Input } from '../../ui/primitives';
import { EditorSurface } from '../../ui/EditorSurface';
import { Toolbar, ToolbarButton, ToolbarGroup } from '../../ui/Toolbar';

const QUICK_ADD_BAR_HEIGHT = 64;
// Idle state was intentionally “raised” off the bottom by 24pt; keep it flush to the bottom.
const QUICK_ADD_IDLE_RAISE = 0;
// Visually lift the collapsed "Add an activity" control so it aligns with the phone's bottom curve.
const COLLAPSED_DOCK_LIFT_PX = 12;

// Fallback visible height (above the keyboard) used before we have a measurement.
const QUICK_ADD_VISIBLE_ABOVE_KEYBOARD_FALLBACK_PX = 140;
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
  
  // Generate accessory ID for keyboard toolbar
  // Keep stable ID in case we re-enable keyboard accessory behavior later.
  const accessoryId = useMemo(() => 'quick-add-dock-accessory', []);

  // Animate the dock like a bottom drawer: the surface remains anchored to the bottom of the phone,
  // and when the keyboard opens the visible controls are pushed up while the bottom part stays hidden
  // under the keyboard. This gives us "drawer" surface area behind the keyboard.
  //
  // NOTE(Android): RN only emits `keyboardDidShow/Hide` (after the animation). To avoid the dock
  // feeling delayed, we start a best-guess animation on focus and then correct to the real height.
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const lastKnownKeyboardHeightRef = React.useRef<number>(KEYBOARD_DEFAULT_GUESS_HEIGHT);
  const [measuredComposerHeight, setMeasuredComposerHeight] = React.useState<number | null>(null);

  React.useEffect(() => {
    const setTo = (nextHeight: number) => {
      setKeyboardHeight(nextHeight);
      if (nextHeight > 0) lastKnownKeyboardHeightRef.current = nextHeight;
    };

    if (Platform.OS === 'ios') {
      const showSub = Keyboard.addListener('keyboardWillShow', (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        setTo(next);
      });
      const hideSub = Keyboard.addListener('keyboardWillHide', (e: any) => {
        setTo(0);
      });
      const frameSub = Keyboard.addListener('keyboardWillChangeFrame', (e: any) => {
        const next = e?.endCoordinates?.height ?? 0;
        setTo(next);
      });

      return () => {
        showSub.remove();
        hideSub.remove();
        frameSub.remove();
      };
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
      const next = e?.endCoordinates?.height ?? 0;
      setTo(next);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', (e: any) => {
      setTo(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
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

  // Focus the input after the focused drawer mounts.
  React.useEffect(() => {
    if (!isFocused) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [inputRef, isFocused]);

  const renderToolbar = React.useCallback(() => {
    return (
      <View style={styles.toolbarWrapper}>
        <Toolbar center style={styles.toolbar}>
          <ToolbarGroup>
            <ToolbarButton
              accessibilityLabel="Set reminder"
              onPress={onPressReminder}
              icon="bell"
              variant={reminderAt ? 'primary' : 'secondary'}
            />
            <ToolbarButton
              accessibilityLabel="Set due date"
              onPress={onPressDueDate}
              icon="today"
              variant={scheduledDate ? 'primary' : 'secondary'}
            />
            <ToolbarButton
              accessibilityLabel="Set repeat"
              onPress={onPressRepeat}
              icon="refresh"
              variant={repeatRule ? 'primary' : 'secondary'}
            />
            <ToolbarButton
              accessibilityLabel="Set time estimate"
              onPress={onPressEstimate}
              icon="estimate"
              variant={estimateMinutes != null ? 'primary' : 'secondary'}
            />
          </ToolbarGroup>
        </Toolbar>
      </View>
    );
  }, [estimateMinutes, onPressDueDate, onPressEstimate, onPressReminder, onPressRepeat, reminderAt, repeatRule, scheduledDate]);

  const effectiveKeyboardHeight =
    keyboardHeight > 0 ? keyboardHeight : isFocused ? lastKnownKeyboardHeightRef.current : 0;
  const composerHeight = measuredComposerHeight ?? QUICK_ADD_VISIBLE_ABOVE_KEYBOARD_FALLBACK_PX;
  const focusedDrawerHeight = Math.max(0, effectiveKeyboardHeight + composerHeight);

  return (
    <>
      {/* Collapsed dock (always mounted so we can measure + reserve scroll space). */}
      <View style={[styles.dock, isFocused ? styles.dockHidden : null]}>
        <View
          style={[
            // Full-width "shell" surface (edge-to-edge), with an inner gutter so the
            // input aligns with the 3-column card rhythm above.
            styles.collapsedShell,
            { paddingBottom: idleBottomPadding + COLLAPSED_DOCK_LIFT_PX },
          ]}
          onLayout={(event) => {
            const layoutHeight = Math.round(event.nativeEvent.layout.height);
            reportReservedHeight(layoutHeight);
          }}
        >
          <View style={styles.collapsedInnerGutter}>
            <View style={styles.collapsedInputShell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add an activity"
                onPress={() => setIsFocused(true)}
                style={styles.collapsedPressable}
              >
                <HStack
                  space="md"
                  alignItems="center"
                  justifyContent="space-between"
                  style={styles.collapsedRowContent}
                >
                  <HStack space="md" alignItems="center" style={{ flex: 1 }}>
                    <View style={styles.collapsedLeftCircle}>
                      <Icon name="plus" size={14} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.collapsedPlaceholderText}>Add an activity</Text>
                  </HStack>
                  {/* Reserve the same trailing "star" column width as ActivityListItem */}
                  <View style={styles.collapsedRightSpacer} />
                </HStack>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Focused drawer: use BottomDrawer sizing so the hidden portion sits under the keyboard,
          which exactly matches the Goals/Notes behavior you like. */}
      <BottomDrawer
        visible={isFocused}
        onClose={onCollapse}
        presentation="inline"
        hideBackdrop
        dismissable={false}
        keyboardAvoidanceEnabled={false}
        snapPoints={[focusedDrawerHeight]}
        sheetStyle={styles.drawerSheet}
        handleContainerStyle={styles.drawerHandleContainer}
        handleStyle={styles.drawerHandle}
      >
        <View style={styles.drawerSurfaceInner}>
          {/* Visible composer area (measured). */}
          <View
            style={styles.drawerContent}
            onLayout={(event) => {
              const next = Math.round(event.nativeEvent.layout.height);
              if (next > 0 && next !== measuredComposerHeight) {
                setMeasuredComposerHeight(next);
              }
            }}
          >
            <EditorSurface
              visible={isFocused}
              accessoryId={accessoryId}
              bodyTopPadding={0}
              bodyBottomPadding={0}
              keyboardClearance={0}
              disableBodyKeyboardPadding
              style={styles.editorSurface}
              bodyStyle={styles.editorBody}
            >
              <View style={styles.contentStack}>
                <View style={styles.composerRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create activity"
                    accessibilityState={{ disabled: value.trim().length === 0 }}
                    onPress={() => {
                      if (value.trim().length === 0) return;
                      onSubmit();
                    }}
                    style={[
                      styles.affordance,
                      styles.affordanceIdle,
                      value.trim().length === 0 ? styles.affordanceDisabled : null,
                    ]}
                  >
                    <Icon
                      name="plus"
                      size={16}
                      color={value.trim().length > 0 ? colors.accent : colors.textSecondary}
                    />
                  </Pressable>

                  <Input
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="Add an activity"
                    placeholderTextColor={colors.textSecondary}
                    variant="inline"
                    elevation="flat"
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
                      setIsFocused(true);
                    }}
                    onBlur={() => {
                      const timeSinceFocus = Date.now() - lastFocusTimeRef.current;
                      if (timeSinceFocus < BLUR_GUARD_MS) {
                        inputRef.current?.focus();
                        return;
                      }
                      // Don't auto-collapse on blur; the user likely tapped toolbar buttons.
                    }}
                    autoCapitalize="sentences"
                    autoCorrect
                    containerStyle={styles.inputContainer}
                    inputStyle={styles.input}
                    accessibilityLabel="Activity title"
                  />
                </View>
                {renderToolbar()}
              </View>
            </EditorSurface>
          </View>

          {/* Spacer representing the keyboard-covered region (behind the keyboard).
              With the sheet height = keyboardHeight + composerHeight, this keeps the
              composer fully visible above the keyboard while the white drawer continues
              behind it. */}
          <View style={{ height: effectiveKeyboardHeight }} />
        </View>
      </BottomDrawer>
    </>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Ensure the dock renders above the scroll view content on both platforms.
    zIndex: 50,
    elevation: 50,
  },
  dockHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  collapsedShell: {
    // Full-width dock "shell" behind the trigger row.
    paddingTop: spacing.sm,
    backgroundColor: colors.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...cardElevation.lift,
  },
  collapsedInnerGutter: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  collapsedInputShell: {
    width: '100%',
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    // Keep it looking like an input, not a card.
    ...cardElevation.none,
  },
  collapsedPressable: {
    width: '100%',
  },
  collapsedRowContent: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  collapsedLeftCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedRightSpacer: {
    width: 18,
    height: 18,
  },
  collapsedPlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  contentStack: {
    width: '100%',
    // Keep the toolbar visually attached to the input (no big gap).
    rowGap: spacing.xs,
  },
  composerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 44,
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
  toolbar: {
    backgroundColor: 'transparent',
    // Let the toolbar sit naturally inside the dock surface.
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  toolbarWrapper: {
    backgroundColor: colors.canvas,
    paddingTop: 0,
    paddingBottom: spacing.xs,
    alignItems: 'stretch',
  },
  drawerSheet: {
    // Important: BottomDrawer's default sheet uses `overflow: hidden`, which clips iOS shadows.
    // We want the sheet itself to cast a shadow, so keep overflow visible and clip the rounded
    // surface *inside* (see `drawerSurfaceInner`).
    // Keep the sheet itself white so the area *behind the keyboard* is also white.
    // (When this was transparent, the extra height under the visible composer showed the list.)
    backgroundColor: colors.canvas,
    paddingHorizontal: 0,
    paddingTop: 0,
    // Override BottomDrawer's default safe-area bottom padding; we handle keyboard placement
    // by padding the inner surface by `keyboardHeight`.
    paddingBottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    // Match the collapsed dock’s lift, but a bit stronger when open.
    // BottomDrawer provides a default shadow, but we override the sheet style,
    // so we need to explicitly re-apply elevation here.
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -10 },
    elevation: 14,
    overflow: 'visible',
  },
  drawerHandleContainer: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  drawerHandle: {
    width: 0,
    height: 0,
    opacity: 0,
  },
  drawerSurfaceInner: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    // Column stack: [keyboard spacer] + [composer]. When the sheet height equals
    // keyboardHeight + composerHeight, this produces a tight layout with no slack.
    flexDirection: 'column',
  },
  drawerContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: colors.canvas,
  },
  editorSurface: {
    // Override EditorSurface's default flex: 1 to allow it to size to content
    flex: 0,
    backgroundColor: 'transparent',
    minHeight: 0,
  },
  editorBody: {
    // Remove all padding since outer container already provides padding
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    // Allow body to size to content, not flex
    flex: 0,
  },
});


