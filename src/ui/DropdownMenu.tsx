import type { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import {
  DropdownMenu as ReusableDropdownMenu,
  DropdownMenuCheckboxItem as ReusableDropdownMenuCheckboxItem,
  DropdownMenuContent as ReusableDropdownMenuContent,
  DropdownMenuGroup as ReusableDropdownMenuGroup,
  DropdownMenuItem as ReusableDropdownMenuItem,
  DropdownMenuLabel as ReusableDropdownMenuLabel,
  DropdownMenuPortal as ReusableDropdownMenuPortal,
  DropdownMenuRadioGroup as ReusableDropdownMenuRadioGroup,
  DropdownMenuRadioItem as ReusableDropdownMenuRadioItem,
  DropdownMenuSeparator as ReusableDropdownMenuSeparator,
  DropdownMenuShortcut as ReusableDropdownMenuShortcut,
  DropdownMenuSub as ReusableDropdownMenuSub,
  DropdownMenuSubContent as ReusableDropdownMenuSubContent,
  DropdownMenuSubTrigger as ReusableDropdownMenuSubTrigger,
  DropdownMenuTrigger as ReusableDropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { colors, spacing, typography } from '../theme';

export const DropdownMenu = ReusableDropdownMenu;
export const DropdownMenuCheckboxItem = ReusableDropdownMenuCheckboxItem;
export const DropdownMenuGroup = ReusableDropdownMenuGroup;
export const DropdownMenuPortal = ReusableDropdownMenuPortal;
export const DropdownMenuRadioGroup = ReusableDropdownMenuRadioGroup;
export const DropdownMenuRadioItem = ReusableDropdownMenuRadioItem;
export const DropdownMenuSeparator = ReusableDropdownMenuSeparator;
export const DropdownMenuSub = ReusableDropdownMenuSub;
export const DropdownMenuSubContent = ReusableDropdownMenuSubContent;
export const DropdownMenuSubTrigger = ReusableDropdownMenuSubTrigger;
export const DropdownMenuTrigger = ReusableDropdownMenuTrigger;
export const DropdownMenuShortcut = ReusableDropdownMenuShortcut;

type DropdownMenuContentProps = React.ComponentProps<typeof ReusableDropdownMenuContent> & {
  style?: StyleProp<ViewStyle>;
};

/**
 * App-level wrapper that guarantees the dropdown surface looks like a real
 * popover even if NativeWind / Tailwind styling is unavailable. This keeps
 * the "more" menu usable on native while still letting the Reusables
 * component handle positioning, animation, and theming.
 */
export function DropdownMenuContent({ style, ...props }: DropdownMenuContentProps) {
  return (
    <ReusableDropdownMenuContent
      {...props}
      // Cast through `unknown` to satisfy the slightly narrower typing on the
      // underlying component while still allowing standard RN style arrays.
      style={[styles.content, style] as unknown as ViewStyle}
    />
  );
}

type DropdownMenuItemProps = React.ComponentProps<typeof ReusableDropdownMenuItem> & {
  style?: StyleProp<ViewStyle>;
};

export function DropdownMenuItem({ style, ...props }: DropdownMenuItemProps) {
  return (
    <ReusableDropdownMenuItem
      {...props}
      style={[styles.item, style] as unknown as ViewStyle}
    />
  );
}

type DropdownMenuLabelProps = React.ComponentProps<typeof ReusableDropdownMenuLabel> & {
  style?: StyleProp<TextStyle>;
};

export function DropdownMenuLabel({ style, ...props }: DropdownMenuLabelProps) {
  return (
    <ReusableDropdownMenuLabel
      {...props}
      style={[styles.label, style] as unknown as TextStyle}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    // Provide a clear popover surface on native where Tailwind / CSS tokens
    // can be too subtle against the app shell. Width is left to be driven by
    // the intrinsic content (matching the web example) instead of being
    // fixed, so the menu can grow slightly for longer labels.
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    // Match the web example's `w-56` (≈224px) as a comfortable minimum width,
    // while still allowing the menu to grow with longer labels.
    minWidth: 224,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  item: {
    // Match the Reusables `px-2 py-2` spacing so row hit areas feel right.
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  label: {
    // Light touch on the label: respect our type scale but don't fight the
    // library's own colors/radius.
    ...typography.bodySm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});

