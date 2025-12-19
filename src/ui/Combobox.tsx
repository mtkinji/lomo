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

const MAX_MENU_HEIGHT = 320; // ShadCN-ish: keeps long lists scrollable without feeling huge.
const MIN_MENU_HEIGHT = 180;
// When the keyboard is about to open due to the combobox search autofocus,
// scroll the *trigger field* up enough to keep the label + field + menu visible.
const REVEAL_EXTRA_OFFSET = MAX_MENU_HEIGHT + spacing.md;
const DEFAULT_DRAWER_SNAP_POINTS: BottomDrawerSnapPoint[] = ['60%'];

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string[];
  rightElement?: ReactNode;
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
  trigger,
  presentation = 'auto',
  drawerSnapPoints,
}: Props) {
  const resolvedPresentation: ComboboxPresentation =
    presentation === 'auto' ? (Platform.OS === 'web' ? 'popover' : 'drawer') : presentation;

  const insets = useSafeAreaInsets();
  const keyboardAware = useKeyboardAwareScroll();
  const [query, setQuery] = useState('');
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

      const keyboardSafeBottom = windowH - keyboardHeight - insets.bottom - gutter;
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

  const filtered = useMemo(() => {
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
  }, [options, query]);

  // Keep the list scrollable while respecting the overall maxHeight.
  // (Search row + divider consume some vertical space.)
  const listMaxHeight = Math.max(120, placement.maxHeight - 56);

  const handleSelect = useCallback(
    (optValue: string) => {
      const selected = optValue === value;
      const next = allowDeselect && selected ? '' : optValue;
      onValueChange(next);
      onOpenChange(false);
    },
    [allowDeselect, onOpenChange, onValueChange, value],
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
      if (nextOpen) prepareKeyboardReveal();
      onOpenChange(nextOpen);
    },
    [onOpenChange, prepareKeyboardReveal],
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
          // Match the LongText editor behavior: keep the visible content above the keyboard
          // while extending the sheet background under the keyboard to avoid iOS corner gaps.
          dynamicHeightUnderKeyboard
          visibleContentHeightFallbackPx={400}
          // Long lists (25+ arcs) should scroll rather than expanding to a huge sheet.
          maxVisibleContentHeightPx={480}
          // Don't let the drawer collapse below the intended visible height.
          minVisibleContentHeightPx={400}
          dismissOnBackdropPress
          enableContentPanningGesture
        >
          <View style={styles.drawerCommand}>
            <View style={styles.searchRow}>
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                leadingIcon="search"
                variant="inline"
                size="sm"
                elevation="flat"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.divider} />
            <BottomDrawerScrollView
              style={styles.drawerList}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filtered.length === 0 ? (
                <Text style={styles.empty}>{emptyText}</Text>
              ) : (
                <View style={styles.items}>
                  {filtered.map((opt) => {
                    const selected = opt.value === value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => handleSelect(opt.value)}
                        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={opt.label}
                      >
                        <HStack
                          alignItems="center"
                          justifyContent="space-between"
                          style={styles.itemRow}
                        >
                          <Text style={styles.itemLabel}>{opt.label}</Text>
                          {opt.rightElement ? (
                            opt.rightElement
                          ) : (
                            <View style={styles.checkSlot}>
                              {selected ? (
                                <Icon name="check" size={16} color={colors.textPrimary} />
                              ) : null}
                            </View>
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
          align="start"
          side={placement.side}
          sideOffset={4}
          style={StyleSheet.flatten([
            styles.popover,
            triggerWidth != null ? { width: triggerWidth, minWidth: triggerWidth } : null,
            placement.maxHeight ? { maxHeight: placement.maxHeight } : null,
            placement.translateY ? { transform: [{ translateY: placement.translateY }] } : null,
          ])}
        >
          <View style={styles.command}>
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
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.divider} />
            <ScrollView
              style={[styles.list, { maxHeight: listMaxHeight }]}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filtered.length === 0 ? (
                <Text style={styles.empty}>{emptyText}</Text>
              ) : (
                <View style={styles.items}>
                  {filtered.map((opt) => {
                    const selected = opt.value === value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => handleSelect(opt.value)}
                        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={opt.label}
                      >
                        <HStack
                          alignItems="center"
                          justifyContent="space-between"
                          style={styles.itemRow}
                        >
                          <Text style={styles.itemLabel}>{opt.label}</Text>
                          {opt.rightElement ? (
                            opt.rightElement
                          ) : (
                            <View style={styles.checkSlot}>
                              {selected ? (
                                <Icon name="check" size={16} color={colors.textPrimary} />
                              ) : null}
                            </View>
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
    overflow: 'hidden',
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
    maxHeight: 300,
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
  itemRow: {},
  itemLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  checkSlot: {
    width: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});


