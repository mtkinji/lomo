import { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Share, StyleSheet, View } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { spacing } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Heading, Text } from "../../../ui/Typography";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import {
  createGroceryRepository,
  type GroceryProjection,
} from "../data/groceryRepository";
import { exportGroceryMarkdown } from "../groceryExport";
type Props = NativeStackScreenProps<FoodStackParamList, "GroceryHandoff">;
export function GroceryHandoffScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void createGroceryRepository()
      .list()
      .then((lists) =>
        setList(lists.find((item) => item.id === route.params.listId) ?? null),
      );
  }, [route.params.listId]);
  const plain = list ? exportGroceryMarkdown(list) : "";
  const instacart = async () => {
    if (!list) return;
    setBusy(true);
    try {
      const repository = createGroceryRepository();
      const result = await repository.handoff(
        list.id,
        list.revision,
        "instacart",
      );
      capture(AnalyticsEvent.RetailerHandoffPrepared, {
        provider: "instacart",
        count: result.preparedItemCount,
      });
      if (!result.url) throw new Error("Instacart is not configured.");
      await import("expo-web-browser").then((browser) =>
        browser.openBrowserAsync(result.url),
      );
      await repository.markHandoffOpened(result.handoffId);
      capture(AnalyticsEvent.RetailerHandoffOpened, { provider: "instacart" });
      Alert.alert(
        "Review every match",
        `${result.preparedItemCount} list items were sent. Instacart still owns product matching, substitutions, prices, and checkout.`,
      );
    } catch (error) {
      Alert.alert(
        "Instacart handoff unavailable",
        "Your plain grocery list is still ready to copy or share.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <PageHeader
        title="Shop groceries"
        onPressBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Heading variant="md">Take the reviewed list where you shop.</Heading>
        <Text tone="secondary">
          Instacart opens a product-review page. You still choose products and
          check out there; Kwilt does not say the order is placed.
        </Text>
        <Button
          disabled={!list || list.status !== "ready" || busy}
          onPress={() => {
            void instacart();
          }}
        >
          {busy ? "Preparing…" : "Review products on Instacart"}
        </Button>
        <Button
          variant="outline"
          disabled={!plain}
          onPress={() => {
            void Clipboard.setStringAsync(plain);
          }}
        >
          Copy plain list
        </Button>
        <Button
          variant="outline"
          disabled={!plain}
          onPress={() => {
            void Share.share({ title: "Grocery list", message: plain });
          }}
        >
          Share or print list
        </Button>
        {list?.status !== "ready" ? (
          <Text tone="secondary">
            Review the list before creating a retailer handoff.
          </Text>
        ) : null}
      </View>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
});
