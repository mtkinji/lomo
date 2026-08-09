import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, Share, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { spacing } from "../../../theme";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Button } from "../../../ui/Button";
import { Heading, Text } from "../../../ui/Typography";
import { createGroceryRepository, type GroceryProjection } from "../data/groceryRepository";
import { exportGroceryMarkdown } from "../groceryExport";
import { useAppStore } from "../../../store/useAppStore";
import { groceryCache } from "../data/groceryCache";
import { groceryOfflineQueue } from "../data/groceryOfflineQueue";
import { createKrogerConnectionRepository } from "../data/krogerConnectionRepository";

type Props = NativeStackScreenProps<FoodStackParamList, "GroceryHandoff">;
export function GroceryHandoffScreen({ navigation, route }: Props) {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [smithsAvailable, setSmithsAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    void (async () => {
      void createKrogerConnectionRepository().status()
        .then((status) => setSmithsAvailable(status.configured))
        .catch(() => setSmithsAvailable(false));
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
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params.listId, userId]);
  const plain = list ? exportGroceryMarkdown(list) : "";
  const needsReview = Boolean(list && list.status !== "ready");
  const needsSync = Boolean(list && list.status === "ready" && (offline || pendingCount > 0));
  const readyToHandoff = Boolean(list && list.status === "ready" && !offline && pendingCount === 0);
  const readyForSmiths = readyToHandoff && smithsAvailable === true;
  const heading = loading
    ? "Getting your grocery list ready…"
    : !list
      ? "This grocery list isn’t available."
      : needsReview
        ? "Review your grocery list first."
        : needsSync
          ? "Sync your grocery list first."
          : "Your grocery list is ready.";
  const description = loading
    ? "Checking the latest list and shopping options."
    : needsReview
      ? "Check quantities and mark anything you already have before shopping."
      : needsSync
        ? "The plain list is available now. Retailer handoff will return after your changes sync."
        : smithsAvailable === true
          ? "Match products at Smith's, or take the plain list anywhere."
          : smithsAvailable === null
            ? "Checking shopping options. The plain list is ready now."
            : "Take the plain list anywhere.";
  return (
    <AppShell>
      <PageHeader title="Shop groceries" titleMaxFontSizeMultiplier={1.6} onPressBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading variant="md" maxFontSizeMultiplier={1.6}>{heading}</Heading>
        <Text tone="secondary">{description}</Text>
        {needsReview && list ? (
          <Button variant="primary" onPress={() => navigation.navigate("GroceryList", { listId: list.id })}>
            Review grocery list
          </Button>
        ) : null}
        {readyForSmiths ? (
          <>
            <Button variant="primary" onPress={() => navigation.navigate("KrogerCart", { listId: list!.id })}>
              Shop at Smith's
            </Button>
            <Text tone="secondary">
              You approve each product before Kwilt adds it. Smith's owns substitutions, pickup, payment, and checkout.
            </Text>
          </>
        ) : null}
        <Button variant="outline" disabled={!plain} onPress={() => { void Clipboard.setStringAsync(plain); }}>
          Copy plain list
        </Button>
        <Button variant="outline" disabled={!plain} onPress={() => { void Share.share({ title: "Grocery list", message: plain }); }}>
          Share or print list
        </Button>
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({ content: { padding: spacing.md, gap: spacing.md } });
