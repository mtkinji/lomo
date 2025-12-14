import type { ReactElement, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './DropdownMenu';
import { Input } from './Input';
import { HStack, VStack } from './Stack';
import { Text } from './Typography';
import { Icon } from './Icon';

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string[];
  rightElement?: ReactNode;
};

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
  title?: string;
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
  title = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  allowDeselect = true,
  trigger,
}: Props) {
  const [query, setQuery] = useState('');
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = [opt.label, ...(opt.keywords ?? [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  return (
    <DropdownMenu
      onOpenChange={(nextOpen) => {
        // `@rn-primitives/dropdown-menu` doesn't expose a controlled `open` prop
        // in its current types, so we treat `open` as externally-controlled UI
        // state and mirror primitive events through `onOpenChange`.
        onOpenChange(nextOpen);
        if (!nextOpen) setQuery('');
      }}
    >
      <View
        style={styles.triggerWrapper}
        onLayout={(event) => {
          setTriggerWidth(event.nativeEvent.layout.width);
        }}
      >
        <DropdownMenuTrigger>
          <View pointerEvents="none">{trigger}</View>
        </DropdownMenuTrigger>
      </View>

      {open ? (
        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={8}
          style={StyleSheet.flatten([
            styles.popover,
            triggerWidth != null ? { width: triggerWidth, minWidth: triggerWidth } : null,
          ])}
        >
          <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              leadingIcon="search"
              variant="outline"
              elevation="flat"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filtered.length === 0 ? (
                <Text style={styles.empty}>{emptyText}</Text>
              ) : (
                <VStack space="xs">
                  {filtered.map((opt) => {
                    const selected = opt.value === value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          const next = allowDeselect && selected ? '' : opt.value;
                          onValueChange(next);
                          onOpenChange(false);
                        }}
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
                </VStack>
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
    maxHeight: 420,
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  list: {
    maxHeight: 300,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  empty: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  item: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemPressed: {
    backgroundColor: colors.shellAlt,
  },
  itemRow: {},
  itemLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  checkSlot: {
    width: 22,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});


