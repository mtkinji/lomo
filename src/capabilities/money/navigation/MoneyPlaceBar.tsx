import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../../theme';
import type { MoneyPlaceRouteName } from './types';

const MONEY_PLACES: readonly { name: MoneyPlaceRouteName; label: string }[] = [
  { name: 'MoneySummary', label: 'Summary' },
  { name: 'MoneyTransactions', label: 'Transactions' },
  { name: 'MoneyAccounts', label: 'Accounts' },
];

export function MoneyPlaceBar({
  activePlace,
  onSelect,
}: {
  activePlace: MoneyPlaceRouteName;
  onSelect: (place: MoneyPlaceRouteName) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {MONEY_PLACES.map((place) => {
        const selected = place.name === activePlace;
        return (
          <Pressable
            key={place.name}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(place.name)}
            style={({ pressed }) => [
              styles.place,
              selected ? styles.placeSelected : null,
              pressed ? styles.placePressed : null,
            ]}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>{place.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.shellAlt,
  },
  place: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
  },
  placeSelected: {
    backgroundColor: colors.card,
  },
  placePressed: {
    opacity: 0.72,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  labelSelected: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
});
