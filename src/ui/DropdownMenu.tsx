import { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';

type DropdownMenuItem = {
  label: string;
  /**
   * Visual variant. `destructive` is styled in warning/red tones.
   */
  variant?: 'default' | 'destructive';
  onPress: () => void;
};

type DropdownMenuProps = {
  /**
   * Whether the menu is visible. This is controlled from the host so the same
   * state can drive trigger affordances.
   */
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  /**
   * Optional label rendered at the top of the menu (e.g., "Arc actions").
   */
  label?: string;
  items: DropdownMenuItem[];
  /**
   * Optional vertical offset (in dp) added below the safe-area top before
   * placing the menu. Use this when the trigger sits below the shell header
   * so the menu visually drops down from the trigger instead of overlapping
   * it.
   */
  topOffset?: number;
};

/**
 * ShadCN-style dropdown menu for Takado.
 *
 * This is a lightweight, copy-paste friendly primitive inspired by
 * reactnativereusables.com's Dropdown Menu. It renders a small menu card
 * anchored to the top-right shell area with a translucent backdrop.
 */
export function DropdownMenu({
  open,
  onOpenChange,
  label,
  items,
  topOffset,
}: DropdownMenuProps) {
  const insets = useSafeAreaInsets();
  if (!open) return null;

  const handleClose = () => onOpenChange(false);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View
          style={[
            styles.container,
            {
              // Anchor just below the shell/header by including the device safe
              // area top plus a configurable gutter so the menu visually
              // "drops down" from the trigger button, shadcn-style.
              paddingTop: insets.top + (topOffset ?? spacing.lg),
            }
          ]}
        >
          <View style={styles.menu}>
            {label ? <Text style={styles.menuLabel}>{label}</Text> : null}
            {label ? <View style={styles.menuSeparator} /> : null}
            {items.map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.8}
                style={styles.menuItem}
                onPress={() => {
                  handleClose();
                  item.onPress();
                }}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    item.variant === 'destructive' && styles.menuItemTextDestructive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: spacing['2xl'],
    paddingRight: spacing.lg,
  },
  menu: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    minWidth: 160,
    // Soft shadow similar to shadcn popover / dropdown
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  menuItem: {
    paddingVertical: spacing.sm,
  },
  menuItemText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  menuItemTextDestructive: {
    color: colors.warning,
  },
  menuLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
    marginBottom: spacing.xs,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
});


