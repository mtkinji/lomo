import { useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { ProfileAvatar } from '../../../ui/ProfileAvatar';
import { AppShell } from '../../../ui/layout/AppShell';
import { Heading, Text } from '../../../ui/primitives';
import { useHouseholdModeStore } from './useHouseholdModeStore';
import { reconcileHouseholdModeSession } from './householdModeReconciliation';

const capabilityLabels: Record<string, string> = {
  chores: 'Chores',
  todos: 'Chores & To-dos',
  'meal-planning': 'Meals & Groceries',
  recipes: 'Recipes',
};

export function HouseholdModeHost() {
  const authIdentity = useAppStore((state) => state.authIdentity);
  const session = useHouseholdModeStore((state) => state.session);
  const selectMember = useHouseholdModeStore((state) => state.selectMember);
  const finish = useHouseholdModeStore((state) => state.finishCaregiverReauthentication);
  const requestReauthentication = useHouseholdModeStore((state) => state.requestCaregiverReauthentication);
  const replaceSession = useHouseholdModeStore((state) => state.replaceSession);
  const markUnavailable = useHouseholdModeStore((state) => state.markUnavailable);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session?.requiresCaregiverReauthentication && authIdentity?.userId) {
      finish(authIdentity.userId);
    }
  }, [authIdentity?.userId, finish, session?.requiresCaregiverReauthentication]);

  const refreshAuthority = async () => {
    const current = useHouseholdModeStore.getState().session;
    if (!current || current.requiresCaregiverReauthentication
      || authIdentity?.userId !== current.assignedCaregiverUserId) return;
    setBusy(true);
    try {
      const reconciled = await reconcileHouseholdModeSession(getSupabaseClient(), current);
      if (reconciled) {
        replaceSession(reconciled);
        return;
      }
      await getSupabaseClient().auth.signOut();
      useAppStore.getState().clearAuthIdentity();
      requestReauthentication();
    } catch {
      markUnavailable();
    } finally {
      setBusy(false);
    }
  };

  const returnToCaregiver = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
      // Clear the in-memory caregiver identity before arming reauthentication so the
      // still-mounted host cannot mistake the just-signed-out session for a fresh sign-in.
      useAppStore.getState().clearAuthIdentity();
      requestReauthentication();
    } catch (error) {
      Alert.alert('Unable to leave Household Mode', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (session && authIdentity?.userId === session.assignedCaregiverUserId
      && !session.requiresCaregiverReauthentication) void refreshAuthority();
    // Reconcile when the persisted device/actor identity becomes available; session replacements
    // are authoritative outputs and must not recursively trigger another request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authIdentity?.userId, session?.deviceId, session?.householdId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshAuthority();
    });
    return () => subscription.remove();
  });

  if (!session) return null;

  if (session.requiresCaregiverReauthentication) {
    const correctCaregiver = authIdentity?.userId === session.assignedCaregiverUserId;
    return (
      <AppShell backgroundVariant="shellAlt">
        <View style={styles.center}>
          <Heading>{correctCaregiver ? 'Opening caregiver Kwilt…' : `Sign in as ${session.assignedCaregiverName}`}</Heading>
          {!correctCaregiver ? (
            <>
              <Text style={styles.body}>This iPad is still in Household Mode. Only the assigned caregiver can open the full account.</Text>
              <Button
                disabled={busy}
                fullWidth
                onPress={() => {
                  setBusy(true);
                  void getSupabaseClient().auth.signOut().finally(() => setBusy(false));
                }}
              >
                Use another account
              </Button>
            </>
          ) : null}
        </View>
      </AppShell>
    );
  }

  if (session.verification === 'unavailable') {
    return (
      <AppShell backgroundVariant="shellAlt">
        <View style={styles.center}>
          <Heading>Household Mode is unavailable</Heading>
          <Text style={styles.body}>Kwilt can’t verify this iPad’s Household access right now. No member features are available until it reconnects.</Text>
          <Button disabled={busy} fullWidth onPress={() => void refreshAuthority()}>Try again</Button>
          <Button disabled={busy} fullWidth onPress={() => void returnToCaregiver()} variant="ghost">Caregiver sign in</Button>
        </View>
      </AppShell>
    );
  }

  const active = session.members.find((member) => member.id === session.activeMemberId) ?? null;

  return (
    <AppShell backgroundVariant="shellAlt">
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>HOUSEHOLD MODE</Text>
          <Button disabled={busy} onPress={() => void returnToCaregiver()} variant="ghost">
            Caregiver sign in
          </Button>
        </View>
        {!active ? (
          <View style={styles.content}>
            <Heading>Who’s using Kwilt?</Heading>
            <Text style={styles.body}>Choose your name. You’ll only see the Household features set up for you.</Text>
            <View style={styles.memberGrid}>
              {session.members.map((member) => (
                <Button key={member.id} onPress={() => selectMember(member.id)} variant="secondary">
                  {member.displayName}
                </Button>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.identity}>
              <ProfileAvatar name={active.displayName} size={72} />
              <Heading>{active.displayName}</Heading>
              <Button onPress={() => selectMember(null)} variant="ghost">Switch person</Button>
            </View>
            {active.capabilityIds.length > 0 ? (
              <View style={styles.capabilities}>
                {active.capabilityIds.flatMap((id) => capabilityLabels[id] ? [
                  <View key={id} style={styles.capabilityCard}>
                    <Heading>{capabilityLabels[id]}</Heading>
                    <Text style={styles.body}>Available for {active.displayName} on this shared iPad.</Text>
                  </View>,
                ] : [])}
              </View>
            ) : (
              <Text style={styles.body}>Nothing is set up for {active.displayName} on this iPad yet.</Text>
            )}
          </View>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...typography.label, color: colors.textSecondary },
  content: { flex: 1, justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.xl },
  center: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  body: { ...typography.body, color: colors.textSecondary },
  memberGrid: { gap: spacing.md },
  identity: { alignItems: 'center', gap: spacing.md },
  capabilities: { gap: spacing.md },
  capabilityCard: { gap: spacing.sm, padding: spacing.lg, borderRadius: 20, backgroundColor: colors.canvas },
});
