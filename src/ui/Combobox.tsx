import type { ReactElement, ReactNode } from 'react';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  findNodeHandle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import type { BottomDrawerSnapPoint } from './BottomDrawer';
import { BottomDrawerScrollView } from './BottomDrawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './DropdownMenu';
import { Input } from './Input';
import { HStack, VStack } from './Stack';
import { Text } from './Typography';
import { Icon } from './Icon';
import { useKeyboardAwareScroll } from './KeyboardAwareScrollView';
import { UnderKeyboardDrawer } from './UnderKeyboardDrawer';

const MAX_MENU_HEIGHT = 480; // Keeps long lists scrollable while showing more options.
const MIN_MENU_HEIGHT = 180;
// When the keyboard is about to open due to the combobox search autofocus,
// scroll the *trigger field* up enough to keep the label + field + menu visible.
const REVEAL_EXTRA_OFFSET = MAX_MENU_HEIGHT + spacing.md;
const DEFAULT_DRAWER_SNAP_POINTS: BottomDrawerSnapPoint[] = ['60%'];

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string[];
  /**
   * When true, the row is non-interactive (useful for "Searching…" or section headers).
   */
  disabled?: boolean;
  /**
   * Optional element shown inline before the label (e.g. an icon).
   */
  leftElement?: ReactNode;
  /**
   * Optional element shown on the right side of the row.
   * If provided, the default selection checkmark is suppressed.
   */
  rightElement?: ReactNode;
};

export type ComboboxRecommendedOption = ComboboxOption & {
  /**
   * Optional short label shown next to the lightning mark.
   * Defaults to "Recommended".
   */
  recommendedLabel?: string;
};

type ComboboxPresentation = 'popover' | 'drawer' | 'auto';

type Props = {
  /**
   * Controlled open state (mirrors shadcn Popover/Command composition).
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Controlled selected value. Use empty string for "no selection".
   */
  value: string;
  onValueChange: (next: string) => void;
  options: ComboboxOption[];
  searchPlaceholder?: string;
  emptyText?: string;
  /**
   * When true (default), selecting the currently selected value clears it.
   * Matches shadcn combobox demo behavior.
   */
  allowDeselect?: boolean;
  /**
   * Optional "recommended" option rendered at the top of the list with a lightning mark.
   * Only pass this when you have a good recommendation; otherwise leave it undefined.
   *
   * Notes:
   * - If the recommended option exists in `options`, it is "lifted" to the top (not duplicated).
   * - If the user is searching, it only shows if it matches the query.
   */
  recommendedOption?: ComboboxRecommendedOption;
  /**
   * Trigger rendered inline where the combobox is placed.
   * The dropdown content is portaled and anchored to this trigger.
   */
  trigger: ReactElement;
  /**
   * Where to present the options UI.
   * - 'popover': anchored menu (desktop-like; matches shadcn demo)
   * - 'drawer': bottom drawer (mobile-native; most reliable with keyboards)
   * - 'auto' (default): drawer on native, popover on web
   */
  presentation?: ComboboxPresentation;
  /**
   * Snap points for drawer presentation.
   */
  drawerSnapPoints?: BottomDrawerSnapPoint[];
  /**
   * How the drawer should be presented when `presentation="drawer"`.
   *
   * - 'modal' (default): uses a native Modal via BottomDrawer (most reliable stand-alone)
   * - 'inline': renders within the current React tree (useful when already inside a modal/drawer
   *   to avoid stacking multiple modal layers).
   */
  drawerPresentation?: 'modal' | 'inline';
  /**
   * When using drawer presentation, optionally hide the backdrop scrim.
   * Useful for inline drawers embedded inside other modal-like surfaces.
   */
  drawerHideBackdrop?: boolean;
  /**
   * Optional portal host for the dropdown content. Useful when rendering inside
   * other modal-like surfaces (e.g. BottomDrawer) to ensure proper layering.
   */
  portalHost?: string;
  /**
   * Controlled search query (optional). If omitted, Combobox manages it internally.
   */
  query?: string;
  onQueryChange?: (next: string) => void;
  /**
   * Whether to locally filter options by query. For server-driven search results,
   * set this to false and just pass the already-filtered `options`.
   */
  autoFilter?: boolean;
  /**
   * Whether to show the search input. Defaults to true.
   * Set to false for short option lists where search adds unnecessary friction.
   */
  showSearch?: boolean;
};

