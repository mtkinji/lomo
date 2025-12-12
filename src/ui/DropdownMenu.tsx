import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import * as React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextProps,
} from 'react-native';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { colors, spacing, typography, motion } from '../theme';
import { Icon } from './Icon';
import { NativeOnlyAnimatedView } from './NativeOnlyAnimatedView';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

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
      ]}
      {...props}
    >
      <>{children}</>
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
        style={[styles.content, style]}
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
  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <DropdownMenuPrimitive.Overlay
          style={Platform.select({
            web: overlayStyle ?? undefined,
            native: overlayStyle
              ? StyleSheet.flatten([
                  StyleSheet.absoluteFill,
                  overlayStyle as ViewStyle,
                ])
              : StyleSheet.absoluteFill,
          })}
        >
          <NativeOnlyAnimatedView
            entering={motion.menu.entering}
            exiting={motion.menu.exiting}
          >
            <DropdownMenuPrimitive.Content
              style={[styles.content, style]}
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
      ]}
      {...props}
    >
      <View style={styles.itemContent}>
        {/* We rely on the children (Text, Icon rows) to inherit colors or set them explicitly. 
            Unlike NativeWind context, we can't easily inject text colors down, so we trust 
            the caller to use <Text> or we could wrap children if strict coloring is needed. 
            For now, simpler is better. */}
        {props.children}
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
      style={[styles.item, styles.checkboxItem, style]}
      checked={checked}
      {...props}
    >
      <View style={styles.itemIndicator}>
        <DropdownMenuPrimitive.ItemIndicator>
          <Icon name="check" size={16} color={colors.textPrimary} />
        </DropdownMenuPrimitive.ItemIndicator>
      </View>
      {children}
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
      style={[styles.item, styles.checkboxItem, style]}
      {...props}
    >
      <View style={styles.itemIndicator}>
        <DropdownMenuPrimitive.ItemIndicator>
          <View style={styles.radioIndicator} />
        </DropdownMenuPrimitive.ItemIndicator>
      </View>
      {children}
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
      style={[styles.label, inset && styles.inset, style]}
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
      style={[styles.separator, style]}
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
    minWidth: 224,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  item: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
