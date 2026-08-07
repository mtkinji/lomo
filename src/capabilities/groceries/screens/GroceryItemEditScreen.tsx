import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, spacing, typography } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Text } from "../../../ui/Typography";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import {
  createGroceryRepository,
  type GroceryProjection,
} from "../data/groceryRepository";
type Props = NativeStackScreenProps<FoodStackParamList, "GroceryItemEdit">;
export function GroceryItemEditScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [concept, setConcept] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    void createGroceryRepository()
      .list()
      .then((lists) => {
        const found =
          lists.find((item) => item.id === route.params.listId) ?? null;
        const grocery = found?.items.find(
          (item) => item.id === route.params.itemId,
        );
        setList(found);
        setConcept(grocery?.concept ?? "");
        setQuantity(grocery?.quantityMin?.toString() ?? "");
        setNote(grocery?.note ?? "");
      });
  }, [route.params.itemId, route.params.listId]);
  const save = async () => {
    if (!list) return;
    try {
      await createGroceryRepository().updateItem(
        route.params.itemId,
        list.revision,
        {
          concept,
          quantityMin: quantity ? Number(quantity) : null,
          note: note || null,
        },
        "user_review",
      );
      capture(AnalyticsEvent.GroceryListCorrected, { method: "user_review" });
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Item did not save",
        error instanceof Error ? error.message : "Try again.",
      );
    }
  };
  return (
    <AppShell>
      <PageHeader
        title="Edit grocery"
        onPressBack={() => navigation.goBack()}
        rightElement={
          <Button
            size="sm"
            onPress={() => {
              void save();
            }}
          >
            Save
          </Button>
        }
      />
      <View style={styles.content}>
        <Field label="Item" value={concept} onChangeText={setConcept} />
        <Field
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
        />
        <Field label="Note" value={note} onChangeText={setNote} />
        <Text tone="secondary">
          Corrections stay attached to this list. Kwilt does not silently turn
          one edit into a global rule.
        </Text>
      </View>
    </AppShell>
  );
}
function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput accessibilityLabel={label} style={styles.input} {...props} />
    </View>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.fieldFill,
    ...typography.body,
  },
});
