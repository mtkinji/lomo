import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { HStack, Text, VStack } from './primitives';
import { Logo } from './Logo';

type WidgetPreviewProps = {
  /**
   * Matches the widget's placeholder ("Open Kwilt") and the real next-up title ("<Activity title>").
   */
  title?: string;
  timeLabel?: string;
};

export const WidgetPreview = memo(function WidgetPreview({
  title = 'Open Kwilt',
  timeLabel = '9:15',
}: WidgetPreviewProps) {
  return (
    <VStack space="sm">
      <HStack space="md" alignItems="center" justifyContent="space-between">
        <View accessibilityLabel="Example Home Screen widget" style={styles.systemSmall}>
          <HStack alignItems="center" justifyContent="space-between">
            <HStack alignItems="center" space="sm">
              <Logo size={28} />
              <VStack space={0}>
                <Text style={styles.brand}>Kwilt</Text>
                <Text style={styles.kicker}>Next up</Text>
              </VStack>
            </HStack>
            <Text style={styles.time}>{timeLabel}</Text>
          </HStack>

          <Text style={styles.headline} numberOfLines={3}>
            {title}
          </Text>

          <View style={styles.systemSmallSpacer} />

          <Text style={styles.hint}>Tap to open</Text>
        </View>

        <View accessibilityLabel="Example Lock Screen circular widget" style={styles.accessoryCircular}>
          <Logo size={32} />
        </View>
      </HStack>

      <View accessibilityLabel="Example Lock Screen rectangular widget" style={styles.accessoryRect}>
        <HStack alignItems="center" space="sm">
          <Logo size={28} />
          <VStack flex={1} space={0}>
            <Text style={styles.kicker}>Next up</Text>
            <HStack alignItems="center" justifyContent="space-between">
              <Text style={styles.headline} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.time}>{timeLabel}</Text>
            </HStack>
          </VStack>
        </HStack>
      </View>
    </VStack>
  );
});

const styles = StyleSheet.create({
  systemSmall: {
    width: 132,
    height: 132,
    borderRadius: 28,
    padding: spacing.md,
    justifyContent: 'flex-start',
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  accessoryRect: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accessoryCircular: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headline: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  brand: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.bodyBold.fontFamily,
  },
  kicker: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  time: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  systemSmallSpacer: {
    flex: 1,
  },
});


