import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { KwiltSwitch } from '../../../ui/KwiltSwitch';
import { SegmentedControl } from '../../../ui/SegmentedControl';
import { AppShell } from '../../../ui/layout/AppShell';
import { CanvasScrollView } from '../../../ui/layout/CanvasScrollView';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { RetailerPreferenceList } from '../components/RetailerPreferenceList';
import { onlineShoppingPreferencesRepository } from '../data/onlineShoppingPreferencesRepository';
import {
  createDefaultOnlineShoppingPreferences,
  normalizeRetailerPreferenceOrder,
  parseOnlineShoppingPreferences,
  type OnlineFulfillmentPreference,
  type RetailerPreference,
} from '../domain/onlineShoppingPreferences';

type Props = NativeStackScreenProps<FoodStackParamList, 'OnlineShoppingSetup'>;
type SetupStep = 'fulfillment' | 'retailers' | 'order';

function setRetailerEnabled(
  retailers: RetailerPreference[],
  retailerId: RetailerPreference['id'],
  enabled: boolean,
): RetailerPreference[] {
  const nextRank = Math.max(0, ...retailers.map((retailer) => retailer.rank)) + 1;
  return normalizeRetailerPreferenceOrder(retailers.map((retailer) =>
    retailer.id === retailerId
      ? { ...retailer, enabled, rank: enabled ? nextRank : 0 }
      : retailer,
  ));
}

function moveRetailer(
  retailers: RetailerPreference[],
  retailerId: RetailerPreference['id'],
  direction: 'earlier' | 'later',
): RetailerPreference[] {
  const ranked = retailers
    .filter((retailer) => retailer.enabled)
    .sort((left, right) => left.rank - right.rank);
  const index = ranked.findIndex((retailer) => retailer.id === retailerId);
  const swapIndex = direction === 'earlier' ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= ranked.length) return retailers;
  const currentId = ranked[index].id;
  const swapId = ranked[swapIndex].id;
  const currentRank = ranked[index].rank;
  const swapRank = ranked[swapIndex].rank;
  return retailers.map((retailer) => retailer.id === currentId
    ? { ...retailer, rank: swapRank }
    : retailer.id === swapId
      ? { ...retailer, rank: currentRank }
      : retailer);
}

export function OnlineShoppingSetupScreen({ navigation, route }: Props) {
  const personId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const defaults = useMemo(() => createDefaultOnlineShoppingPreferences(), []);
  const [step, setStep] = useState<SetupStep>('fulfillment');
  const [fulfillment, setFulfillment] = useState<OnlineFulfillmentPreference>(
    defaults.defaultFulfillment,
  );
  const [retailers, setRetailers] = useState(defaults.retailers);
  const [saving, setSaving] = useState(false);
  const enabledRetailers = retailers.filter((retailer) => retailer.enabled);
  const other = retailers.find((retailer) => retailer.id === 'other');
  const canContinueRetailers = enabledRetailers.length > 0
    && (!other?.enabled || other.label.trim().length > 0);

  const updateRetailer = (
    retailerId: RetailerPreference['id'],
    patch: Partial<RetailerPreference>,
  ) => setRetailers((current) => current.map((retailer) =>
    retailer.id === retailerId ? { ...retailer, ...patch } : retailer,
  ));

  const save = async () => {
    if (saving) return;
    const preferences = parseOnlineShoppingPreferences({
      schemaVersion: 1,
      defaultFulfillment: fulfillment,
      retailers: normalizeRetailerPreferenceOrder(retailers),
      homePostalCode: null,
      savedAt: new Date().toISOString(),
    });
    if (!preferences) {
      Alert.alert('Choose your retailers', 'Each selected retailer needs one place in your preferred order.');
      return;
    }
    setSaving(true);
    try {
      await onlineShoppingPreferencesRepository.replace(personId, preferences);
      navigation.navigate('OnlineOrder', { listId: route.params.listId });
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
            <Text tone="secondary">Set this once. You can change it whenever a list calls for something different.</Text>
            <Heading variant="lg">How should Kwilt help?</Heading>
            <SegmentedControl
              accessibilityLabel="Default fulfillment"
              options={[
                { value: 'pickup', label: 'Pickup' },
                { value: 'delivery', label: 'Delivery' },
                { value: 'either', label: 'Either' },
              ]}
              value={fulfillment}
              onChange={setFulfillment}
            />
            <Button fullWidth onPress={() => setStep('retailers')}>Continue</Button>
          </View>
        ) : null}

        {step === 'retailers' ? (
          <View style={styles.section}>
            <Heading variant="lg">Where do you shop?</Heading>
            <Text tone="secondary">Choose only stores you would actually use online. Kwilt will remember them even when a direct action is not available yet.</Text>
            <View style={styles.retailerList}>
              {retailers.map((retailer) => (
                <View key={retailer.id} style={styles.retailerBlock}>
                  <View style={styles.retailerRow}>
                    <Text variant="body">{retailer.id === 'other' ? 'Another retailer' : retailer.label}</Text>
                    <KwiltSwitch
                      accessibilityLabel={`Use ${retailer.id === 'other' ? 'another retailer' : retailer.label}`}
                      value={retailer.enabled}
                      onPress={() => setRetailers((current) =>
                        setRetailerEnabled(current, retailer.id, !retailer.enabled))}
                    />
                  </View>
                  {retailer.id === 'other' && retailer.enabled ? (
                    <Input
                      accessibilityLabel="Other retailer name"
                      label="Retailer name"
                      value={retailer.label}
                      onChangeText={(label) => updateRetailer('other', { label })}
                    />
                  ) : null}
                  {(retailer.id === 'amazon' || retailer.id === 'costco') && retailer.enabled ? (
                    <View style={styles.membershipRow}>
                      <Text tone="secondary">
                        {retailer.id === 'amazon' ? 'I use Amazon Prime' : 'I have a Costco membership'}
                      </Text>
                      <KwiltSwitch
                        accessibilityLabel={retailer.id === 'amazon'
                          ? 'I use Amazon Prime'
                          : 'I have a Costco membership'}
                        value={retailer.membershipConfirmed === true}
                        onPress={() => updateRetailer(retailer.id, {
                          membershipConfirmed: retailer.membershipConfirmed === true ? null : true,
                        })}
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
            {retailers.some((retailer) => retailer.id === 'kroger' && retailer.enabled) ? (
              <Text tone="secondary">Your exact local store comes later, when Kwilt can match this list.</Text>
            ) : null}
            <Button
              fullWidth
              disabled={!canContinueRetailers}
              onPress={() => setStep('order')}
            >
              Continue
            </Button>
          </View>
        ) : null}

        {step === 'order' ? (
          <View style={styles.section}>
            <Heading variant="lg">Which should Kwilt try first?</Heading>
            <Text tone="secondary">This order is yours. Kwilt never rearranges it for commission.</Text>
            <RetailerPreferenceList
              retailers={retailers}
              onMove={(retailerId, direction) =>
                setRetailers((current) => moveRetailer(current, retailerId, direction))}
            />
            <Button fullWidth loading={saving} onPress={() => { void save(); }}>
              Save and continue
            </Button>
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
  retailerList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  retailerBlock: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  retailerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  membershipRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingLeft: spacing.md,
  },
});
