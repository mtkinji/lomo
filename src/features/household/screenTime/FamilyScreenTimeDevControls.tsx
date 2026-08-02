import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Text } from '../../../ui/primitives';
import { familyScreenTimeDeliveryState } from './familyScreenTimeLearning';
import {
  familyScreenTimeLearningKey,
  familyScreenTimeLearningRecord,
  useFamilyScreenTimeLearningStore,
} from './useFamilyScreenTimeLearningStore';

type Props = {
  userId: string;
  childMembershipId: string;
  childDisplayName: string;
};

function devStatusLabel(state: ReturnType<typeof familyScreenTimeDeliveryState>): string {
  switch (state) {
    case 'ready_to_activate': return 'Ready';
    case 'applying': return 'Applying';
    case 'applied': return 'Applied';
    case 'device_required':
    default: return 'No test phone';
  }
}

export function FamilyScreenTimeDevControls({
  userId,
  childMembershipId,
  childDisplayName,
}: Props) {
  const records = useFamilyScreenTimeLearningStore((state) => state.records);
  const prepareSimulatedDevice = useFamilyScreenTimeLearningStore((state) => state.prepareSimulatedDevice);
  const resetChild = useFamilyScreenTimeLearningStore((state) => state.resetChild);
  if (!__DEV__) return null;

  const recordKey = familyScreenTimeLearningKey(userId, childMembershipId);
  const state = familyScreenTimeDeliveryState(familyScreenTimeLearningRecord(records, recordKey));

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Family Screen Time</Text>
          <Text style={styles.title}>{childDisplayName}</Text>
        </View>
        <Text style={styles.status}>{devStatusLabel(state)}</Text>
      </View>
      <Text style={styles.body}>
        Local device scaffolding for the caregiver and child-state flow.
      </Text>
      <View style={styles.actions}>
        <Button
          accessibilityRole="button"
          disabled={state !== 'device_required'}
          onPress={() => prepareSimulatedDevice(recordKey)}
          variant="secondary"
        >
          Prepare test phone
        </Button>
        <Button accessibilityRole="button" onPress={() => resetChild(recordKey)} variant="outline">
          Reset
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  status: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
