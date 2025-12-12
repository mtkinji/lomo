import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Card } from './Card';
import { Heading, Text, VStack, HStack } from './primitives';
import { spacing } from '../theme';

type QuestionCardProps = {
  /** e.g. "1 of 10" */
  stepLabel?: string;
  /** Main question string. For richer content, compose children instead. */
  title: ReactNode;
  /** Optional trailing inline element next to the title, e.g. ⓘ info trigger. */
  titleAccessory?: ReactNode;
  /** Body content: options, inputs, etc. */
  children: ReactNode;
  /** Allow callers to tweak outer margins if needed. */
  style?: StyleProp<ViewStyle>;
};

export function QuestionCard({
  stepLabel,
  title,
  titleAccessory,
  children,
  style,
}: QuestionCardProps) {
  return (
    <Card padding="sm" elevation="raised" style={style}>
      <VStack space="sm">
        {stepLabel ? (
          <Text variant="bodySm" tone="secondary">
            {stepLabel}
          </Text>
        ) : null}

        <HStack alignItems="center" style={styles.headerRow}>
          <Heading variant="sm" style={styles.title}>
            {title}
          </Heading>
          {titleAccessory ? (
            <View style={styles.titleAccessory}>{titleAccessory}</View>
          ) : null}
        </HStack>

        {children}
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingBottom: spacing.md,
  },
  title: {
  },
  titleAccessory: {
    paddingLeft: spacing.xs,
  },
});



