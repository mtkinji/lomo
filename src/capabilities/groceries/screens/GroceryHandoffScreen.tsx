import { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, ScrollView, Share, StyleSheet } from "react-native";
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
import { useAppStore } from "../../../store/useAppStore";
import { groceryCache } from "../data/groceryCache";
import { groceryOfflineQueue } from "../data/groceryOfflineQueue";
type Props = NativeStackScreenProps<FoodStackParamList, "GroceryHandoff">;
export function GroceryHandoffScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    void (async () => {
      const cached = userId ? await groceryCache.read(userId) : [];
      const cachedList = cached.find((item) => item.id === route.params.listId) ?? null;
      if (cachedList) setList(cachedList);
      if (userId) {
        const pending = await groceryOfflineQueue.read(userId);
        setPendingCount(pending.filter((item) => item.listId === route.params.listId).length);
      }
      try {
        const lists = await createGroceryRepository().list();
        setList(lists.find((item) => item.id === route.params.listId) ?? null);
        setOffline(false);
        if (userId) await groceryCache.write(userId, lists);
      } catch {
        setOffline(Boolean(cachedList));
      }
    })();
  }, [route.params.listId, userId]);
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
        titleMaxFontSizeMultiplier={1.6}
        onPressBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading variant="md" maxFontSizeMultiplier={1.6}>
          Take the reviewed list where you shop.
        </Heading>
        <Text tone="secondary">
          Instacart opens a product-review page. You still choose products and
          check out there; Kwilt does not say the order is placed.
        </Text>
        <Button
          disabled={!list || list.status !== "ready" || busy || offline || pendingCount > 0}
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
        {offline || pendingCount ? (
          <Text tone="secondary" accessibilityLiveRegion="polite">
            Your saved list is still available to copy or share. Sync list changes before opening a retailer.
          </Text>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
});
