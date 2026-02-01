import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Card, type CardElevation, type CardPadding } from './Card';
import { HStack, VStack } from './Stack';
import { Heading, Text } from './Typography';
import { spacing } from '../theme';

type QuestionCardProps = {
  /** e.g. "1 of 10" */
  stepLabel?: string;
  /** Main question string. For richer content, compose children instead. */
  title?: ReactNode;
  /** Optional trailing inline element next to the title, e.g. ⓘ info trigger. */
  titleAccessory?: ReactNode;
  /** Body content: options, inputs, etc. */
  children: ReactNode;
  /** Allow callers to tweak outer margins if needed. */
  style?: StyleProp<ViewStyle>;
  /** Card padding preset. Defaults to "sm" (matches legacy QuestionCard). */
  padding?: CardPadding;
  /** Card elevation preset. Defaults to "raised" (hero-style question cards). */
  elevation?: CardElevation;
};

export function QuestionCard({
  stepLabel,
  title,
  titleAccessory,
  children,
  style,
  padding = 'sm',
  elevation = 'raised',
}: QuestionCardProps) {
  const hasHeader = Boolean(title || titleAccessory);
  return (
    <Card padding={padding} elevation={elevation} style={style}>
      <VStack space="sm">
        {stepLabel ? (
          <Text variant="bodySm" tone="default">
            {stepLabel.toUpperCase()}
          </Text>
        ) : null}

        {hasHeader ? (
          <HStack alignItems="center" style={styles.headerRow}>
            {title ? (
              <Heading variant="sm" style={styles.title}>
                {title}
              </Heading>
            ) : null}
            {titleAccessory ? (
              <View style={styles.titleAccessory}>{titleAccessory}</View>
            ) : null}
          </HStack>
        ) : null}

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



