import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Heading, Text } from '../../../ui/Typography';
import type { ActivityActionCardProjection } from './activityActionCardTypes';

export function ActivityActionCard({
  projection,
  loading,
  invoking,
  onInvoke,
  onRetry,
}: {
  projection: ActivityActionCardProjection | null;
  loading: boolean;
  invoking: boolean;
  onInvoke: (actionId: string) => void;
  onRetry: () => void;
}) {
  if (!loading && !projection) return null;
  if (loading && !projection) {
    return (
      <Card elevation="none" padding="sm" style={styles.card}>
        <Text tone="muted" accessibilityLiveRegion="polite">Loading connected action…</Text>
      </Card>
    );
  }
  if (!projection) return null;
  const actions = [projection.primaryAction, projection.secondaryAction].filter((action) => action !== null);
  return (
    <Card elevation="none" padding="sm" style={styles.card}>
      <Text variant="label" tone="secondary">{projection.eyebrow}</Text>
      <Heading variant="sm" style={styles.title}>{projection.title}</Heading>
      {projection.detail ? <Text tone="secondary" style={styles.detail}>{projection.detail}</Text> : null}
      {projection.freshnessLabel ? <Text tone="muted" style={styles.freshness}>{projection.freshnessLabel}</Text> : null}
      {projection.state === 'failed' ? (
        <Button
          variant="outline"
          size="sm"
          accessibilityLabel="Try connected action again"
          onPress={onRetry}
          disabled={invoking}
          style={styles.singleAction}
        >
          Try again
        </Button>
      ) : actions.length ? (
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <Button
              key={action.id}
              variant={index === 0 ? 'primary' : 'outline'}
              size="sm"
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              accessibilityState={{ disabled: invoking }}
              disabled={invoking}
              onPress={() => {
                if (!invoking) onInvoke(action.id);
              }}
              style={styles.action}
            >
              {action.label}
            </Button>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { marginTop: spacing.xs },
  detail: { marginTop: spacing.xs },
  freshness: { marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1 },
  singleAction: { marginTop: spacing.md, alignSelf: 'flex-start' },
});
