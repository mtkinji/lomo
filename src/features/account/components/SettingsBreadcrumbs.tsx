import { StyleSheet } from 'react-native';
import { HStack, Pressable, Text } from '@gluestack-ui/themed';
import { Icon } from '../../../ui/Icon';
import { colors, spacing, typography } from '../../../theme';

type BreadcrumbItem = {
  label: string;
  onPress?: () => void;
};

type SettingsBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function SettingsBreadcrumbs({ items }: SettingsBreadcrumbsProps) {
  return (
    <HStack alignItems="center" justifyContent="center" space="xs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const textStyle = [
          styles.crumbLabel,
          item.onPress && !isLast ? styles.crumbAction : undefined,
          isLast ? styles.currentLabel : undefined,
        ];

        return (
          <HStack key={`${item.label}-${index}`} alignItems="center" space="xs">
            {index > 0 && (
              <Icon name="chevronRight" size={14} color={colors.textSecondary} />
            )}
            {item.onPress && !isLast ? (
              <Pressable hitSlop={8} onPress={item.onPress}>
                <Text style={textStyle}>{item.label}</Text>
              </Pressable>
            ) : (
              <Text style={textStyle}>{item.label}</Text>
            )}
          </HStack>
        );
      })}
    </HStack>
  );
}

const styles = StyleSheet.create({
  crumbLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  crumbAction: {
    color: colors.accent,
  },
  currentLabel: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
});


