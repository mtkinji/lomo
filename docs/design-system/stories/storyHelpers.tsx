import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../src/theme';
import { Heading, Text } from '../../../src/ui/Typography';

export function StoryFrame({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <View style={styles.frame}>
      <View style={styles.header}>
        <Heading variant="md">{title}</Heading>
        {description ? <Text tone="secondary">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function StoryGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function StoryStack({ children }: { children: ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

export function Specimen({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <View style={styles.specimen}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 1040,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stack: {
    gap: spacing.md,
  },
  specimen: {
    minWidth: 180,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    backgroundColor: colors.canvas,
    padding: spacing.md,
  },
});
