import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';

export type KrogerReviewItem = { id: string; title: string };

export function KrogerCartReviewSections({ retailerLabel, fulfillmentMode, ready, review, unmatched, savingsSummary, renderReady, renderReadyList, onUse, onChoose, onLeave }: {
  retailerLabel: string;
  fulfillmentMode: 'pickup' | 'delivery';
  ready: KrogerReviewItem[];
  review: KrogerReviewItem[];
  unmatched: KrogerReviewItem[];
  savingsSummary?: string | null;
  renderReady?: (item: KrogerReviewItem) => ReactNode;
  renderReadyList?: ReactNode;
  onUse?: (id: string) => void;
  onChoose?: (id: string) => void;
  onLeave?: (id: string) => void;
}) {
  const [readyExpanded, setReadyExpanded] = useState(false);
  const total = ready.length + review.length + unmatched.length;
  const readyLabel = `${ready.length} ready item${ready.length === 1 ? '' : 's'}`;
  return <View style={styles.root}>
    <Heading variant="md">{ready.length} of {total} ready for {retailerLabel} {fulfillmentMode}</Heading>
    {savingsSummary ? <View style={styles.savings}><Text variant="label">{savingsSummary}</Text><Text tone="secondary" style={styles.detail}>Merchandise estimate only. The retailer confirms fees, taxes, slots, and final total.</Text></View> : null}
    {ready.length ? <View style={styles.section}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${readyExpanded ? 'Hide' : 'Show'} ${readyLabel}`} onPress={() => setReadyExpanded((value) => !value)} style={styles.sectionHeader}><Text variant="label">{ready.length} ready</Text><Text tone="secondary">{readyExpanded ? 'Hide' : 'Review'}</Text></Pressable>
      {readyExpanded ? (renderReadyList ?? ready.map((item) => <View key={item.id} style={styles.row}>{renderReady ? renderReady(item) : <Text>{item.title}</Text>}</View>)) : null}
    </View> : null}
    {review.length ? <View style={styles.section}><Text variant="label">{review.length} need you</Text>{review.map((item) => <View key={item.id} style={styles.exception}><Text>{item.title}</Text><View style={styles.actions}><Button size="xs" variant="primary" accessibilityLabel={`Use ${item.title}`} onPress={() => onUse?.(item.id)}>Use</Button><Button size="xs" variant="outline" accessibilityLabel={`Choose another for ${item.title}`} onPress={() => onChoose?.(item.id)}>Choose another</Button><Button size="xs" variant="ghost" accessibilityLabel={`Leave ${item.title} on list`} onPress={() => onLeave?.(item.id)}>Leave on list</Button></View></View>)}</View> : null}
    {unmatched.length ? <View style={styles.section}><Text variant="label">{unmatched.length} not found</Text>{unmatched.map((item) => <View key={item.id} style={styles.row}><Text>{item.title}</Text><Text tone="secondary" style={styles.detail}>Stays on your Kwilt list.</Text></View>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  section: { gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder, paddingTop: spacing.sm },
  sectionHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { paddingVertical: spacing.sm },
  exception: { gap: spacing.xs, paddingVertical: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  savings: { backgroundColor: colors.muted, borderRadius: 12, padding: spacing.sm, gap: 2 },
  detail: { ...typography.bodyXs },
});
