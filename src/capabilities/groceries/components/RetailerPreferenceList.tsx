import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Text } from '../../../ui/Typography';
import type { RetailerPreference } from '../domain/onlineShoppingPreferences';

type Props = {
  retailers: RetailerPreference[];
  onMove(retailerId: RetailerPreference['id'], direction: 'earlier' | 'later'): void;
};

export function RetailerPreferenceList({ retailers, onMove }: Props) {
  const ranked = [...retailers]
    .filter((retailer) => retailer.enabled)
    .sort((left, right) => left.rank - right.rank);

  return (
    <View accessibilityRole="list" style={styles.list}>
      {ranked.map((retailer, index) => (
        <View key={retailer.id} style={styles.row}>
          <View style={styles.identity}>
            <Text tone="secondary" variant="label">{index + 1}</Text>
            <Text variant="body">{retailer.label}</Text>
          </View>
          <View style={styles.actions}>
            <Button
              accessibilityLabel={`Move ${retailer.label} earlier`}
              disabled={index === 0}
              size="sm"
              variant="ghost"
              onPress={() => onMove(retailer.id, 'earlier')}
            >
              Earlier
            </Button>
            <Button
              accessibilityLabel={`Move ${retailer.label} later`}
              disabled={index === ranked.length - 1}
              size="sm"
              variant="ghost"
              onPress={() => onMove(retailer.id, 'later')}
            >
              Later
            </Button>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
