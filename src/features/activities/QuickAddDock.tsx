import * as React from 'react';
import { useMemo } from 'react';
import type { RefObject } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, TextInput as RNTextInput, type TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../theme';
import { fonts } from '../../theme/typography';
import { Icon } from '../../ui/Icon';
import { HStack } from '../../ui/primitives';
import { EditorSurface } from '../../ui/EditorSurface';
import { UnderKeyboardDrawer } from '../../ui/UnderKeyboardDrawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../ui/DropdownMenu';
import { KWILT_BOTTOM_BAR_RESERVED_HEIGHT_PX } from '../../navigation/kwiltBottomBarMetrics';
import { DEFAULT_QUICK_ADD_AI_ACTIONS, type QuickAddAiAction } from './useQuickAddDockController';

const QUICK_ADD_BAR_HEIGHT = 64;
const QUICK_ADD_DOCK_FLOATING_GAP_PX = spacing.sm;
const QUICK_ADD_DOCK_SURFACE_RADIUS = 14;
const QUICK_ADD_DOCK_CHROME_ANIMATION_MS = 260;
const QUICK_ADD_DOCK_FADE_EDGE_DISTANCE_PX = 8;
const QUICK_ADD_DOCK_FADE_MAX_ALPHA = 0.88;

// Fallback visible height (above the keyboard) used before we have a measurement.
const QUICK_ADD_VISIBLE_ABOVE_KEYBOARD_FALLBACK_PX = 140;
const KEYBOARD_DEFAULT_GUESS_HEIGHT = 320;
const QUICK_ADD_INPUT_MIN_HEIGHT = 22;
const QUICK_ADD_INPUT_MAX_HEIGHT = 96;
const QUICK_ADD_INPUT_APPROX_CHARS_PER_LINE = 44;

const AI_ACTION_OPTIONS: Array<{
  id: QuickAddAiAction;
  label: string;
  icon: 'fileText' | 'checklist' | 'estimate';
}> = [
  { id: 'details', label: 'Fill details', icon: 'fileText' },
  { id: 'steps', label: 'Add steps', icon: 'checklist' },
  { id: 'estimate', label: 'Estimate time', icon: 'estimate' },
];

type QuickAddDockProps = {
  /**
   * Default: 'bottomDock'
   * - bottomDock: current behavior (absolute anchored to bottom, reserves scroll space)
   * - inline: render the collapsed trigger row inline (no absolute positioning)
   */
  placement?: 'bottomDock' | 'inline';
  value: string;
  onChangeText: (text: string) => void;
  inputRef: RefObject<TextInput | null>;
  isFocused: boolean;
  setIsFocused: (next: boolean) => void;
  onSubmit: (options?: { aiActions?: QuickAddAiAction[] }) => void;
  onCollapse: () => void;

  /**
   * When true (default), the focused drawer collapses after a successful submit.
   */
  dismissAfterSubmit?: boolean;

  /**
   * Reserve enough space so the last list rows can scroll above the dock.
   * This should be fed into the scroll view content container.
   */
  onReservedHeightChange?: (height: number) => void;
  /**
   * Bottom offset for the collapsed dock. Defaults to sitting above the global
   * bottom bar, but To-dos can lower it when global chrome auto-hides.
   */
  collapsedBottomOffsetPx?: number;
};

