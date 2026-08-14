import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { useAppStore } from '../../../store/useAppStore';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { CanvasScrollView } from '../../../ui/layout/CanvasScrollView';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { createGroceryRepository, type GroceryProjection } from '../data/groceryRepository';
import { onlineShoppingPreferencesRepository } from '../data/onlineShoppingPreferencesRepository';
import { preferredGroceryStore } from '../data/preferredGroceryStore';
import {
  resolveOnlineRetailerOutcomes,
  type OnlineRetailerOutcome,
} from '../domain/onlineRetailerResolver';
import type { OnlineShoppingPreferences } from '../domain/onlineShoppingPreferences';
import { reconcileActionableRetailerPreferences } from '../domain/onlineShoppingPreferences';
import { getOnlineRetailerRuntimePolicies } from '../providers/affiliateRetailerProvider';

type Props = NativeStackScreenProps<FoodStackParamList, 'OnlineOrder'>;

const retailerName = (retailerId: OnlineRetailerOutcome['retailerId'], preferences: OnlineShoppingPreferences) =>
  preferences.retailers.find((retailer) => retailer.id === retailerId)?.label
  || (retailerId === 'kroger' ? 'Your grocery store' : retailerId[0].toUpperCase() + retailerId.slice(1));

function alternativeCopy(outcome: OnlineRetailerOutcome, preferences: OnlineShoppingPreferences): string {
  const name = retailerName(outcome.retailerId, preferences);
  if (outcome.capability === 'remembered_only') {
    return `${name} is remembered, but Kwilt cannot shop there yet.`;
  }
  if (outcome.reason === 'program_approval_required') {
    return `${name} is saved. Online assistance is waiting for program approval.`;
  }
  if (outcome.reason === 'mode_unproved') {
    return `${name} is not proved for ${outcome.requestedMode} yet.`;
  }
  return `${name} is not available for this list right now.`;
}

