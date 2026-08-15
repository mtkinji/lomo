import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { useAppStore } from '../../../store/useAppStore';
import { colors, radii, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { FullScreenInterstitial } from '../../../ui/FullScreenInterstitial';
import { useAccessibilityPreferences } from '../../../ui/hooks/useAccessibilityPreferences';
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
  summarizeRetailerBatchPreparation,
  type RetailerBatchPreparation,
} from '../domain/retailerBatchPreparation';
import {
  amazonCartPreparationProvider,
  openAmazonPreparedCart,
} from '../providers/amazonCartPreparationProvider';
import {
  openAffiliateProductSearch,
} from '../providers/affiliateRetailerProvider';

type Props = NativeStackScreenProps<FoodStackParamList, 'RetailerLinkShopping'>;
type GroceryItem = GroceryProjection['items'][number];

function quantityLabel(item: GroceryItem): string | null {
  if (item.quantityMin === null) return null;
  const quantity = `${formatKitchenQuantity(item.quantityMin)}${
    item.quantityMax === null ? '' : `–${formatKitchenQuantity(item.quantityMax)}`
  }`;
  return item.unit && item.unit !== 'count' ? `${quantity} ${item.unit}` : quantity;
}

function AmazonBatchShopping({ navigation, route }: Props) {
  const [preparation, setPreparation] = useState<RetailerBatchPreparation | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingCart, setOpeningCart] = useState(false);
  const [cartOpened, setCartOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { reduceMotionEnabled } = useAccessibilityPreferences();

  const load = useCallback(async () => {
    setLoading(true);
    setPreparation(null);
    setCartOpened(false);
    setError(null);
    try {
      const lists = await createGroceryRepository().list();
      const list = lists.find((candidate) => candidate.id === route.params.listId) ?? null;
      if (!list) {
        setError('This grocery list is no longer available.');
        return;
      }
      const remaining = list.items.filter((item) => item.state === 'needed' && !item.retailerCart);
      if (!remaining.length) {
        setError('There is nothing left to send to Amazon.');
        return;
      }
      const prepared = await amazonCartPreparationProvider.prepare({
        listId: list.id,
        listRevision: list.revision,
        items: remaining.map((item) => ({
          id: item.id,
          concept: item.concept,
          quantityMin: item.quantityMin,
          quantityMax: item.quantityMax,
          unit: item.unit,
        })),
      });
      setPreparation(prepared);
      if (!summarizeRetailerBatchPreparation(prepared).canOpenBatchCart && prepared.source === 'provider') {
        setError('Amazon could not build this cart. Your Grocery list is unchanged.');
      }
    } catch (loadError) {
      console.warn('[AmazonBatchShopping] preparation failed', loadError);
      setError('Amazon could not prepare this list yet. Your Grocery list is unchanged.');
    } finally {
      setLoading(false);
    }
  }, [route.params.listId]);

  useEffect(() => { void load(); }, [load]);

  const summary = preparation ? summarizeRetailerBatchPreparation(preparation) : null;

  const openCart = useCallback(async () => {
    if (!preparation || openingCart) return;
    setOpeningCart(true);
    setError(null);
    try {
      const opened = await openAmazonPreparedCart(preparation);
      if (opened) setCartOpened(true);
      else setError('Amazon could not receive this cart. Your Grocery list is unchanged.');
    } catch {
      setError("Amazon didn't open. Your Grocery list is unchanged.");
    } finally {
      setOpeningCart(false);
    }
  }, [openingCart, preparation]);

  const stayedCount = summary ? summary.reviewCount + summary.unavailableCount : 0;
  const isPreview = preparation?.source === 'preview';
  const isReady = Boolean(preparation && summary?.canOpenBatchCart && !cartOpened && !error);

  return (
    <AppShell>
      <FullScreenInterstitial
        visible
        transition={reduceMotionEnabled ? 'none' : 'fade'}
        contentStyle={styles.amazonMoment}
      >
        {loading ? (
          <View style={styles.amazonMomentBody}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
            <Heading variant="lg">Preparing your Amazon shop</Heading>
            <Text tone="secondary">Matching products and quantities…</Text>
          </View>
        ) : null}

        {!loading && isReady && summary ? (
          <View style={styles.amazonMomentBody}>
            <Heading variant="lg">{summary.readyCount} ready for Amazon</Heading>
            <Text tone="secondary">{stayedCount} will stay in Kwilt</Text>
            <Button
              fullWidth
              loading={openingCart}
              loadingLabel="Opening Amazon…"
              onPress={() => { void openCart(); }}
            >
              Open Amazon
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onPress={() => navigation.navigate('OnlineOrder', { listId: route.params.listId })}
            >
              Use another retailer
            </Button>
          </View>
        ) : null}

        {!loading && isPreview ? (
          <View style={styles.amazonMomentBody}>
            <Text variant="label" tone="secondary">Preview</Text>
            <Heading variant="lg">Amazon cart handoff isn’t connected</Heading>
            <Text tone="secondary">
              Kwilt can preview this flow, but it cannot place these items in Amazon yet.
            </Text>
            <Button
              fullWidth
              onPress={() => navigation.navigate('OnlineOrder', { listId: route.params.listId })}
            >
              Use another retailer
            </Button>
            <Button fullWidth variant="ghost" onPress={() => navigation.goBack()}>
              Back to Groceries
            </Button>
          </View>
        ) : null}

        {!loading && cartOpened && summary ? (
          <View style={styles.amazonMomentBody}>
            <Heading variant="lg">Amazon opened</Heading>
            <Text tone="secondary">{summary.readyCount} prepared · {stayedCount} still in Kwilt</Text>
            <Button fullWidth onPress={() => { void openCart(); }}>Open Amazon again</Button>
            <Button fullWidth variant="ghost" onPress={() => navigation.goBack()}>Back to Groceries</Button>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.amazonMomentBody}>
            <Heading variant="lg">Amazon isn’t ready</Heading>
            <Text tone="secondary">{error}</Text>
            <Button fullWidth variant="outline" onPress={() => { void load(); }}>Try again</Button>
            <Button fullWidth variant="ghost" onPress={() => navigation.goBack()}>Back</Button>
          </View>
        ) : null}
      </FullScreenInterstitial>
    </AppShell>
  );
}

