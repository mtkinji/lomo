import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { useAppStore } from '../../../store/useAppStore';
import { colors, fonts, radii, spacing } from '../../../theme';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Icon, type IconName } from '../../../ui/Icon';
import { AppShell } from '../../../ui/layout/AppShell';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { CanvasScrollView } from '../../../ui/layout/CanvasScrollView';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { RetailerPreferenceList } from '../components/RetailerPreferenceList';
import { onlineShoppingPreferencesRepository } from '../data/onlineShoppingPreferencesRepository';
import { preferredGroceryStore } from '../data/preferredGroceryStore';
import {
  createDefaultOnlineShoppingPreferences,
  deriveActionableRetailerPreferences,
  normalizeRetailerPreferenceOrder,
  parseOnlineShoppingPreferences,
  reconcileActionableRetailerPreferences,
  type OnlineFulfillmentPreference,
  type RetailerPreference,
} from '../domain/onlineShoppingPreferences';
import { resolveOnlineShoppingLaunch } from '../domain/onlineShoppingLaunch';
import { getOnlineRetailerRuntimePolicies } from '../providers/affiliateRetailerProvider';
import type { KrogerLocation } from '../providers/krogerProvider';

type Props = NativeStackScreenProps<FoodStackParamList, 'OnlineShoppingSetup'>;
type SetupStep = 'fulfillment' | 'retailers';

const fulfillmentChoices: ReadonlyArray<{
  value: OnlineFulfillmentPreference;
  label: string;
  description: string;
  icon: IconName;
}> = [
  { value: 'pickup', label: 'Pickup', description: 'I’ll collect it from a nearby store.', icon: 'pin' },
  { value: 'delivery', label: 'Delivery', description: 'Bring it to my door.', icon: 'home' },
  { value: 'either', label: 'Either works', description: 'Use whichever option Kwilt can support best for this list.', icon: 'chevronsUpDown' },
];