export function OnlineOrderScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const personId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [preferences, setPreferences] = useState<OnlineShoppingPreferences | null>(null);
  const [list, setList] = useState<GroceryProjection | null>(null);
  const [outcomes, setOutcomes] = useState<OnlineRetailerOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [listChanged, setListChanged] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const initialRevision = useRef<number | null>(null);

  const load = useCallback(async () => {
    const [saved, lists, store] = await Promise.all([
      onlineShoppingPreferencesRepository.read(personId),
      createGroceryRepository().list(),
      preferredGroceryStore.read(personId),
    ]);
    const currentList = lists.find((candidate) => candidate.id === route.params.listId) ?? null;
    if (!saved || !currentList) {
      setPreferences(saved);
      setList(currentList);
      setOutcomes([]);
      setLoading(false);
      return;
    }
    initialRevision.current = currentList.revision;
    const policies = getOnlineRetailerRuntimePolicies();
    const reconciled = reconcileActionableRetailerPreferences({
      fulfillment: route.params.fulfillmentOverride ?? saved.defaultFulfillment,
      policies,
      preferredStore: store,
      retailers: saved.retailers,
    });
    const actionablePreferences = {
      ...saved,
      retailers: reconciled.filter((retailer) => retailer.enabled),
    };
    setPreferences(actionablePreferences);
    setList(currentList);
    const resolved = resolveOnlineRetailerOutcomes({
      preferences: actionablePreferences,
      policies,
      storeReady: Boolean(store),
      fulfillmentOverride: route.params.fulfillmentOverride,
    });
    setOutcomes(resolved);
    resolved.forEach((outcome) => capture(AnalyticsEvent.OnlineRetailerOutcomesResolved, { fulfillment_mode: outcome.requestedMode, retailer_id: outcome.retailerId, capability: outcome.capability, outcome: outcome.reason }));
    setLoading(false);
  }, [capture, personId, route.params.fulfillmentOverride, route.params.listId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshRevision = async () => {
    const latest = (await createGroceryRepository().list())
      .find((candidate) => candidate.id === route.params.listId);
    if (!latest || initialRevision.current === null || latest.revision !== initialRevision.current) {
      setListChanged(true);
      return;
    }
    setList(latest);
  };

  const primaryOutcome = outcomes.find((outcome) =>
    outcome.reason === 'ready' || outcome.reason === 'store_required') ?? null;
  const first = outcomes[0] ?? null;
  const alternativeOutcomes = outcomes.filter((outcome) =>
    outcome !== primaryOutcome
    && (outcome.reason === 'ready' || outcome.reason === 'store_required'));
  const unavailableOutcomes = outcomes.filter((outcome) =>
    outcome !== primaryOutcome
    && outcome.reason !== 'ready'
    && outcome.reason !== 'store_required');
  const headerCopy = useMemo(() => {
    if (!preferences || !first) return null;
    const mode = first.requestedMode === 'pickup' ? 'Pickup' : 'Delivery';
    return `${mode} · ${retailerName(first.retailerId, preferences)} first`;
  }, [first, preferences]);

  return (
    <AppShell>
      <PageHeader title="Order this list" onPressBack={() => navigation.goBack()} />
      <CanvasScrollView contentContainerStyle={styles.content}>
        {loading ? <Text tone="secondary">Checking what Kwilt can prepare…</Text> : null}
        {!loading && (!preferences || !list || preferences.retailers.length === 0) ? (
          <View style={styles.section}>
            <Heading variant="md">Your list is safe</Heading>
            <Text tone="secondary">Choose an online store Kwilt can use for this list.</Text>
            <Button onPress={() => navigation.navigate('OnlineShoppingSetup', { listId: route.params.listId })}>
              Set preferences
            </Button>
          </View>
        ) : null}
        {!loading && preferences && preferences.retailers.length > 0 && list && headerCopy ? (
          <View style={styles.section}>
            <View style={styles.preferenceHeader}>
              <Text variant="label">{headerCopy}</Text>
              <Button
                accessibilityLabel="Change online shopping preferences"
                size="sm"
                variant="ghost"
                onPress={() => navigation.navigate('OnlineShoppingSetup', { listId: list.id })}
              >
                Change
              </Button>
            </View>

            {listChanged ? (
              <Text tone="destructive">Your grocery list changed. Review it before shopping.</Text>
            ) : null}

            {primaryOutcome?.capability === 'product_links'
            && (primaryOutcome.retailerId === 'amazon' || primaryOutcome.retailerId === 'walmart') ? (
              <View style={styles.hero}>
                <Heading variant="lg">
                  {`Shop this list at ${retailerName(primaryOutcome.retailerId, preferences)}`}
                </Heading>
                <Text tone="secondary">
                  Kwilt will take you through one item at a time and remember where you left off. You choose each product and finish checkout with the retailer.
                </Text>
                <Button
                  accessibilityLabel={`Start shopping at ${retailerName(primaryOutcome.retailerId, preferences)}`}
                  disabled={listChanged}
                  fullWidth
                  onPress={() => navigation.navigate('RetailerLinkShopping', {
                    listId: list.id,
                    retailerId: primaryOutcome.retailerId as 'amazon' | 'walmart',
                  })}
                >
                  {`Start with ${retailerName(primaryOutcome.retailerId, preferences)}`}
                </Button>
              </View>
            ) : null}

            {primaryOutcome?.capability === 'cart_prepare' ? (
              <View style={styles.hero}>
                <Heading variant="lg">
                  {primaryOutcome.reason === 'store_required'
                    ? `Choose your ${retailerName(primaryOutcome.retailerId, preferences)} pickup store`
                    : `Build with ${retailerName(primaryOutcome.retailerId, preferences)}`}
                </Heading>
                <Text tone="secondary">Kwilt will match this list, keep clear matches out of the way, and ask only about exceptions.</Text>
                <Button
                  fullWidth
                  accessibilityLabel={`Build my ${primaryOutcome.requestedMode} cart`}
                  disabled={listChanged}
                  onPress={() => navigation.navigate('KrogerCart', {
                    listId: list.id,
                    fulfillmentMode: primaryOutcome.requestedMode,
                  })}
                >
                  {`Build my ${primaryOutcome.requestedMode} cart`}
                </Button>
              </View>
            ) : !primaryOutcome ? (
              <View style={styles.hero}>
                <Heading variant="lg">Your list stays here</Heading>
                <Text tone="secondary">None of your retailers can prepare this cart yet. Kwilt will not turn an opened link into a cart or order claim.</Text>
              </View>
            ) : null}

            <View style={styles.secondaryActions}>
              {alternativeOutcomes.length || unavailableOutcomes.length ? (
                <Button variant="ghost" onPress={() => setShowAlternatives((current) => !current)}>
                  Try another retailer
                </Button>
              ) : <View />}
              <Button accessibilityLabel="Refresh list" variant="ghost" onPress={() => { void refreshRevision(); }}>
                Refresh list
              </Button>
            </View>

            {showAlternatives ? (
              <View style={styles.alternatives}>
                {alternativeOutcomes.map((outcome) => {
                  const name = retailerName(outcome.retailerId, preferences);
                  if (outcome.capability === 'product_links'
                    && (outcome.retailerId === 'amazon' || outcome.retailerId === 'walmart')) {
                    return (
                      <Button
                        key={outcome.retailerId}
                        variant="outline"
                        onPress={() => navigation.navigate('RetailerLinkShopping', {
                          listId: list.id,
                          retailerId: outcome.retailerId as 'amazon' | 'walmart',
                        })}
                      >
                        {`Shop at ${name}`}
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={outcome.retailerId}
                      variant="outline"
                      onPress={() => navigation.navigate('KrogerCart', {
                        listId: list.id,
                        fulfillmentMode: outcome.requestedMode,
                      })}
                    >
                      {`Build with ${name}`}
                    </Button>
                  );
                })}
                {unavailableOutcomes.map((outcome) => (
                  <Text key={outcome.retailerId} tone="secondary">
                    {alternativeCopy(outcome, preferences)}
                  </Text>
                ))}
              </View>
            ) : null}
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
  section: {
    gap: spacing.lg,
  },
  preferenceHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hero: {
    gap: spacing.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  alternatives: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
