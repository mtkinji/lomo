import * as React from 'react';
import { useMemo } from 'react';
import type { RefObject } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View, TextInput as RNTextInput, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Activity } from '../../domain/types';
import { colors, spacing, typography } from '../../theme';
import { fonts } from '../../theme/typography';
import { cardElevation } from '../../theme/surfaces';
import { Icon } from '../../ui/Icon';
import { HStack } from '../../ui/primitives';
import { EditorSurface } from '../../ui/EditorSurface';
import { Toolbar, ToolbarButton, ToolbarGroup } from '../../ui/Toolbar';
import { UnderKeyboardDrawer } from '../../ui/UnderKeyboardDrawer';

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
  onPressGenerateActivityTitle?: () => void;
  isGeneratingActivityTitle?: boolean;
  hasGeneratedActivityTitle?: boolean;

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
  onPressGenerateActivityTitle,
  isGeneratingActivityTitle,
  hasGeneratedActivityTitle,
  onReservedHeightChange,
}: QuickAddDockProps) {
  const insets = useSafeAreaInsets();
  const activeBottomPadding = 0;
  const idleBottomPadding = Math.max(insets.bottom, spacing.sm);
  const bottomPadding = isFocused ? activeBottomPadding : idleBottomPadding;
  
  // Generate accessory ID for keyboard toolbar
  // Keep stable ID in case we re-enable keyboard accessory behavior later.
  const accessoryId = useMemo(() => 'quick-add-dock-accessory', []);

  const [measuredComposerHeight, setMeasuredComposerHeight] = React.useState<number | null>(null);
  
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
          </ToolbarGroup>
          <ToolbarGroup>
            <ToolbarButton
              accessibilityLabel="Set time estimate"
              onPress={onPressEstimate}
              icon="estimate"
              variant={estimateMinutes != null ? 'primary' : 'secondary'}
            />
          </ToolbarGroup>
          <ToolbarGroup>
            <ToolbarButton
              accessibilityLabel={
                'Generate activity suggestion'
              }
              onPress={onPressGenerateActivityTitle}
              disabled={Boolean(isGeneratingActivityTitle)}
              icon="sparkles"
              label="AI Suggestion"
              tone="ai"
            />
          </ToolbarGroup>
        </Toolbar>
      </View>
    );
  }, [
    estimateMinutes,
    hasGeneratedActivityTitle,
    isGeneratingActivityTitle,
    onPressDueDate,
    onPressEstimate,
    onPressGenerateActivityTitle,
    onPressReminder,
    onPressRepeat,
    reminderAt,
    repeatRule,
    scheduledDate,
  ]);

  const composerHeight = measuredComposerHeight ?? QUICK_ADD_VISIBLE_ABOVE_KEYBOARD_FALLBACK_PX;
  const canSubmit = value.trim().length > 0;

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
                    <View style={styles.collapsedLeftIconSlot}>
                      <Icon name="plus" size={16} color={colors.textSecondary} />
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
      <UnderKeyboardDrawer
        visible={isFocused}
        onClose={onCollapse}
        presentation="inline"
        hideBackdrop
        dismissable={false}
        dynamicHeightUnderKeyboard
        visibleContentHeightFallbackPx={composerHeight}
        defaultKeyboardHeightGuessPx={KEYBOARD_DEFAULT_GUESS_HEIGHT}
        includeKeyboardSpacer
        elevationToken="overlay"
        topRadius="md"
        sheetStyle={styles.drawerSheet}
        handleContainerStyle={styles.drawerHandleContainer}
        handleStyle={styles.drawerHandle}
      >
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
                  accessibilityState={{ disabled: !canSubmit }}
                  onPress={() => {
                    if (!canSubmit) return;
                    onSubmit();
                  }}
                  style={[
                    styles.affordance,
                    styles.affordanceIdle,
                    !canSubmit ? styles.affordanceDisabled : null,
                  ]}
                >
                  {hasGeneratedActivityTitle ? (
                    <View style={styles.aiSuggestedAffordance}>
                      <Icon
                        name="sparkles"
                        size={16}
                        color={canSubmit ? colors.accent : colors.textSecondary}
                      />
                    </View>
                  ) : (
                    // Keep this as an "empty checkbox" affordance while composing (no completion signal).
                    <View
                      style={[
                        styles.createCheckboxBase,
                        styles.createCheckboxDisabled,
                      ]}
                    >
                      {/* Intentionally no inner icon while composing */}
                    </View>
                  )}
                </Pressable>

                <View style={styles.inputContainer}>
                  <View style={styles.titleFieldClipper}>
                    <RNTextInput
                      ref={inputRef}
                      value={value}
                      onChangeText={onChangeText}
                      placeholder="Add an activity"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="done"
                      showSoftInputOnFocus
                      blurOnSubmit
                      multiline={false}
                      numberOfLines={1}
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
                      style={styles.input}
                      accessibilityLabel="Activity title"
                    />
                  </View>
                </View>
              </View>
              {renderToolbar()}
            </View>
          </EditorSurface>
        </View>
      </UnderKeyboardDrawer>
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
    borderWidth: 1,
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
  collapsedLeftIconSlot: {
    width: 24,
    height: 24,
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
    fontSize: 15,
    lineHeight: 22,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
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
  createCheckboxBase: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCheckboxDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  createCheckboxEnabled: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  inputContainer: {
    flex: 1,
  },
  titleFieldClipper: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    ...typography.body,
    fontFamily: fonts.semibold,
    fontSize: 15,
    // Match ActivityListItem title metrics, but tune TextInput baseline so
    // descenders never clip while remaining visually centered.
    lineHeight: 22,
    ...(Platform.OS === 'ios'
      ? {
          marginTop: 0,
          paddingTop: 0,
          paddingBottom: 1,
          transform: [{ translateY: -1 }],
        }
      : null),
    color: colors.textPrimary,
    minWidth: 0,
  },
  aiSuggestedAffordance: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.canvas,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
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