function FulfillmentChoice({
  choice,
  onPress,
  selected,
}: {
  choice: (typeof fulfillmentChoices)[number];
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`${choice.label}. ${choice.description}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fulfillmentChoice,
        selected ? styles.fulfillmentChoiceSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.fulfillmentIcon, selected ? styles.fulfillmentIconSelected : null]}>
        <Icon name={choice.icon} size={22} color={selected ? colors.primaryForeground : colors.textSecondary} />
      </View>
      <View style={styles.grow}>
        <Text variant="body" style={styles.fulfillmentLabel}>{choice.label}</Text>
        <Text tone="secondary">{choice.description}</Text>
      </View>
      {selected ? <Icon name="check" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

export function OnlineShoppingSetupScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const personId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const policies = useMemo(() => getOnlineRetailerRuntimePolicies(), []);
  const defaults = useMemo(() => createDefaultOnlineShoppingPreferences(), []);
  const initialized = useRef(false);
  const storePickerPending = useRef(false);
  const fulfillmentRef = useRef<OnlineFulfillmentPreference>(defaults.defaultFulfillment);
  const [step, setStep] = useState<SetupStep>('fulfillment');
  const [fulfillment, setFulfillment] = useState<OnlineFulfillmentPreference>(defaults.defaultFulfillment);
  const [retailers, setRetailers] = useState<RetailerPreference[]>([]);
  const [preferredStore, setPreferredStore] = useState<KrogerLocation | null>(null);
  const [homePostalCode, setHomePostalCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const enabledRetailers = retailers.filter((retailer) => retailer.enabled);

  const load = useCallback(async () => {
    const [saved, store] = await Promise.all([
      onlineShoppingPreferencesRepository.read(personId),
      preferredGroceryStore.read(personId),
    ]);
    setPreferredStore(store);
    if (!initialized.current) {
      const nextFulfillment = saved?.defaultFulfillment ?? fulfillmentRef.current;
      fulfillmentRef.current = nextFulfillment;
      setFulfillment(nextFulfillment);
      setHomePostalCode(saved?.homePostalCode ?? null);
      setRetailers(saved
        ? reconcileActionableRetailerPreferences({
            fulfillment: nextFulfillment,
            policies,
            preferredStore: store,
            retailers: saved.retailers,
          })
        : deriveActionableRetailerPreferences({
            fulfillment: nextFulfillment,
            policies,
            preferredStore: store,
          }));
      initialized.current = true;
    } else if (storePickerPending.current && store) {
      const available = deriveActionableRetailerPreferences({ fulfillment, policies, preferredStore: store });
      const local = available.find((retailer) => retailer.id === 'kroger');
      if (local) {
        setRetailers((current) => normalizeRetailerPreferenceOrder([
          ...current.filter((retailer) => retailer.id !== 'kroger'),
          { ...local, rank: current.length + 1 },
        ]));
      }
      storePickerPending.current = false;
    }
    setLoading(false);
  }, [defaults.defaultFulfillment, fulfillment, personId, policies]);

  useEffect(() => {
    void load().catch(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', () => {
      void load().catch(() => setLoading(false));
    });
    return unsubscribe;
  }, [load, navigation]);

  const available = deriveActionableRetailerPreferences({ fulfillment, policies, preferredStore })
    .filter((candidate) => !retailers.some((retailer) => retailer.id === candidate.id && retailer.enabled));
  const localPolicy = policies.find((policy) => policy.retailerId === 'kroger');
  const canFindNearbyStore = Boolean(
    localPolicy
    && localPolicy.capability === 'cart_prepare'
    && localPolicy.approvedSurface
    && localPolicy.productEvidence
    && localPolicy.cartWrite
    && (fulfillment === 'either' || localPolicy.supportedModes.includes(fulfillment)),
  );

  const continueToRetailers = () => {
    setRetailers((current) => reconcileActionableRetailerPreferences({
      fulfillment,
      policies,
      preferredStore,
      retailers: current,
    }));
    setStep('retailers');
  };

  const chooseFulfillment = (value: OnlineFulfillmentPreference) => {
    fulfillmentRef.current = value;
    setFulfillment(value);
  };

  const addRetailer = (retailer: RetailerPreference) => {
    setRetailers((current) => normalizeRetailerPreferenceOrder([
      ...current.filter((candidate) => candidate.id !== retailer.id),
      { ...retailer, enabled: true, rank: current.filter((candidate) => candidate.enabled).length + 1 },
    ]));
    setAddStoreOpen(false);
  };

  const openStorePicker = () => {
    storePickerPending.current = true;
    setAddStoreOpen(false);
    navigation.navigate('OnlineStorePicker', { listId: route.params.listId });
  };

  const save = async () => {
    if (saving || enabledRetailers.length === 0) return;
    const preferences = parseOnlineShoppingPreferences({
      schemaVersion: 1,
      defaultFulfillment: fulfillment,
      retailers: normalizeRetailerPreferenceOrder(retailers),
      homePostalCode,
      savedAt: new Date().toISOString(),
    });
    if (!preferences) {
      Alert.alert('Check your online stores', 'Each store needs one place in your preferred order.');
      return;
    }
    setSaving(true);
    try {
      await onlineShoppingPreferencesRepository.replace(personId, preferences);
      capture(AnalyticsEvent.OnlineShoppingPreferencesSaved, {
        fulfillment_mode: preferences.defaultFulfillment,
        count: preferences.retailers.length,
        outcome: 'saved',
      });
      const launch = resolveOnlineShoppingLaunch({
        listId: route.params.listId,
        preferences,
        policies,
        preferredStore,
      });
      if (launch.screen === 'RetailerLinkShopping') {
        navigation.navigate(launch.screen, launch.params);
      } else {
        navigation.navigate(launch.screen, launch.params);
      }
    } catch {
      Alert.alert('Preferences did not save', 'Try again. Your grocery list is unchanged.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Shop online" onPressBack={() => navigation.goBack()} />
      <CanvasScrollView contentContainerStyle={styles.content}>
        {step === 'fulfillment' ? (
          <View style={styles.section}>
            <Heading variant="lg">How do you want to get your groceries?</Heading>
            <View accessibilityRole="radiogroup" style={styles.fulfillmentChoices}>
              {fulfillmentChoices.map((choice) => (
                <FulfillmentChoice
                  key={choice.value}
                  choice={choice}
                  selected={fulfillment === choice.value}
                  onPress={() => chooseFulfillment(choice.value)}
                />
              ))}
            </View>
            <Text tone="secondary">Kwilt will remember this. You can change it for any order.</Text>
            <Button fullWidth disabled={loading} onPress={continueToRetailers}>Continue</Button>
          </View>
        ) : null}

        {step === 'retailers' ? (
          <View style={styles.section}>
            <View style={styles.headingGroup}>
              <Heading variant="lg">Where should Kwilt look first?</Heading>
              <Text tone="secondary">Only stores Kwilt can help you shop online are shown.</Text>
            </View>
            {enabledRetailers.length ? (
              <View style={styles.retailerList}>
                <RetailerPreferenceList
                  retailers={enabledRetailers}
                  onOrderChange={(ordered) => setRetailers((current) => normalizeRetailerPreferenceOrder([
                    ...ordered,
                    ...current.filter((retailer) => !retailer.enabled),
                  ]))}
                  onRemove={(retailerId) => setRetailers((current) => normalizeRetailerPreferenceOrder(current.map((retailer) =>
                    retailer.id === retailerId ? { ...retailer, enabled: false, rank: 0 } : retailer)))}
                />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Heading variant="sm">Add an online store</Heading>
                <Text tone="secondary">Choose a destination Kwilt can use for this kind of order.</Text>
              </View>
            )}
            <Button
              accessibilityLabel="Add online store"
              variant="ghost"
              onPress={() => setAddStoreOpen(true)}
            >
              <View style={styles.addStoreLabel}>
                <Icon name="plus" size={18} color={colors.textPrimary} />
                <Text variant="label">Add store</Text>
              </View>
            </Button>
            <Button fullWidth disabled={enabledRetailers.length === 0} loading={saving} onPress={() => { void save(); }}>
              Save and continue
            </Button>
          </View>
        ) : null}
      </CanvasScrollView>

      <BottomDrawer visible={addStoreOpen} onClose={() => setAddStoreOpen(false)} snapPoints={['55%']}>
        <View style={styles.drawerContent}>
          <BottomDrawerHeader
            title="Add an online store"
            variant="withClose"
            onClose={() => setAddStoreOpen(false)}
            closeAccessibilityLabel="Close online stores"
          />
          {available.map((retailer) => (
            <Button key={retailer.id} variant="ghost" onPress={() => addRetailer(retailer)}>
              {retailer.label}
            </Button>
          ))}
          {!preferredStore && canFindNearbyStore ? (
            <Button variant="ghost" onPress={openStorePicker}>Find a nearby pickup store</Button>
          ) : null}
          {!available.length && (preferredStore || !canFindNearbyStore) ? (
            <Text tone="secondary">All available online stores are already on your list.</Text>
          ) : null}
        </View>
      </BottomDrawer>
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
  fulfillmentChoices: { gap: spacing.md },
  fulfillmentChoice: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: radii.input,
    backgroundColor: colors.card,
  },
  fulfillmentChoiceSelected: { borderColor: colors.primary, backgroundColor: colors.fieldFill },
  fulfillmentIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    backgroundColor: colors.gray100,
  },
  fulfillmentIconSelected: { backgroundColor: colors.primary },
  fulfillmentLabel: { fontFamily: fonts.medium, marginBottom: 1 },
  retailerList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  emptyState: { gap: spacing.xs, paddingVertical: spacing.lg },
  drawerContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  addStoreLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  grow: { flex: 1 },
  pressed: { opacity: 0.72 },
});