export function QuickAddDock({
  placement = 'bottomDock',
  value,
  onChangeText,
  inputRef,
  isFocused,
  setIsFocused,
  onSubmit,
  onCollapse,
  dismissAfterSubmit = true,
  onReservedHeightChange,
  collapsedBottomOffsetPx: collapsedBottomOffsetPxProp,
}: QuickAddDockProps) {
  const collapsedBottomOffsetPx =
    placement === 'inline'
      ? 0
      : collapsedBottomOffsetPxProp ?? KWILT_BOTTOM_BAR_RESERVED_HEIGHT_PX + QUICK_ADD_DOCK_FLOATING_GAP_PX;
  
  // Generate accessory ID for keyboard toolbar
  // Keep stable ID in case we re-enable keyboard accessory behavior later.
  const accessoryId = useMemo(() => 'quick-add-dock-accessory', []);

  const [measuredComposerHeight, setMeasuredComposerHeight] = React.useState<number | null>(null);
  const [selectedAiActions, setSelectedAiActions] = React.useState<QuickAddAiAction[]>(
    DEFAULT_QUICK_ADD_AI_ACTIONS,
  );
  const [isAiMenuOpen, setIsAiMenuOpen] = React.useState(false);
  const [inputHeight, setInputHeight] = React.useState(QUICK_ADD_INPUT_MIN_HEIGHT);
  
  // Guard against blur events that fire immediately after focus (e.g., during layout transitions).
  const lastFocusTimeRef = React.useRef<number>(0);
  const BLUR_GUARD_MS = 300;

  // Minimum dock height used before we get a measurement.
  const fallbackHeight = QUICK_ADD_BAR_HEIGHT + collapsedBottomOffsetPx + spacing.xs;

  const lastReservedHeightRef = React.useRef<number>(fallbackHeight);
  const measuredCollapsedSurfaceHeightRef = React.useRef<number>(0);
  const expandedCollapsedBottomOffsetRef = React.useRef(collapsedBottomOffsetPx);
  const collapsedDockTranslateY = React.useRef(new Animated.Value(0)).current;
  if (collapsedBottomOffsetPx > expandedCollapsedBottomOffsetRef.current) {
    expandedCollapsedBottomOffsetRef.current = collapsedBottomOffsetPx;
  }

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

  React.useEffect(() => {
    const nextTranslateY = Math.max(0, expandedCollapsedBottomOffsetRef.current - collapsedBottomOffsetPx);

    Animated.timing(collapsedDockTranslateY, {
      toValue: nextTranslateY,
      duration: QUICK_ADD_DOCK_CHROME_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const measuredHeight = measuredCollapsedSurfaceHeightRef.current;
    if (measuredHeight > 0) {
      reportReservedHeight(measuredHeight + collapsedBottomOffsetPx + spacing.xs);
    }
  }, [collapsedDockTranslateY, collapsedBottomOffsetPx, reportReservedHeight]);

  // Focus the input after the focused drawer mounts.
  React.useEffect(() => {
    if (!isFocused) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [inputRef, isFocused]);

  React.useEffect(() => {
    if (value.trim().length === 0 && inputHeight !== QUICK_ADD_INPUT_MIN_HEIGHT) {
      setInputHeight(QUICK_ADD_INPUT_MIN_HEIGHT);
    }
  }, [inputHeight, value]);

  const resolveInputHeightForText = React.useCallback((text: string, measuredContentHeight?: number) => {
    const explicitLines = text.split('\n').length;
    const shouldWrap = explicitLines > 1 || text.length > QUICK_ADD_INPUT_APPROX_CHARS_PER_LINE;
    if (!shouldWrap) return QUICK_ADD_INPUT_MIN_HEIGHT;

    const wrappedLines = Math.max(
      explicitLines,
      Math.ceil(text.length / QUICK_ADD_INPUT_APPROX_CHARS_PER_LINE),
      1,
    );
    const estimatedHeight = Math.max(
      QUICK_ADD_INPUT_MIN_HEIGHT,
      wrappedLines * 22 + 8,
      measuredContentHeight ?? 0,
    );
    return Math.min(QUICK_ADD_INPUT_MAX_HEIGHT, estimatedHeight);
  }, []);

  const setResolvedInputHeight = React.useCallback((nextHeight: number) => {
    setInputHeight((current) => (current === nextHeight ? current : nextHeight));
  }, []);

  const isInputExpanded = inputHeight > QUICK_ADD_INPUT_MIN_HEIGHT;
  const composerHeight = measuredComposerHeight ?? QUICK_ADD_VISIBLE_ABOVE_KEYBOARD_FALLBACK_PX;
  const canSubmit = value.trim().length > 0;
  const selectedAiActionSet = React.useMemo(() => new Set(selectedAiActions), [selectedAiActions]);
  const toggleAiAction = React.useCallback((action: QuickAddAiAction) => {
    setSelectedAiActions((current) => {
      if (current.includes(action)) return current.filter((item) => item !== action);
      return [...current, action];
    });
  }, []);
  const submitQuickAdd = React.useCallback(() => {
    if (!canSubmit) return;
    setIsAiMenuOpen(false);
    onSubmit({ aiActions: selectedAiActions });
    if (dismissAfterSubmit) onCollapse();
  }, [canSubmit, dismissAfterSubmit, onCollapse, onSubmit, selectedAiActions]);
  const selectedAiActionCount = selectedAiActions.length;
  const aiActionSummary =
    selectedAiActionCount === 0 ? 'Off' : `${selectedAiActionCount} on`;
  const measuredCollapsedSurfaceHeight = measuredCollapsedSurfaceHeightRef.current || QUICK_ADD_BAR_HEIGHT;
  const footerFadeHeight =
    measuredCollapsedSurfaceHeight + expandedCollapsedBottomOffsetRef.current + QUICK_ADD_DOCK_FADE_EDGE_DISTANCE_PX;
  const footerFadeRampEnd = Math.min(
    0.16,
    Math.max(0.04, QUICK_ADD_DOCK_FADE_EDGE_DISTANCE_PX / Math.max(1, footerFadeHeight)),
  );

  return (
    <>
      {/* Collapsed dock trigger (always mounted so we can open quickly). */}
      {placement === 'bottomDock' ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.footerFade,
              {
                height: footerFadeHeight,
                transform: [{ translateY: collapsedDockTranslateY }],
              },
              isFocused ? styles.dockHidden : null,
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                `rgba(255,255,255,${QUICK_ADD_DOCK_FADE_MAX_ALPHA})`,
                `rgba(255,255,255,${QUICK_ADD_DOCK_FADE_MAX_ALPHA})`,
              ]}
              {...({ locations: [0, footerFadeRampEnd, 1] } as any)}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.floatingDock,
              {
                bottom: expandedCollapsedBottomOffsetRef.current,
                transform: [{ translateY: collapsedDockTranslateY }],
              },
              isFocused ? styles.dockHidden : null,
            ]}
          >
            <View
              style={[
                styles.floatingSurface,
              ]}
              onLayout={(event) => {
                const layoutHeight = Math.round(event.nativeEvent.layout.height);
                measuredCollapsedSurfaceHeightRef.current = layoutHeight;
                reportReservedHeight(layoutHeight + collapsedBottomOffsetPx + spacing.xs);
              }}
            >
              <View style={styles.collapsedInputShell}>
                <CollapsedQuickAddTrigger onPress={() => setIsFocused(true)} />
              </View>
            </View>
          </Animated.View>
        </>
      ) : (
        <View style={isFocused ? styles.inlineHidden : null}>
          <View style={styles.collapsedInputShell}>
            <CollapsedQuickAddTrigger onPress={() => setIsFocused(true)} />
          </View>
        </View>
      )}

      {/* Focused drawer: use BottomDrawer sizing so the hidden portion sits under the keyboard,
          which exactly matches the Goals/Notes behavior you like. */}
      <UnderKeyboardDrawer
        visible={isFocused}
        onClose={onCollapse}
        // Use modal presentation so the drawer is full-width and reliably anchored
        // to the bottom of the viewport (inline presentation can be constrained by parent layout).
        presentation="modal"
        hideBackdrop={false}
        backdropMaxOpacity={0}
        dismissable
        dismissOnBackdropPress
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
            <View style={styles.composerCard}>
                <View style={[styles.composerInputRow, isInputExpanded ? styles.composerInputRowExpanded : null]}>
                  <View style={[styles.affordance, isInputExpanded ? styles.affordanceExpanded : null]}>
                    <View
                      style={[
                        styles.createCheckboxBase,
                        styles.createCheckboxDisabled,
                      ]}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <View style={styles.titleFieldClipper}>
                      <RNTextInput
                        ref={inputRef}
                        testID="e2e.activities.quickAdd.input"
                        value={value}
                        onChangeText={(next) => {
                          onChangeText(next);
                          setResolvedInputHeight(resolveInputHeightForText(next));
                        }}
                        placeholder="Add a to-do"
                        placeholderTextColor={colors.textSecondary}
                        returnKeyType="done"
                        showSoftInputOnFocus
                        blurOnSubmit
                        multiline={isInputExpanded}
                        scrollEnabled={isInputExpanded && inputHeight >= QUICK_ADD_INPUT_MAX_HEIGHT}
                        onContentSizeChange={(event) => {
                          const contentHeight = Math.ceil(event.nativeEvent.contentSize.height);
                          setResolvedInputHeight(resolveInputHeightForText(value, contentHeight));
                        }}
                        onSubmitEditing={() => {
                          if (value.trim().length === 0) {
                            onCollapse();
                            return;
                          }
                          submitQuickAdd();
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
                          // Don't auto-collapse on blur; the user likely tapped composer actions.
                        }}
                        autoCapitalize="sentences"
                        autoCorrect
                        style={[
                          styles.input,
                          { height: inputHeight },
                          value.length > 0 && !isInputExpanded ? styles.inputWithSingleLineValue : null,
                        ]}
                        accessibilityLabel="To-do title"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.composerActionsRow}>
                  <DropdownMenu
                    {...({
                      open: isAiMenuOpen,
                      onOpenChange: setIsAiMenuOpen,
                    } as any)}
                  >
                    <DropdownMenuTrigger {...({ asChild: true } as any)}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="AI actions"
                        accessibilityState={{ expanded: isAiMenuOpen }}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.aiMenuTrigger,
                          pressed ? styles.aiMenuTriggerPressed : null,
                        ]}
                      >
                        <Icon
                          name="sparkles"
                          size={14}
                          color={isAiMenuOpen ? colors.textPrimary : colors.textSecondary}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.aiMenuTriggerText,
                            isAiMenuOpen ? styles.aiMenuTriggerTextOpen : null,
                          ]}
                        >
                          AI actions
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.aiMenuTriggerMeta,
                            isAiMenuOpen ? styles.aiMenuTriggerMetaOpen : null,
                          ]}
                        >
                          {aiActionSummary}
                        </Text>
                        <Icon
                          name={isAiMenuOpen ? 'chevronUp' : 'chevronDown'}
                          size={14}
                          color={isAiMenuOpen ? colors.textPrimary : colors.textSecondary}
                        />
                      </Pressable>
                    </DropdownMenuTrigger>

                    {isAiMenuOpen ? (
                      <DropdownMenuContent
                        side="top"
                        align="start"
                        sideOffset={8}
                        style={styles.aiMenuCard}
                      >
                        <View style={styles.aiMenuHeader}>
                          <Text style={styles.aiMenuTitle}>AI actions</Text>
                          <Text style={styles.aiMenuSummary}>{aiActionSummary}</Text>
                        </View>
                        {AI_ACTION_OPTIONS.map((chip) => {
                          const selected = selectedAiActionSet.has(chip.id);
                          return (
                            <Pressable
                              key={chip.id}
                              accessibilityRole="switch"
                              accessibilityLabel={`AI ${chip.label.toLowerCase()}`}
                              accessibilityState={{ checked: selected }}
                              onPress={() => toggleAiAction(chip.id)}
                              style={({ pressed }) => [
                                styles.aiMenuItem,
                                pressed ? styles.aiMenuItemPressed : null,
                              ]}
                            >
                              <View style={styles.aiMenuItemIcon}>
                                <Icon
                                  name={chip.icon}
                                  size={15}
                                  color={selected ? colors.textPrimary : colors.textSecondary}
                                />
                              </View>
                              <Text style={styles.aiMenuItemLabel}>{chip.label}</Text>
                              <View
                                style={[
                                  styles.aiMenuSwitchTrack,
                                  selected ? styles.aiMenuSwitchTrackOn : null,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.aiMenuSwitchThumb,
                                    selected ? styles.aiMenuSwitchThumbOn : null,
                                  ]}
                                />
                              </View>
                            </Pressable>
                          );
                        })}
                      </DropdownMenuContent>
                    ) : null}
                  </DropdownMenu>

                  <Pressable
                    testID="e2e.activities.quickAdd.submit"
                    accessibilityRole="button"
                    accessibilityLabel="Create to-do"
                    accessibilityState={{ disabled: !canSubmit }}
                    onPress={submitQuickAdd}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.sendButton,
                      !canSubmit ? styles.sendButtonDisabled : null,
                      pressed && canSubmit ? styles.sendButtonPressed : null,
                    ]}
                  >
                    <Icon
                      name="arrowUp"
                      size={18}
                      color={canSubmit ? colors.primaryForeground : colors.textSecondary}
                    />
                  </Pressable>
                </View>
            </View>
          </EditorSurface>
        </View>
      </UnderKeyboardDrawer>
    </>
  );
}