/**
 * Mobile-friendly Combobox modeled after shadcn/ui Combobox:
 * - Trigger lives outside (caller decides button/row layout)
 * - Content is a "command palette" style sheet with search + list
 *
 * Reference: `https://ui.shadcn.com/docs/components/combobox`
 */
export function Combobox({
  open,
  onOpenChange,
  value,
  onValueChange,
  options,
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  allowDeselect = true,
  recommendedOption,
  trigger,
  presentation = 'auto',
  drawerSnapPoints,
  drawerPresentation = 'modal',
  drawerHideBackdrop = false,
  portalHost,
  query: controlledQuery,
  onQueryChange,
  autoFilter = true,
  showSearch = true,
}: Props) {
  const resolvedPresentation: ComboboxPresentation =
    presentation === 'auto' ? (Platform.OS === 'web' ? 'popover' : 'drawer') : presentation;

  const insets = useSafeAreaInsets();
  const keyboardAware = useKeyboardAwareScroll();
  const [uncontrolledQuery, setUncontrolledQuery] = useState('');
  const query = controlledQuery ?? uncontrolledQuery;
  const setQuery = useCallback(
    (next: string) => {
      onQueryChange?.(next);
      if (controlledQuery == null) setUncontrolledQuery(next);
    },
    [controlledQuery, onQueryChange],
  );
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const triggerRef = useRef<View | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [placement, setPlacement] = useState<{
    side: 'bottom' | 'top';
    maxHeight: number;
    translateY: number;
  }>({ side: 'bottom', maxHeight: MAX_MENU_HEIGHT, translateY: 0 });

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const recomputePlacement = useCallback(() => {
    const node = triggerRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;

    node.measureInWindow((_x, y, _w, h) => {
      const windowH = Dimensions.get('window').height;
      const gutter = spacing.sm;
      const sideOffset = 4; // keep in sync with DropdownMenuContent sideOffset

      // iOS reports keyboard height including the home-indicator safe area. When the keyboard
      // is shown, subtracting `insets.bottom` *again* makes the safe viewport too small and
      // can translate the menu off-screen (leaving a big "dead space" under the trigger).
      const keyboardSafeBottom =
        keyboardHeight > 0 ? windowH - keyboardHeight - gutter : windowH - insets.bottom - gutter;
      const keyboardSafeTop = insets.top + gutter;

      const triggerBottom = y + h;
      const triggerTop = y;

      const spaceBelow = keyboardSafeBottom - (triggerBottom + sideOffset);
      const spaceAbove = (triggerTop - sideOffset) - keyboardSafeTop;

      // Prefer bottom unless it's clearly constrained (e.g. keyboard covers it).
      const minComfortSpace = 220;
      const preferBottom = spaceBelow >= minComfortSpace || spaceBelow >= spaceAbove;
      const available = preferBottom ? spaceBelow : spaceAbove;

      // Clamp overall menu height so it never tucks behind the keyboard.
      const maxHeight = Math.max(MIN_MENU_HEIGHT, Math.min(available, MAX_MENU_HEIGHT));

      // Even after clamping, the anchor-based positioning can still land the menu
      // partially behind the keyboard on some platforms (portal positioning +
      // keyboard resize quirks). We compute a small translateY to guarantee the
      // *entire* menu sits inside the keyboard-safe viewport.
      let translateY = 0;
      if (preferBottom) {
        const top = triggerBottom + sideOffset;
        const bottom = top + maxHeight;
        const overlapBottom = bottom - keyboardSafeBottom;
        if (overlapBottom > 0) translateY = -overlapBottom;
      } else {
        const bottom = triggerTop - sideOffset;
        const top = bottom - maxHeight;
        const overlapTop = keyboardSafeTop - top;
        if (overlapTop > 0) translateY = overlapTop;
      }

      setPlacement({
        side: preferBottom ? 'bottom' : 'top',
        maxHeight,
        translateY,
      });
    });
  }, [insets.bottom, insets.top, keyboardHeight]);

  useEffect(() => {
    if (!open) return;
    // Next frame so layout + portal positioning are stable.
    const id = requestAnimationFrame(() => recomputePlacement());
    return () => cancelAnimationFrame(id);
  }, [open, recomputePlacement]);

  useEffect(() => {
    if (!open) return;
    // When the keyboard opens due to autofocus, re-measure and flip above if needed.
    const id = requestAnimationFrame(() => recomputePlacement());
    return () => cancelAnimationFrame(id);
  }, [keyboardHeight, open, recomputePlacement]);

  useEffect(() => {
    if (!open) return;
    if (resolvedPresentation !== 'popover') return;
    if (keyboardHeight <= 0) return;
    // The keyboard-aware scroll view may animate after the keyboard shows.
    // Re-measure shortly after to capture the final trigger position.
    const timeoutId = setTimeout(() => {
      recomputePlacement();
    }, 120);
    return () => clearTimeout(timeoutId);
  }, [keyboardHeight, open, recomputePlacement, resolvedPresentation]);

  const filtered = useMemo(() => {
    if (!autoFilter) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const label = opt.label.toLowerCase();
      if (label.includes(q)) return true;
      // For short queries (1–2 chars), only match against the label so "Search arcs"
      // feels predictable (avoids accidental matches in long narrative keywords).
      if (q.length < 3) return false;
      const keywords = opt.keywords ?? [];
      return keywords.some((k) => String(k).toLowerCase().includes(q));
    });
  }, [autoFilter, options, query]);

  const recommendedResolved = useMemo(() => {
    if (!recommendedOption) return null;
    const base = options.find((opt) => opt.value === recommendedOption.value) ?? recommendedOption;
    if (!base?.label || base.label.trim().length === 0) return null;

    const q = query.trim().toLowerCase();
    if (!q) return base;
    const label = base.label.toLowerCase();
    if (label.includes(q)) return base;
    if (q.length < 3) return null;
    const keywords = base.keywords ?? [];
    return keywords.some((k) => String(k).toLowerCase().includes(q)) ? base : null;
  }, [options, query, recommendedOption]);

  const displayOptions = useMemo(() => {
    if (!recommendedResolved) return filtered;
    const rest = filtered.filter((opt) => opt.value !== recommendedResolved.value);
    return [recommendedResolved, ...rest];
  }, [filtered, recommendedResolved]);

  // Keep the list scrollable while respecting the overall maxHeight.
  // (Search row + divider consume some vertical space.)
  const listMaxHeight = Math.max(120, placement.maxHeight - 56);
  const shouldAutoFocusSearch = resolvedPresentation === 'drawer';
  const minPopoverWidth = 240;
  const maxPopoverWidth = 320;

  const handleSelect = useCallback(
    (optValue: string) => {
      const opt = displayOptions.find((o) => o.value === optValue);
      if (opt?.disabled) return;
      const selected = optValue === value;
      const next = allowDeselect && selected ? '' : optValue;
      onValueChange(next);
      onOpenChange(false);
    },
    [allowDeselect, displayOptions, onOpenChange, onValueChange, value],
  );

  const prepareKeyboardReveal = useCallback(() => {
    if (!keyboardAware) return;
    const handle = triggerRef.current ? findNodeHandle(triggerRef.current) : null;
    if (typeof handle !== 'number') return;

    // If the keyboard is already open, scroll immediately. Otherwise, register a
    // one-shot target that will be used on the upcoming keyboardDidShow.
    if (keyboardAware.keyboardHeight > 0) {
      keyboardAware.scrollToNodeHandle(handle, keyboardAware.keyboardClearance + REVEAL_EXTRA_OFFSET);
    } else {
      keyboardAware.setNextRevealTarget(handle, REVEAL_EXTRA_OFFSET);
    }
  }, [keyboardAware]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && keyboardHeight > 0) {
        // Keyboard is visible - dismiss it and wait for it to hide before opening
        // This prevents the popover from briefly rendering above, then jumping below
        Keyboard.dismiss();
        const subscription = Keyboard.addListener('keyboardDidHide', () => {
          subscription.remove();
          prepareKeyboardReveal();
          onOpenChange(true);
        });
        return;
      }
      if (nextOpen) {
        prepareKeyboardReveal();
      }
      onOpenChange(nextOpen);
    },
    [keyboardHeight, onOpenChange, prepareKeyboardReveal],
  );

  const triggerWithDrawerOpen = useMemo(() => {
    if (resolvedPresentation !== 'drawer') return trigger;
    // Best-effort: if the trigger element supports onPress (Pressable/Touchable), inject it.
    // This lets callers render "dumb" triggers (no manual onPress plumbing).
    try {
      const prev = (trigger as any)?.props?.onPress;
      return React.cloneElement(trigger as any, {
        onPress: (...args: any[]) => {
          prev?.(...args);
          handleOpenChange(true);
        },
      });
    } catch {
      // Fallback: wrap it.
      return (
        <Pressable onPress={() => handleOpenChange(true)} style={styles.triggerWrapper}>
          <View pointerEvents="none">{trigger}</View>
        </Pressable>
      ) as unknown as ReactElement;
    }
  }, [handleOpenChange, resolvedPresentation, trigger]);

  if (resolvedPresentation === 'drawer') {
    return (
      <>
        <View
          style={styles.triggerWrapper}
          ref={triggerRef}
          collapsable={false}
          onLayout={(event) => {
            setTriggerWidth(event.nativeEvent.layout.width);
          }}
        >
          {triggerWithDrawerOpen}
        </View>

        <UnderKeyboardDrawer
          visible={open}
          onClose={() => handleOpenChange(false)}
          presentation={drawerPresentation}
          hideBackdrop={drawerHideBackdrop}
          // When showing search, use dynamic keyboard-aware sizing.
          // When search is hidden, use fixed snap points for a simple picker experience.
          dynamicHeightUnderKeyboard={showSearch}
          visibleContentHeightFallbackPx={240}
          // Long lists should scroll rather than expanding to a huge sheet.
          maxVisibleContentHeightPx={MAX_MENU_HEIGHT}
          // Dynamic resizing: allow the sheet to shrink to fit small option lists.
          minVisibleContentHeightPx={120}
          dismissOnBackdropPress
          enableContentPanningGesture
          dynamicSizing={showSearch}
          snapPoints={showSearch ? undefined : drawerSnapPoints ?? DEFAULT_DRAWER_SNAP_POINTS}
        >
          <View style={styles.drawerCommand}>
            {showSearch ? (
              <>
                <View style={styles.searchRow}>
                  <Input
                    value={query}
                    onChangeText={setQuery}
                    placeholder={searchPlaceholder}
                    leadingIcon="search"
                    variant="inline"
                    size="sm"
                    elevation="flat"
                    autoFocus={shouldAutoFocusSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.divider} />
              </>
            ) : null}
            <BottomDrawerScrollView
              style={styles.drawerList}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {displayOptions.length === 0 ? (
                <Text style={styles.empty}>{emptyText}</Text>
              ) : (
                <View style={styles.items}>
                  {displayOptions.map((opt) => {
                    const selected = opt.value === value;
                    const isRecommended =
                      Boolean(recommendedResolved) && opt.value === recommendedResolved?.value;
                    const recommendedLabel =
                      isRecommended && recommendedOption?.recommendedLabel
                        ? recommendedOption.recommendedLabel
                        : 'Recommended';
                    return (
                      <Pressable
                        key={opt.value}
                        disabled={opt.disabled}
                        onPress={() => handleSelect(opt.value)}
                        style={({ pressed }) => [
                          styles.item,
                          pressed && !opt.disabled ? styles.itemPressed : null,
                          opt.disabled ? styles.itemDisabled : null,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={opt.label}
                      >
                        <HStack
                          alignItems="center"
                          justifyContent="space-between"
                          style={styles.itemRow}
                        >
                          <HStack alignItems="center" space="sm" style={styles.itemLeft}>
                            {opt.leftElement ? (
                              <View style={styles.leftSlot}>{opt.leftElement}</View>
                            ) : null}
                            <Text style={styles.itemLabel}>{opt.label}</Text>
                          </HStack>
                          {opt.rightElement ? (
                            opt.rightElement
                          ) : (
                            <HStack alignItems="center" space="xs">
                              {isRecommended ? (
                                <HStack alignItems="center" space="xs" pointerEvents="none">
                                  <Text style={styles.recommendedText}>{recommendedLabel}</Text>
                                  <View style={styles.recommendedMark}>
                                    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                                      <LinearGradient
                                        colors={[colors.aiGradientStart, colors.aiGradientEnd]}
                                        start={{ x: 0, y: 0.5 }}
                                        end={{ x: 1, y: 0.5 }}
                                        style={StyleSheet.absoluteFillObject}
                                      />
                                    </View>
                                    <Icon name="sparkles" size={12} color={colors.aiForeground} />
                                  </View>
                                </HStack>
                              ) : null}
                              <View style={styles.checkSlot}>
                                {selected ? (
                                  <Icon name="check" size={16} color={colors.textPrimary} />
                                ) : null}
                              </View>
                            </HStack>
                          )}
                        </HStack>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </BottomDrawerScrollView>
          </View>
        </UnderKeyboardDrawer>
      </>
    );
  }

  return (
    <DropdownMenu
      {...({
        // NOTE: the underlying primitive supports controlled `open`, but its types may lag.
        // We cast here so screens can drive open state (and so selection can close reliably).
        open,
        onOpenChange: handleOpenChange,
      } as any)}
    >
      <View
        style={styles.triggerWrapper}
        ref={triggerRef}
        collapsable={false}
        onLayout={(event) => {
          setTriggerWidth(event.nativeEvent.layout.width);
        }}
      >
        <DropdownMenuTrigger {...({ asChild: true } as any)}>{trigger}</DropdownMenuTrigger>
      </View>

      {open ? (
        <DropdownMenuContent
          portalHost={portalHost}
          align="start"
          side={placement.side}
          sideOffset={4}
          style={StyleSheet.flatten([
            styles.popover,
            triggerWidth != null
              ? {
                  width: Math.min(Math.max(triggerWidth, minPopoverWidth), maxPopoverWidth),
                  minWidth: Math.max(triggerWidth, minPopoverWidth),
                  maxWidth: maxPopoverWidth,
                }
              : { minWidth: minPopoverWidth, maxWidth: maxPopoverWidth },
            placement.maxHeight ? { maxHeight: placement.maxHeight } : null,
            placement.translateY ? { transform: [{ translateY: placement.translateY }] } : null,
          ])}
        >
          <View style={styles.command}>
            {showSearch ? (
              <>
                <View style={styles.searchRow}>
                  <Input
                    value={query}
                    onChangeText={setQuery}
                    placeholder={searchPlaceholder}
                    leadingIcon="search"
                    // ShadCN "CommandInput" feel: input sits flush; the row provides padding.
                    variant="inline"
                    size="sm"
                    elevation="flat"
                    autoFocus={shouldAutoFocusSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.divider} />
              </>
            ) : null}
            <ScrollView
              style={[styles.list, { maxHeight: listMaxHeight }]}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {displayOptions.length === 0 ? (
                <Text style={styles.empty}>{emptyText}</Text>
              ) : (
                <View style={styles.items}>
                  {displayOptions.map((opt) => {
                    const selected = opt.value === value;
                    const isRecommended =
                      Boolean(recommendedResolved) && opt.value === recommendedResolved?.value;
                    const recommendedLabel =
                      isRecommended && recommendedOption?.recommendedLabel
                        ? recommendedOption.recommendedLabel
                        : 'Recommended';
                    return (
                      <Pressable
                        key={opt.value}
                        disabled={opt.disabled}
                        onPress={() => handleSelect(opt.value)}
                        style={({ pressed }) => [
                          styles.item,
                          pressed && !opt.disabled ? styles.itemPressed : null,
                          opt.disabled ? styles.itemDisabled : null,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={opt.label}
                      >
                        <HStack
                          alignItems="center"
                          justifyContent="space-between"
                          style={styles.itemRow}
                        >
                          <HStack alignItems="center" space="sm" style={styles.itemLeft}>
                            {opt.leftElement ? (
                              <View style={styles.leftSlot}>{opt.leftElement}</View>
                            ) : null}
                            <Text style={styles.itemLabel}>{opt.label}</Text>
                          </HStack>
                          {opt.rightElement ? (
                            opt.rightElement
                          ) : (
                            <HStack alignItems="center" space="xs">
                              {isRecommended ? (
                                <HStack alignItems="center" space="xs" pointerEvents="none">
                                  <Text style={styles.recommendedText}>{recommendedLabel}</Text>
                                  <View style={styles.recommendedMark}>
                                    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                                      <LinearGradient
                                        colors={[colors.aiGradientStart, colors.aiGradientEnd]}
                                        start={{ x: 0, y: 0.5 }}
                                        end={{ x: 1, y: 0.5 }}
                                        style={StyleSheet.absoluteFillObject}
                                      />
                                    </View>
                                    <Icon name="sparkles" size={12} color={colors.aiForeground} />
                                  </View>
                                </HStack>
                              ) : null}
                              <View style={styles.checkSlot}>
                                {selected ? (
                                  <Icon name="check" size={16} color={colors.textPrimary} />
                                ) : null}
                              </View>
                            </HStack>
                          )}
                        </HStack>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}

const styles = StyleSheet.create({
  triggerWrapper: {
    width: '100%',
  },
  popover: {
    padding: 0,
    maxHeight: MAX_MENU_HEIGHT,
    // Note: avoid overflow:'hidden' here as it can clip the menu shadow on some platforms
  },
  drawerCommand: {
    // BottomDrawer already provides its own rounded shell + padding.
    // Keep this content flexible so dynamicSizing can shrink-to-fit.
    flex: 1,
    minHeight: MIN_MENU_HEIGHT,
  },
  drawerList: {
    flex: 1,
  },
  command: {
    padding: 0,
  },
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  list: {
    maxHeight: 460,
  },
  listContent: {
    paddingHorizontal: spacing.xs,
    // Give the first/last option breathing room so the top spacing matches the
    // bottom gap (especially noticeable with the keyboard open).
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  items: {
    gap: 2,
  },
  empty: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  item: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  itemPressed: {
    backgroundColor: colors.shellAlt,
  },
  itemDisabled: {
    opacity: 0.7,
  },
  itemRow: {},
  itemLeft: {
    flex: 1,
    minWidth: 0,
  },
  itemLabel: {
    ...typography.bodySm,
    fontSize: 15,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  leftSlot: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSlot: {
    width: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  recommendedText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  recommendedMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.aiBorder,
  },
});


