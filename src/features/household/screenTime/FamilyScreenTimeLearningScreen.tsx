import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppStore } from '../../../store/useAppStore';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { colors, radii, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { SegmentedControl } from '../../../ui/SegmentedControl';
import { SettingsPage } from '../../../ui/SettingsSurface';
import { Text } from '../../../ui/primitives';
import { FamilyScreenTimeAgreementCard } from './FamilyScreenTimeAgreementCard';
import {
  familyScreenTimeChildExplanation,
  familyScreenTimeDeliveryState,
} from './familyScreenTimeLearning';
import { buildFamilyScreenTimeSummary } from './familyScreenTimePresentation';
import { trackFamilyScreenTime } from './familyScreenTimeAnalytics';
import { resolveFamilyScreenTimeSetupStep } from './familyScreenTimeSetupFlow';
import { simulateFamilyScreenTimePolicyDelivery } from './simulatedFamilyScreenTimeDevice';
import {
  familyScreenTimeLearningKey,
  familyScreenTimeLearningRecord,
  useFamilyScreenTimeLearningStore,
} from './useFamilyScreenTimeLearningStore';
import { listHouseholdDevices } from '../data/householdDeviceParticipation';

type Props = {
  navigation: {
    goBack: () => void;
    navigate: (route: 'SettingsHouseholdDeviceSetup', params: {
      householdId: string;
      childMembershipId: string;
      childDisplayName: string;
    }) => void;
  };
  now?: () => Date;
  route: {
    params: {
      childMembershipId: string;
      childDisplayName: string;
      householdId: string;
    };
  };
};

export function FamilyScreenTimeLearningScreen({ navigation, now = () => new Date(), route }: Props) {
  const { childMembershipId, childDisplayName, householdId } = route.params;
  const userId = useAppStore((state) => state.authIdentity?.userId ?? 'signed-out');
  const records = useFamilyScreenTimeLearningStore((state) => state.records);
  const activateAgreement = useFamilyScreenTimeLearningStore((state) => state.activateAgreement);
  const acknowledgePolicy = useFamilyScreenTimeLearningStore((state) => state.acknowledgePolicy);
  const updateAgreement = useFamilyScreenTimeLearningStore((state) => state.updateAgreement);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftStartHour, setDraftStartHour] = useState<'3' | '4' | '5'>('4');
  const [draftLimit, setDraftLimit] = useState<'30' | '45' | '60'>('30');
  const [hasPersonalDevice, setHasPersonalDevice] = useState(false);
  const { capture } = useAnalytics();

  useEffect(() => {
    if (userId === 'signed-out') return;
    let active = true;
    listHouseholdDevices(getSupabaseClient(), householdId).then((devices) => {
      if (active) setHasPersonalDevice(devices.some((device) => (
        device.kind === 'personal_child' && device.childMembershipId === childMembershipId
      )));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [childMembershipId, householdId, userId]);

  const recordKey = useMemo(
    () => familyScreenTimeLearningKey(userId, childMembershipId),
    [childMembershipId, userId],
  );
  const record = familyScreenTimeLearningRecord(records, recordKey);
  const deliveryState = familyScreenTimeDeliveryState(record);
  const setupStep = resolveFamilyScreenTimeSetupStep({
    capabilityActive: true,
    deviceReady: record.deviceMode === 'simulated',
    selectionReady: record.deviceMode === 'simulated',
    agreementReviewed: true,
    childPreviewReviewed: true,
    desiredVersion: record.desiredPolicyVersion,
    appliedVersion: record.appliedPolicyVersion,
  });
  const summary = buildFamilyScreenTimeSummary({
    childMembershipId,
    childDisplayName,
    rule: record.rule,
    deliveryState,
    childExplanation: familyScreenTimeChildExplanation(record, now(), 0),
    issue: deliveryError,
  });

  useEffect(() => {
    trackFamilyScreenTime(capture, 'viewed', {
      childMembershipId,
      entrySurface: 'household',
      lifecycle: summary.lifecycle,
    });
  }, [capture, childMembershipId, summary.lifecycle]);

  const deliverPolicy = async (policyVersion: number) => {
    if (!__DEV__) return;
    setDeliveryError(null);
    try {
      const receipt = await simulateFamilyScreenTimePolicyDelivery(policyVersion);
      acknowledgePolicy(recordKey, receipt.policyVersion, receipt.acknowledgedAtIso);
      trackFamilyScreenTime(capture, 'policy_applied', {
        childMembershipId,
        entrySurface: 'household',
        step: 'complete',
        lifecycle: 'applied',
        outcome: 'completed',
      });
    } catch {
      setDeliveryError(`${childDisplayName}’s iPhone did not apply the agreement. Try again.`);
      trackFamilyScreenTime(capture, 'policy_failed', {
        childMembershipId,
        entrySurface: 'household',
        step: 'activate',
        lifecycle: 'needs_attention',
        outcome: 'failed',
      });
    }
  };

  const activate = () => {
    if (!__DEV__ || deliveryState === 'applying') return;
    const policyVersion = activateAgreement(recordKey, new Date().toISOString());
    trackFamilyScreenTime(capture, 'agreement_activated', {
      childMembershipId,
      entrySurface: 'household',
      step: setupStep,
      lifecycle: 'applying',
      outcome: 'started',
    });
    void deliverPolicy(policyVersion);
  };

  const retryDelivery = () => {
    if (record.desiredPolicyVersion <= 0) return;
    void deliverPolicy(record.desiredPolicyVersion);
  };

  const openDeviceSetup = () => {
    trackFamilyScreenTime(capture, 'setup_opened', {
      childMembershipId,
      entrySurface: 'household',
      step: setupStep,
      lifecycle: 'needs_setup',
      outcome: 'started',
    });
    navigation.navigate('SettingsHouseholdDeviceSetup', {
      householdId,
      childMembershipId,
      childDisplayName,
    });
  };

  const handleAgreementAction = () => {
    if (summary.nextAction === 'activate') {
      activate();
      return;
    }
    if (summary.nextAction === 'recover') {
      retryDelivery();
      return;
    }
    if (summary.nextAction === 'edit') {
      const currentStartHour = String(Math.floor(record.rule.startMinute / 60));
      setDraftStartHour(currentStartHour === '15' ? '3' : currentStartHour === '17' ? '5' : '4');
      setDraftLimit(
        record.rule.dailyLimitMinutes === 45
          ? '45'
          : record.rule.dailyLimitMinutes === 60
            ? '60'
            : '30',
      );
      setEditing(true);
    }
  };

  const saveChanges = () => {
    updateAgreement(recordKey, {
      ...record.rule,
      startMinute: (Number(draftStartHour) + 12) * 60,
      dailyLimitMinutes: Number(draftLimit),
    });
    setEditing(false);
    activate();
  };

  return (
    <SettingsPage onBack={() => navigation.goBack()} title={`Screen Time for ${childDisplayName}`}>
      {editing ? (
        <View style={styles.editorCard}>
          <View style={styles.editorField}>
            <Text selectable style={styles.editorLabel}>When can Games start?</Text>
            <SegmentedControl
              onChange={setDraftStartHour}
              options={[
                { value: '3', label: '3 PM' },
                { value: '4', label: '4 PM' },
                { value: '5', label: '5 PM' },
              ]}
              value={draftStartHour}
            />
          </View>
          <View style={styles.editorField}>
            <Text selectable style={styles.editorLabel}>How much each day?</Text>
            <SegmentedControl
              onChange={setDraftLimit}
              options={[
                { value: '30', label: '30 min' },
                { value: '45', label: '45 min' },
                { value: '60', label: '60 min' },
              ]}
              value={draftLimit}
            />
          </View>
          <Button accessibilityRole="button" fullWidth onPress={saveChanges} variant="primary">
            Save changes
          </Button>
        </View>
      ) : deliveryState === 'device_required' ? (
        <View style={styles.setupCard}>
          <Text selectable style={styles.setupTitle}>
            {hasPersonalDevice
              ? `${childDisplayName}’s iPhone is connected.`
              : `Set up a device for ${childDisplayName} to continue.`}
          </Text>
          {hasPersonalDevice ? (
            <Text selectable style={styles.status}>
              Open Kwilt on that iPhone to finish Apple approval. Screen Time will be ready only after the device applies and receipts the agreement.
            </Text>
          ) : (
            <Button accessibilityRole="button" fullWidth onPress={openDeviceSetup} variant="primary">
              Set up a device
            </Button>
          )}
        </View>
      ) : (
        <>
          {deliveryState === 'applying' ? (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              Applying to {childDisplayName}’s iPhone…
            </Text>
          ) : null}
          <FamilyScreenTimeAgreementCard
            summary={summary}
            onAction={handleAgreementAction}
          />
        </>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  setupCard: {
    gap: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  setupTitle: {
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  status: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  editorCard: {
    gap: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  editorField: {
    gap: spacing.sm,
  },
  editorLabel: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
});