function CollapsedQuickAddTrigger({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      testID="e2e.activities.quickAdd.open"
      accessibilityRole="button"
      accessibilityLabel="Add a to-do"
      onPress={onPress}
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
          <Text style={styles.collapsedPlaceholderText}>Add a to-do</Text>
        </HStack>
        {/* Reserve the same trailing "star" column width as ActivityListItem */}
        <View style={styles.collapsedRightSpacer} />
      </HStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 45,
    elevation: 45,
  },
  floatingDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    // Ensure the dock renders above the scroll view content on both platforms.
    zIndex: 50,
    elevation: 50,
  },
  floatingSurface: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: 'transparent',
  },
  dockHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  inlineHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  collapsedInputShell: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: QUICK_ADD_DOCK_SURFACE_RADIUS,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  collapsedPressable: {
    width: '100%',
  },
  collapsedRowContent: {
    minHeight: 48,
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
  composerCard: {
    width: '100%',
    columnGap: spacing.sm,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: QUICK_ADD_DOCK_SURFACE_RADIUS + 2,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    rowGap: spacing.xs,
    minHeight: 92,
    overflow: 'visible',
    position: 'relative',
    zIndex: 2,
  },
  composerInputRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    minHeight: 42,
  },
  composerInputRowExpanded: {
    alignItems: 'flex-start',
  },
  affordance: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affordanceExpanded: {
    marginTop: 10,
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
    flexShrink: 1,
    minWidth: 0,
  },
  titleFieldClipper: {
    width: '100%',
    minWidth: 0,
  },
  input: {
    width: '100%',
    maxWidth: '100%',
    flexShrink: 1,
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
          paddingBottom: 0,
        }
      : {
          textAlignVertical: 'top',
        }),
    color: colors.textPrimary,
    minWidth: 0,
  },
  inputWithSingleLineValue: {
    ...(Platform.OS === 'ios'
      ? {
          transform: [{ translateY: -4 }],
        }
      : null),
  },
  composerActionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
  },
  aiMenuTrigger: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: 'transparent',
    flexShrink: 1,
  },
  aiMenuTriggerPressed: {
    opacity: 0.62,
  },
  aiMenuTriggerText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  aiMenuTriggerTextOpen: {
    color: colors.textPrimary,
  },
  aiMenuTriggerMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  aiMenuTriggerMetaOpen: {
    color: colors.textSecondary,
  },
  aiMenuCard: {
    width: 264,
    minWidth: 264,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  aiMenuHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-between',
  },
  aiMenuTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  aiMenuSummary: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  aiMenuItem: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  aiMenuItemPressed: {
    backgroundColor: colors.secondary,
  },
  aiMenuItemIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMenuItemLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    flex: 1,
  },
  aiMenuSwitchTrack: {
    width: 38,
    height: 22,
    borderRadius: 999,
    padding: 2,
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  aiMenuSwitchTrackOn: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  aiMenuSwitchThumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.canvas,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  aiMenuSwitchThumbOn: {
    alignSelf: 'flex-end',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sendButtonPressed: {
    opacity: 0.86,
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
    paddingBottom: spacing.sm,
    backgroundColor: colors.canvas,
    overflow: 'visible',
  },
  editorSurface: {
    // Override EditorSurface's default flex: 1 to allow it to size to content
    flex: 0,
    backgroundColor: 'transparent',
    minHeight: 0,
    overflow: 'visible',
  },
  editorBody: {
    // Remove all padding since outer container already provides padding
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    // Allow body to size to content, not flex
    flex: 0,
    overflow: 'visible',
  },
});
