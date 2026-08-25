import { Pressable } from '@/src/ui/HapticPressable';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Card } from '../../ui/Card';
import { HStack, Text, VStack } from '../../ui/primitives';
import { colors, fonts, spacing, typography } from '../../theme';
import { Icon } from '../../ui/Icon';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { useSharingSettingsStore, type SharingReminderFrequency } from '../../store/useSharingSettingsStore';
import { FriendshipSettingsSection } from '../friends/FriendshipSettingsSection';
import { GoalSharingSettingsSection } from '../goals/GoalSharingSettingsSection';

const FREQUENCY_OPTIONS: Array<{ value: SharingReminderFrequency; label: string; description: string }> = [
  { value: 'default', label: 'Default', description: 'Gentle reminders when a goal needs attention.' },
  { value: 'less', label: 'Less', description: 'Only the highest-signal sharing reminders.' },
  { value: 'off', label: 'Off', description: 'No sharing or accountability reminders.' },
];

export function SharingSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList, 'SettingsSharing'>>();
  const masterMuted = useSharingSettingsStore((state) => state.masterMuted);
  const reminderFrequency = useSharingSettingsStore((state) => state.reminderFrequency);
  const setMasterMuted = useSharingSettingsStore((state) => state.setMasterMuted);
  const setReminderFrequency = useSharingSettingsStore((state) => state.setReminderFrequency);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader title="Sharing" onPressBack={() => navigation.goBack()}>
          <Text style={styles.body}>Manage the people you can choose and the reminders attached to explicit shares.</Text>
        </PageHeader>

        <FriendshipSettingsSection />

        <GoalSharingSettingsSection />

        <Text style={styles.sectionLabel}>Reminders</Text>

        <Card style={styles.card}>
          <VStack space="md">
            <HStack alignItems="center" justifyContent="space-between">
              <VStack flex={1} space="xs">
                <Text style={styles.title}>Mute sharing reminders</Text>
                <Text style={styles.body}>
                  Turns off owner-side prompts and reminders. Partners can still cheer or reply if you have shared a goal.
                </Text>
              </VStack>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: masterMuted }}
                onPress={() => setMasterMuted(!masterMuted)}
                style={[styles.switchTrack, masterMuted ? styles.switchTrackOn : null]}
              >
                <View style={[styles.switchThumb, masterMuted ? styles.switchThumbOn : null]} />
              </Pressable>
            </HStack>
          </VStack>
        </Card>

        <Card style={styles.card}>
          <VStack space="md">
            <Text style={styles.title}>Reminder frequency</Text>
            {FREQUENCY_OPTIONS.map((option) => {
              const selected = reminderFrequency === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setReminderFrequency(option.value)}
                  style={[styles.optionRow, selected ? styles.optionRowSelected : null]}
                >
                  <VStack flex={1} space="xs">
                    <Text style={styles.optionTitle}>{option.label}</Text>
                    <Text style={styles.body}>{option.description}</Text>
                  </VStack>
                  {selected ? <Icon name="check" size={18} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </VStack>
        </Card>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    padding: spacing.lg,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    padding: spacing.md,
    backgroundColor: colors.shell,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionRowSelected: {
    backgroundColor: colors.shellAlt,
    borderColor: colors.border,
  },
  optionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.border,
    padding: 3,
  },
  switchTrackOn: {
    backgroundColor: colors.accent,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.canvas,
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
