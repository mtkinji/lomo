import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { HStack, Text } from '../primitives';
import { Icon, type IconName } from '../Icon';

type WidgetTileChromeProps = {
  label: string;
  timeLabel?: string;
  iconName?: IconName;
};

export function WidgetTileChrome({ label, timeLabel, iconName }: WidgetTileChromeProps) {
  return (
    <HStack alignItems="center" justifyContent="space-between">
      <HStack alignItems="center" space="xs">
        {iconName ? <Icon name={iconName} size={14} color={colors.textSecondary} /> : null}
        <Text style={styles.label}>{label}</Text>
      </HStack>
      {timeLabel ? <Text style={styles.time}>{timeLabel}</Text> : null}
    </HStack>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    paddingLeft: spacing.sm,
  },
});


