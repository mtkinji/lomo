import React from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { HStack } from './Stack';
import { Text } from './Typography';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type GoalPillProps = {
  title: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Standard goal pill used across the app for compact goal attribution.
 * Must remain single-line to avoid overwhelming dense list/card layouts.
 */
export function GoalPill({ title, style, textStyle }: GoalPillProps) {
  return (
    <View style={[styles.container, style]}>
      <HStack alignItems="center" space="xs" style={styles.row}>
        <Icon name="goals" size={11} color={colors.textSecondary} />
        <Text style={[styles.text, textStyle]} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      </HStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  row: {
    // Ensure the text is allowed to shrink within a row layout.
    minWidth: 0,
    maxWidth: '100%',
  },
  text: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    flexShrink: 1,
  },
});


