import { StyleSheet, View } from 'react-native';
import { Card, Text, VStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { colors, fonts, spacing, typography } from '../../theme';
import { externalReceiptTime, type ExternalActionReceipt } from './externalActionReceipts';

export function ExternalActionReceiptRegion({
  receipts,
}: {
  receipts: ExternalActionReceipt[];
}) {
  if (!receipts.length) return null;

  return (
    <VStack space="xs" style={styles.region} testID="home.externalActionReceipts">
      <Text style={styles.sectionTitle}>Recently done</Text>
      <Card elevation="none" marginVertical={0} padding="none" style={styles.card}>
        {receipts.map((receipt, index) => (
          <View
            accessible
            accessibilityLabel={`${receipt.summary} ${receipt.sourceName}, ${externalReceiptTime(receipt.createdAt)}.`}
            key={receipt.id}
            style={[styles.row, index > 0 ? styles.dividedRow : null]}
          >
            <Icon name="checkCircle" size={20} color={colors.textSecondary} />
            <View style={styles.copy}>
              <Text style={styles.summary}>{receipt.summary}</Text>
              <Text style={styles.metadata}>
                {`${receipt.sourceName} · ${externalReceiptTime(receipt.createdAt)}`}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </VStack>
  );
}

const styles = StyleSheet.create({
  region: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  card: {
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dividedRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  summary: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  metadata: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
