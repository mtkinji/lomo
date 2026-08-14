import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { useAppStore } from '../../../store/useAppStore';
import { colors, radii, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { CanvasScrollView } from '../../../ui/layout/CanvasScrollView';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { formatKitchenQuantity } from '../../recipes/domain/recipeScaling';
import { createGroceryRepository, type GroceryProjection } from '../data/groceryRepository';
import { retailerLinkSessionRepository } from '../data/retailerLinkSessionRepository';
import {
  getRetailerLinkProgress,
  reconcileRetailerLinkSession,
  recordRetailerLinkDecision,
  type RetailerLinkDecision,
  type RetailerLinkSession,
} from '../domain/retailerLinkSession';
import {
  getAffiliateRetailerLinkDisclosure,
  openAffiliateProductSearch,
} from '../providers/affiliateRetailerProvider';

type Props = NativeStackScreenProps<FoodStackParamList, 'RetailerLinkShopping'>;
type GroceryItem = GroceryProjection['items'][number];

const retailerLabel = (retailerId: 'amazon' | 'walmart') =>
  retailerId === 'amazon' ? 'Amazon' : 'Walmart';

function quantityLabel(item: GroceryItem): string | null {
  if (item.quantityMin === null) return null;
  const quantity = `${formatKitchenQuantity(item.quantityMin)}${
    item.quantityMax === null ? '' : `–${formatKitchenQuantity(item.quantityMax)}`
  }`;
  return item.unit && item.unit !== 'count' ? `${quantity} ${item.unit}` : quantity;
}

export function RetailerLinkShoppingScreen({ navigation, route }: Props) {
  const personId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const retailerId = route.params.retailerId;
  const name = retailerLabel(retailerId);
  const linkDisclosure = getAffiliateRetailerLinkDisclosure(retailerId);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [session, setSession] = useState<RetailerLinkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [awaitingDecisionItemId, setAwaitingDecisionItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setAwaitingDecisionItemId(null);
    setError(null);
    try {
      const lists = await createGroceryRepository().list();
      const list = lists.find((candidate) => candidate.id === route.params.listId) ?? null;
      if (!list) {
        setError('This grocery list is no longer available.');
        return;
      }
      const remaining = list.items.filter((item) => item.state === 'needed' && !item.retailerCart);
      const saved = await retailerLinkSessionRepository.read(personId, list.id, retailerId);
      const reconciled = reconcileRetailerLinkSession({
        session: saved,
        listId: list.id,
        listRevision: list.revision,
        retailerId,
        itemIds: remaining.map((item) => item.id),
      });
      setItems(remaining);
      setSession(reconciled);
      await retailerLinkSessionRepository.replace(personId, reconciled);
    } catch (loadError) {
      console.warn('[RetailerLinkShopping] load failed', loadError);
      setError('This shopping pass could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [personId, retailerId, route.params.listId]);

  useEffect(() => {
    void load();
  }, [load]);

  const progress = useMemo(
    () => session ? getRetailerLinkProgress(items.map((item) => item.id), session) : null,
    [items, session],
  );
  const currentItem = progress?.currentItemId
    ? items.find((item) => item.id === progress.currentItemId) ?? null
    : null;

  const openSearch = async () => {
    if (!currentItem || opening) return;
    setOpening(true);
    setError(null);
    try {
      const opened = await openAffiliateProductSearch(retailerId, currentItem.concept);
      if (opened) setAwaitingDecisionItemId(currentItem.id);
      else setError(`${name} didn't open. Try again.`);
    } catch {
      setError(`${name} didn't open. Try again.`);
    } finally {
      setOpening(false);
    }
  };

  const decide = async (decision: RetailerLinkDecision) => {
    if (!session || !currentItem || awaitingDecisionItemId !== currentItem.id) return;
    const next = recordRetailerLinkDecision(session, currentItem.id, decision);
    setSession(next);
    setAwaitingDecisionItemId(null);
    setError(null);
    try {
      await retailerLinkSessionRepository.replace(personId, next);
    } catch {
      setError('That choice was not saved. Try it again.');
    }
  };

  return (
    <AppShell>
      <PageHeader title={`Shop at ${name}`} onPressBack={() => navigation.goBack()} />
      <CanvasScrollView contentContainerStyle={styles.content}>
        {loading ? <Text tone="secondary">Preparing your shopping pass…</Text> : null}
        {!loading && error && !session ? <Text tone="destructive">{error}</Text> : null}

        {!loading && session && progress && progress.totalCount === 0 ? (
          <View style={styles.section}>
            <Heading variant="lg">Nothing left to shop</Heading>
            <Text tone="secondary">Your current Grocery list has no remaining online items.</Text>
            <Button fullWidth onPress={() => navigation.goBack()}>Done</Button>
          </View>
        ) : null}

        {!loading && session && progress && progress.totalCount > 0 && progress.complete ? (
          <View style={styles.section}>
            <Heading variant="lg">This pass is ready</Heading>
            <Text variant="body">
              {`${progress.reportedAddedCount} reported added · ${progress.keptForLaterCount} kept for later`}
            </Text>
            <Text tone="secondary">
              Kwilt recorded what you told us. {name} still owns availability, price, your cart, and checkout.
            </Text>
            <Button fullWidth onPress={() => navigation.goBack()}>Back to order options</Button>
          </View>
        ) : null}

        {!loading && session && progress && currentItem && !progress.complete ? (
          <View style={styles.section}>
            <View style={styles.headingGroup}>
              <Text variant="label" tone="secondary">
                {`${progress.workedThroughCount} of ${progress.totalCount} worked through`}
              </Text>
              <Text tone="secondary">Choose the product in {name}; Kwilt will keep your place.</Text>
            </View>

            <View style={styles.itemSurface}>
              <Heading variant="lg">{currentItem.concept}</Heading>
              {quantityLabel(currentItem) ? <Text tone="secondary">{quantityLabel(currentItem)}</Text> : null}
            </View>

            {awaitingDecisionItemId === currentItem.id ? (
              <View style={styles.actions}>
                <Heading variant="sm">What happened in {name}?</Heading>
                <Button
                  accessibilityLabel={`I added ${currentItem.concept}`}
                  fullWidth
                  onPress={() => { void decide('reported_added'); }}
                >
                  I added it
                </Button>
                <Button fullWidth variant="outline" onPress={() => { void decide('kept_for_later'); }}>
                  Keep for later
                </Button>
                <Button variant="ghost" onPress={() => { void openSearch(); }}>Search again</Button>
              </View>
            ) : (
              <View style={styles.actions}>
                <Button
                  accessibilityLabel={`Find ${currentItem.concept} at ${name}`}
                  fullWidth
                  loading={opening}
                  loadingLabel={`Opening ${name}…`}
                  onPress={() => { void openSearch(); }}
                >
                  {`Find at ${name}`}
                </Button>
                <Text style={styles.disclosure} tone="secondary">{linkDisclosure}</Text>
              </View>
            )}

            {error ? <Text tone="destructive">{error}</Text> : null}
            <Text tone="secondary">
              Kwilt cannot see which product you choose or whether it reaches your retailer cart.
            </Text>
          </View>
        ) : null}
      </CanvasScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: { gap: spacing.lg },
  headingGroup: { gap: spacing.xs },
  itemSurface: {
    minHeight: 156,
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    backgroundColor: colors.card,
  },
  actions: { alignItems: 'center', gap: spacing.sm },
  disclosure: { fontSize: 12 },
});