function WalmartLinkShopping({ navigation, route }: Props) {
  const personId = useAppStore((state) => state.authIdentity?.userId ?? null);
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
      if (!list) { setError('This grocery list is no longer available.'); return; }
      const remaining = list.items.filter((item) => item.state === 'needed' && !item.retailerCart);
      const saved = await retailerLinkSessionRepository.read(personId, list.id, 'walmart');
      const reconciled = reconcileRetailerLinkSession({ session: saved, listId: list.id, listRevision: list.revision, retailerId: 'walmart', itemIds: remaining.map((item) => item.id) });
      setItems(remaining);
      setSession(reconciled);
      await retailerLinkSessionRepository.replace(personId, reconciled);
    } catch {
      setError('This shopping pass could not be loaded.');
    } finally { setLoading(false); }
  }, [personId, route.params.listId]);

  useEffect(() => { void load(); }, [load]);
  const progress = useMemo(() => session ? getRetailerLinkProgress(items.map((item) => item.id), session) : null, [items, session]);
  const currentItem = progress?.currentItemId ? items.find((item) => item.id === progress.currentItemId) ?? null : null;

  const openSearch = async () => {
    if (!currentItem || opening) return;
    setOpening(true);
    setError(null);
    try {
      const opened = await openAffiliateProductSearch('walmart', currentItem.concept);
      if (opened) setAwaitingDecisionItemId(currentItem.id);
      else setError("Walmart didn't open. Try again.");
    } catch { setError("Walmart didn't open. Try again."); }
    finally { setOpening(false); }
  };

  const decide = async (decision: RetailerLinkDecision) => {
    if (!session || !currentItem || awaitingDecisionItemId !== currentItem.id) return;
    const next = recordRetailerLinkDecision(session, currentItem.id, decision);
    setSession(next);
    setAwaitingDecisionItemId(null);
    try { await retailerLinkSessionRepository.replace(personId, next); }
    catch { setError('That choice was not saved. Try it again.'); }
  };

  return (
    <AppShell>
      <PageHeader title="Shop at Walmart" onPressBack={() => navigation.goBack()} />
      <CanvasScrollView contentContainerStyle={styles.content}>
        {loading ? <Text tone="secondary">Preparing your shopping pass…</Text> : null}
        {!loading && error && !session ? <Text tone="destructive">{error}</Text> : null}
        {!loading && session && progress && progress.complete ? (
          <View style={styles.section}>
            <Heading variant="lg">This pass is ready</Heading>
            <Text>{`${progress.reportedAddedCount} reported added · ${progress.keptForLaterCount} kept for later`}</Text>
            <Button fullWidth onPress={() => navigation.goBack()}>Back to order options</Button>
          </View>
        ) : null}
        {!loading && session && progress && currentItem && !progress.complete ? (
          <View style={styles.section}>
            <Text variant="label" tone="secondary">{`${progress.workedThroughCount} of ${progress.totalCount} worked through`}</Text>
            <View style={styles.itemSurface}>
              <Heading variant="lg">{currentItem.concept}</Heading>
              {quantityLabel(currentItem) ? <Text tone="secondary">{quantityLabel(currentItem)}</Text> : null}
            </View>
            {awaitingDecisionItemId === currentItem.id ? (
              <View style={styles.actions}>
                <Heading variant="sm">What happened in Walmart?</Heading>
                <Button accessibilityLabel={`I added ${currentItem.concept}`} fullWidth onPress={() => { void decide('reported_added'); }}>I added it</Button>
                <Button fullWidth variant="outline" onPress={() => { void decide('kept_for_later'); }}>Keep for later</Button>
              </View>
            ) : (
              <Button accessibilityLabel={`Find ${currentItem.concept} at Walmart`} fullWidth loading={opening} loadingLabel="Opening Walmart…" onPress={() => { void openSearch(); }}>Find at Walmart</Button>
            )}
            {error ? <Text tone="destructive">{error}</Text> : null}
          </View>
        ) : null}
      </CanvasScrollView>
    </AppShell>
  );
}

export function RetailerLinkShoppingScreen(props: Props) {
  return props.route.params.retailerId === 'amazon'
    ? <AmazonBatchShopping {...props} />
    : <WalmartLinkShopping {...props} />;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.lg },
  headingGroup: { gap: spacing.xs },
  amazonMoment: { justifyContent: 'center', paddingHorizontal: spacing.xl },
  amazonMomentBody: { width: '100%', alignItems: 'center', gap: spacing.md },
  itemSurface: { minHeight: 156, justifyContent: 'center', gap: spacing.xs, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cardBorder, borderRadius: radii.card, backgroundColor: colors.card },
  actions: { alignItems: 'center', gap: spacing.sm },
  disclosure: { fontSize: 12 },
});
