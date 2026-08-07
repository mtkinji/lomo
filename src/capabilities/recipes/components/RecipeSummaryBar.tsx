import { StyleSheet, View } from "react-native";

import { colors, spacing } from "../../../theme";
import { Text } from "../../../ui/Typography";

function duration(minutes: number | null): string {
  return minutes === null
    ? "—"
    : minutes < 60
      ? `${minutes} min`
      : `${Math.floor(minutes / 60)}h ${minutes % 60 || ""}`.trim();
}

export function RecipeSummaryBar({
  prepMinutes,
  cookMinutes,
  inactiveMinutes = 0,
  yieldQuantity,
  yieldUnit,
}: {
  prepMinutes: number | null;
  cookMinutes: number | null;
  inactiveMinutes?: number;
  yieldQuantity: number | null;
  yieldUnit: string | null;
}) {
  const totalMinutes =
    prepMinutes === null && cookMinutes === null
      ? null
      : (prepMinutes ?? 0) + (cookMinutes ?? 0) + inactiveMinutes;
  const items = [
    { label: "Total", value: duration(totalMinutes) },
    { label: "Prep", value: duration(prepMinutes) },
    { label: "Cook", value: duration(cookMinutes) },
    ...(inactiveMinutes > 0
      ? [{ label: "Wait", value: duration(inactiveMinutes) }]
      : []),
    {
      label: "Makes",
      value:
        yieldQuantity === null
          ? "—"
          : `${yieldQuantity} ${yieldUnit ?? "servings"}`,
    },
  ];
  return (
    <View style={styles.bar}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <Text variant="label" tone="secondary">
            {item.label}
          </Text>
          <Text>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
  },
  item: { flex: 1, alignItems: "center", gap: 2 },
});
