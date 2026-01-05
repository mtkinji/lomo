import { StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { HStack, Text, VStack } from '../primitives';
import { Logo } from '../Logo';

type WidgetTileChromeProps = {
  label: string;
  timeLabel?: string;
};

export function WidgetTileChrome({ label, timeLabel }: WidgetTileChromeProps) {
  return (
    <HStack alignItems="center" justifyContent="space-between">
      <HStack alignItems="center" space="sm">
        <View style={styles.logoWrap}>
          <Logo size={24} />
        </View>
        <VStack space={0}>
          <Text style={styles.brand}>Kwilt</Text>
          <Text style={styles.label}>{label}</Text>
        </VStack>
      </HStack>
      {timeLabel ? <Text style={styles.time}>{timeLabel}</Text> : null}
    </HStack>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  brand: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.bodyBold.fontFamily,
    lineHeight: 18,
  },
  label: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  time: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    paddingLeft: spacing.sm,
  },
});


