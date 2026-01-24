import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import * as React from 'react';
import {
  useWindowDimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextProps,
} from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { colors, spacing, typography, motion } from '../theme';
import { cardElevation } from '../theme/surfaces';
import { Icon } from './Icon';
import { NativeOnlyAnimatedView } from './NativeOnlyAnimatedView';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

type PressableChildren = React.ReactNode | ((state: PressableStateCallbackType) => React.ReactNode);

function resolvePressableChildren(children: PressableChildren): React.ReactNode {
  if (typeof children === 'function') {
    // We don't have access to the internal pressed state here; provide a stable default.
    return (children as (state: PressableStateCallbackType) => React.ReactNode)({
      pressed: false,
    } as PressableStateCallbackType);
  }
  return children;
}

function DropdownMenuSubTrigger({
  style,
  children,
  iconStyle,
  inset,
  ...props
}: DropdownMenuPrimitive.SubTriggerProps & {
  iconStyle?: StyleProp<TextStyle>;
  inset?: boolean;
}) {
  const { open } = DropdownMenuPrimitive.useSubContext();
  const iconName = Platform.OS === 'web' ? 'chevronRight' : open ? 'chevronUp' : 'chevronDown';
  
  return (
    <DropdownMenuPrimitive.SubTrigger
      style={[
        styles.subTrigger,
        inset && styles.inset,
        open && styles.subTriggerActive,
        style,
      ] as any}
      {...props}
    >
      <>{resolvePressableChildren(children as PressableChildren)}</>
      <Icon 
        name={iconName} 
        size={16} 
        color={colors.textPrimary} 
        style={[styles.subTriggerIcon, iconStyle]} 
      />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  style,
  ...props
}: DropdownMenuPrimitive.SubContentProps) {
  return (
    <NativeOnlyAnimatedView entering={motion.menu.entering} exiting={motion.menu.exiting}>
      <DropdownMenuPrimitive.SubContent
        style={[styles.content, style] as any}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

function DropdownMenuContent({
  style,
  overlayStyle,
  portalHost,
  side = 'bottom',
  align = 'end',
  sideOffset = 6,
  ...props
}: DropdownMenuPrimitive.ContentProps & {
  overlayStyle?: StyleProp<ViewStyle>;
  portalHost?: string;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const MENU_SIDE_GUTTER_PX = spacing.lg;
  const ABSOLUTE_MAX_MENU_WIDTH_PX = 360;
  const resolvedMaxWidthPx = Math.min(
    ABSOLUTE_MAX_MENU_WIDTH_PX,
    // Keep the menu off the screen edges (and never below our minWidth).
    Math.max(styles.content.minWidth ?? 0, windowWidth - MENU_SIDE_GUTTER_PX * 2),
  );

  const resolvedOverlayStyle = StyleSheet.flatten([StyleSheet.absoluteFillObject, overlayStyle]) as any;
  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <DropdownMenuPrimitive.Overlay
          style={resolvedOverlayStyle}
        >
          <NativeOnlyAnimatedView
            entering={motion.menu.entering}
            exiting={motion.menu.exiting}
          >
            <DropdownMenuPrimitive.Content
              // Default cap so menus can expand for longer labels, but never become awkwardly wide.
              // Note: `style` prop can override maxWidth (Combobox/ObjectPicker already do).
              style={[styles.content, { maxWidth: resolvedMaxWidthPx }, style] as any}
              side={side}
              align={align}
              sideOffset={sideOffset}
              {...props}
            />
          </NativeOnlyAnimatedView>
        </DropdownMenuPrimitive.Overlay>
      </FullWindowOverlay>
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  style,
  inset,
  variant = 'default',
  ...props
}: DropdownMenuPrimitive.ItemProps & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <DropdownMenuPrimitive.Item
      style={[
        styles.item,
        inset && styles.inset,
        props.disabled && styles.disabled,
        style,
      ] as any}
      {...props}
    >
      <View style={styles.itemContent}>
        {/* We rely on the children (Text, Icon rows) to inherit colors or set them explicitly. 
            Unlike NativeWind context, we can't easily inject text colors down, so we trust 
            the caller to use <Text> or we could wrap children if strict coloring is needed. 
            For now, simpler is better. */}
        {resolvePressableChildren(props.children as PressableChildren)}
      </View>
    </DropdownMenuPrimitive.Item>
  );
}

function DropdownMenuCheckboxItem({
  style,
  children,
  checked,
  ...props
}: DropdownMenuPrimitive.CheckboxItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      style={[styles.item, styles.checkboxItem, style] as any}
      checked={checked}
      {...props}
    >
      <View style={styles.itemIndicator}>
        <DropdownMenuPrimitive.ItemIndicator>
          <Icon name="check" size={16} color={colors.textPrimary} />
        </DropdownMenuPrimitive.ItemIndicator>
      </View>
      {resolvePressableChildren(children as PressableChildren)}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioItem({
  style,
  children,
  ...props
}: DropdownMenuPrimitive.RadioItemProps) {
  return (
    <DropdownMenuPrimitive.RadioItem
      style={[styles.item, styles.checkboxItem, style] as any}
      {...props}
    >
      <View style={styles.itemIndicator}>
        <DropdownMenuPrimitive.ItemIndicator>
          <View style={styles.radioIndicator} />
        </DropdownMenuPrimitive.ItemIndicator>
      </View>
      {resolvePressableChildren(children as PressableChildren)}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  style,
  inset,
  ...props
}: DropdownMenuPrimitive.LabelProps & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      style={[styles.label, inset && styles.inset, style] as any}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  style,
  ...props
}: DropdownMenuPrimitive.SeparatorProps) {
  return (
    <DropdownMenuPrimitive.Separator
      style={[styles.separator, style] as any}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ style, ...props }: TextProps) {
  return (
    <Text
      style={[styles.shortcut, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minWidth: 260,
    ...cardElevation.overlay,
  },
  item: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  checkboxItem: {
    paddingLeft: spacing.xl + spacing.sm, // Make room for indicator
  },
  itemIndicator: {
    position: 'absolute',
    left: spacing.sm,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textPrimary,
  },
  label: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
    marginHorizontal: -spacing.xs,
  },
  subTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  subTriggerActive: {
    backgroundColor: colors.shellAlt,
  },
  subTriggerIcon: {
    marginLeft: 'auto',
  },
  inset: {
    paddingLeft: spacing.xl,
  },
  disabled: {
    opacity: 0.5,
  },
  shortcut: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.muted,
    marginLeft: 'auto',
    letterSpacing: 1,
  },
});

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
