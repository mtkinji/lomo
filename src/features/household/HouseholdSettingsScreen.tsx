import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import { colors, fonts, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon, type IconName } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsToggleRow,
} from '../../ui/SettingsSurface';
import { Text } from '../../ui/primitives';
import {
  acceptHouseholdMemberInvite,
  addDependentChild,
  createHouseholdMemberInvite,
  getHouseholdSnapshot,
  previewHouseholdInvite,
  setCaregiverCapabilityGrant,
  setChildCapabilityActivation,
  type ChildCapabilityId,
  type ChildCapabilityState,
  type HouseholdInvitation,
  type HouseholdInvitationPreview,
  type HouseholdSnapshot,
} from './data/household';

const CAPABILITIES: readonly { id: ChildCapabilityId; name: string }[] = [
  { id: 'todos', name: 'To-dos' },
  { id: 'screen-time', name: 'Screen Time' },
];

const enabledStates = new Set<ChildCapabilityState>(['active', 'pending_setup', 'blocked']);
type EntryMode = 'child-choice' | 'child-account' | 'child-profile' | 'caregiver' | 'join';

function HouseholdAction({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: IconName;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
    >
      <View style={styles.actionIcon}>
        <Icon color={colors.textSecondary} name={icon} size={19} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Icon color={colors.muted} name="chevronRight" size={18} />
    </Pressable>
  );
}

function stateDescription(state: ChildCapabilityState | undefined): string {
  switch (state) {
    case 'pending_setup': return 'Set up';
    case 'pending_cleanup': return 'Applying';
    case 'blocked': return 'Needs attention';
    case 'active': return 'On';
    default: return 'Off';
  }
}

export function HouseholdSettingsScreen({ navigation }: NativeStackScreenProps<SettingsStackParamList, 'SettingsHousehold'>) {
  const authIdentity = useAppStore((state) => state.authIdentity);
  const [snapshot, setSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [childName, setChildName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteReceipt, setInviteReceipt] = useState<HouseholdInvitation | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [invitePreview, setInvitePreview] = useState<HouseholdInvitationPreview | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [loading, setLoading] = useState(Boolean(authIdentity));
  const [mutationKey, setMutationKey] = useState<string | null>(null);

  const client = useMemo(() => (authIdentity ? getSupabaseClient() : null), [authIdentity]);
  const currentMember = snapshot?.members.find((member) => member.id === snapshot.currentMembershipId);
  const children = snapshot?.members.filter((member) => member.role === 'child') ?? [];
  const caregivers = snapshot?.members.filter((member) => member.role === 'caregiver') ?? [];
  const isOwner = currentMember?.role === 'owner' || snapshot?.household == null;

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      setSnapshot(await getHouseholdSnapshot(client));
    } catch (error) {
      Alert.alert('Unable to load your household', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { void load(); }, [load]);

  const runMutation = async (key: string, action: () => Promise<HouseholdSnapshot>): Promise<boolean> => {
    if (mutationKey) return false;
    setMutationKey(key);
    try {
      setSnapshot(await action());
      return true;
    } catch (error) {
      Alert.alert('Household change did not save', error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally {
      setMutationKey(null);
    }
  };

  const addChild = async () => {
    if (!client || !childName.trim()) return;
    const name = childName.trim();
    const saved = await runMutation('add-child', () => addDependentChild(client, {
      householdId: snapshot?.household?.id ?? null,
      displayName: name,
      ownerDisplayName: authIdentity?.name || 'Kwilter',
    }));
    if (saved) {
      setChildName('');
      setEntryMode(null);
    }
  };

  const createInvite = async () => {
    if (!client || mutationKey) return;
    setMutationKey('invite');
    try {
      const invite = await createHouseholdMemberInvite(client, {
        householdId: snapshot?.household?.id ?? null,
        role: 'caregiver',
        invitedEmail: inviteEmail,
        ownerDisplayName: authIdentity?.name || 'Kwilter',
      });
      setInviteReceipt(invite);
      setInviteEmail('');
      await load();
      setEntryMode(null);
    } catch (error) {
      Alert.alert('Unable to create invitation', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMutationKey(null);
    }
  };

  const createChildAccountInvite = async () => {
    if (!client || mutationKey || !childEmail.trim()) return;
    setMutationKey('child-invite');
    try {
      const invite = await createHouseholdMemberInvite(client, {
        householdId: snapshot?.household?.id ?? null,
        role: 'child',
        invitedEmail: childEmail,
        ownerDisplayName: authIdentity?.name || 'Kwilter',
      });
      setInviteReceipt(invite);
      setChildEmail('');
      await load();
      setEntryMode(null);
    } catch (error) {
      Alert.alert('Unable to create invitation', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMutationKey(null);
    }
  };

  const reviewInvitation = async () => {
    if (!client || mutationKey || !joinCode.trim()) return;
    setMutationKey('preview-invite');
    try {
      setInvitePreview(await previewHouseholdInvite(client, joinCode));
    } catch (error) {
      Alert.alert('Unable to review invitation', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMutationKey(null);
    }
  };

  const joinHousehold = async () => {
    if (!client || !joinCode.trim()) return;
    if (!invitePreview) return;
    const saved = await runMutation('join', () => acceptHouseholdMemberInvite(client, {
      code: joinCode,
      displayName: authIdentity?.name || (invitePreview.role === 'child' ? 'Child' : 'Caregiver'),
    }));
    if (saved) {
      setJoinCode('');
      setInvitePreview(null);
      setEntryMode(null);
    }
  };

  const entryTitle = entryMode === 'child-choice'
    ? 'Add a child'
    : entryMode === 'child-account'
      ? 'Invite their account'
      : entryMode === 'child-profile'
        ? 'Create a child profile'
        : entryMode === 'caregiver'
          ? 'Invite a caregiver'
          : 'Join a household';

  const entryDescription = entryMode === 'child-choice'
    ? 'Connect the account they already use, or create a profile for them.'
    : entryMode === 'child-account'
      ? 'They’ll review and accept this invitation in their own Kwilt account.'
      : entryMode === 'child-profile'
        ? 'Use this when they do not have their own Kwilt account yet.'
        : entryMode === 'caregiver'
          ? 'They’ll join with no access to a child’s capabilities.'
          : invitePreview
            ? 'Review the relationship before joining.'
            : 'Enter the code from your family organizer.';

  const entryForm = entryMode ? (
    <View style={styles.formCard}>
      <View style={styles.formHeading}>
        <View style={styles.formCopy}>
          <Text style={styles.formTitle}>
            {entryTitle}
          </Text>
          <Text style={styles.formDescription}>{entryDescription}</Text>
        </View>
        <Button accessibilityLabel="Cancel household action" iconButtonSize={32} onPress={() => setEntryMode(null)} variant="ghost">
          <Icon color={colors.textSecondary} name="close" size={18} />
        </Button>
      </View>

      {entryMode === 'child-choice' ? (
        <View style={styles.choiceCard}>
          <HouseholdAction
            description="Invite the account they already use"
            icon="mail"
            onPress={() => setEntryMode('child-account')}
            title="Already uses Kwilt"
          />
          <View style={styles.actionDivider} />
          <HouseholdAction
            description="Set them up without an account"
            icon="userPlus"
            onPress={() => setEntryMode('child-profile')}
            title="Create a profile"
          />
        </View>
      ) : null}
      {entryMode === 'child-profile' ? (
        <Input
          accessibilityLabel="Child name"
          elevation="flat"
          onChangeText={setChildName}
          placeholder="Child’s name"
          value={childName}
          variant="outline"
        />
      ) : null}
      {entryMode === 'child-account' ? (
        <Input
          accessibilityLabel="Child account email"
          autoCapitalize="none"
          elevation="flat"
          keyboardType="email-address"
          onChangeText={setChildEmail}
          placeholder="Their Kwilt email"
          value={childEmail}
          variant="outline"
        />
      ) : null}
      {entryMode === 'caregiver' ? (
        <Input
          accessibilityLabel="Caregiver email"
          autoCapitalize="none"
          elevation="flat"
          keyboardType="email-address"
          onChangeText={setInviteEmail}
          placeholder="Email (optional)"
          value={inviteEmail}
          variant="outline"
        />
      ) : null}
      {entryMode === 'join' && !invitePreview ? (
        <Input
          accessibilityLabel="Household invitation code"
          autoCapitalize="characters"
          elevation="flat"
          onChangeText={setJoinCode}
          placeholder="Invite code"
          value={joinCode}
          variant="outline"
        />
      ) : null}

      {entryMode === 'join' && invitePreview ? (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>{invitePreview.inviterDisplayName} invited you</Text>
          <Text style={styles.reviewDescription}>
            {`Join ${invitePreview.householdName} as a ${invitePreview.role}.`}
          </Text>
          <Text style={styles.reviewPrivacy}>
            Household membership shares the family roster, not your private Goals, chats, Money, or Activities. Screen Time requires separate device setup.
          </Text>
        </View>
      ) : null}

      {entryMode !== 'child-choice' ? (
        <Button
          disabled={entryMode === 'child-profile'
            ? !childName.trim() || Boolean(mutationKey)
            : entryMode === 'child-account'
              ? !childEmail.trim() || Boolean(mutationKey)
              : entryMode === 'join'
                ? !joinCode.trim() || Boolean(mutationKey)
                : Boolean(mutationKey)}
          fullWidth
          onPress={() => {
            if (entryMode === 'child-profile') void addChild();
            if (entryMode === 'child-account') void createChildAccountInvite();
            if (entryMode === 'caregiver') void createInvite();
            if (entryMode === 'join' && invitePreview) void joinHousehold();
            if (entryMode === 'join' && !invitePreview) void reviewInvitation();
          }}
          variant="primary"
        >
          {entryMode === 'child-profile'
            ? mutationKey === 'add-child' ? 'Adding…' : 'Add child'
            : entryMode === 'child-account'
              ? mutationKey === 'child-invite' ? 'Creating…' : 'Create invitation'
              : entryMode === 'caregiver'
                ? mutationKey === 'invite' ? 'Creating…' : 'Create invitation'
                : invitePreview
                  ? mutationKey === 'join' ? 'Joining…' : 'Join household'
                  : mutationKey === 'preview-invite' ? 'Reviewing…' : 'Review invitation'}
        </Button>
      ) : null}
    </View>
  ) : null;

  const actionList = (
    <View style={styles.actionCard}>
      {isOwner ? (
        <HouseholdAction
          description="Connect their account or create a profile"
          icon="userPlus"
          onPress={() => setEntryMode('child-choice')}
          title="Add a child"
        />
      ) : null}
      {isOwner ? <View style={styles.actionDivider} /> : null}
      {isOwner ? (
        <HouseholdAction
          description="They’ll use their own Kwilt account"
          icon="mail"
          onPress={() => setEntryMode('caregiver')}
          title="Invite a caregiver"
        />
      ) : null}
      {!snapshot?.household ? <View style={styles.actionDivider} /> : null}
      {!snapshot?.household ? (
        <HouseholdAction
          description="Use a code from your family organizer"
          icon="users"
          onPress={() => setEntryMode('join')}
          title="Join a household"
        />
      ) : null}
    </View>
  );

  if (!authIdentity) {
    return (
      <SettingsPage onBack={() => navigation.goBack()} title="Household">
        <SettingsGroup footer="Sign in with your own Kwilt account before setting up family participation." title="Your family">
          <SettingsRow title="Household" value="Sign in required" />
        </SettingsGroup>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage onBack={() => navigation.goBack()} title="Household">
      {!snapshot?.household ? (
        <View style={styles.setupIntro}>
          <View style={styles.heroIcon}>
            <Icon color={colors.textPrimary} name="users" size={25} />
          </View>
          <Text style={styles.setupTitle}>{loading ? 'Finding your household…' : 'Start with your people'}</Text>
          <Text style={styles.setupDescription}>
            Bring the people you coordinate with into Kwilt. You can decide what each child uses later.
          </Text>
          <View style={styles.privacyNote}>
            <Icon color={colors.textSecondary} name="shield" size={16} />
            <Text style={styles.privacyText}>Only your family roster is shared. The rest of Kwilt stays private.</Text>
          </View>
        </View>
      ) : (
        <SettingsGroup title="Your family">
          <SettingsRow title={snapshot.household.name} value={currentMember?.role ?? 'Member'} />
        </SettingsGroup>
      )}

      {!loading ? (
        <View style={styles.entrySection}>
          {entryMode ? entryForm : actionList}
          {inviteReceipt ? (
            <Text selectable style={styles.inviteCode}>
              {`${inviteReceipt.role === 'child' ? 'Child' : 'Caregiver'} invitation code: ${inviteReceipt.code}`}
            </Text>
          ) : null}
        </View>
      ) : null}

      {children.map((child) => (
        <SettingsGroup
          key={child.id}
          footer="Choose only what this child should use. A sibling's settings never change automatically."
          title={child.displayName}
        >
          {CAPABILITIES.map((capability, index) => {
            const state = snapshot?.activations.find((activation) => (
              activation.childMembershipId === child.id && activation.capabilityId === capability.id
            ))?.state;
            const key = `${child.id}:${capability.id}`;
            return (
              <Fragment key={capability.id}>
                <SettingsToggleRow
                  disabled={Boolean(mutationKey) || !isOwner}
                  enabled={state ? enabledStates.has(state) : false}
                  onPress={() => {
                    if (!client) return;
                    void runMutation(key, () => setChildCapabilityActivation(client, {
                      childMembershipId: child.id,
                      capabilityId: capability.id,
                      enabled: !(state && enabledStates.has(state)),
                    }));
                  }}
                  title={capability.name}
                />
                <Text style={{ paddingHorizontal: 16, paddingBottom: 10 }}>{mutationKey === key ? 'Saving…' : stateDescription(state)}</Text>
                {capability.id === 'screen-time' && state && enabledStates.has(state) ? (
                  <>
                    <SettingsDivider />
                    <SettingsRow
                      onPress={() => navigation.navigate('SettingsFamilyScreenTime', {
                        childMembershipId: child.id,
                        childDisplayName: child.displayName,
                      })}
                      title={`${child.displayName}'s Screen Time`}
                      value={stateDescription(state)}
                    />
                  </>
                ) : null}
                {index < CAPABILITIES.length - 1 ? <SettingsDivider /> : null}
              </Fragment>
            );
          })}
        </SettingsGroup>
      ))}

      {isOwner && caregivers.map((caregiver) => (
        <SettingsGroup
          key={caregiver.id}
          footer="These grants allow family administration only. They do not reveal personal capability content."
          title={`${caregiver.displayName}'s access`}
        >
          {children.flatMap((child) => CAPABILITIES.map((capability, index) => {
            const granted = snapshot?.grants.some((grant) => (
              grant.caregiverMembershipId === caregiver.id
              && grant.childMembershipId === child.id
              && grant.capabilityId === capability.id
            )) ?? false;
            const key = `grant:${caregiver.id}:${child.id}:${capability.id}`;
            const isLast = child.id === children.at(-1)?.id && index === CAPABILITIES.length - 1;
            return (
              <Fragment key={key}>
                <SettingsToggleRow
                  disabled={Boolean(mutationKey)}
                  enabled={granted}
                  onPress={() => {
                    if (!client) return;
                    void runMutation(key, () => setCaregiverCapabilityGrant(client, {
                      caregiverMembershipId: caregiver.id,
                      childMembershipId: child.id,
                      capabilityId: capability.id,
                      granted: !granted,
                    }));
                  }}
                  title={`Manage ${child.displayName}'s ${capability.name}`}
                />
                {isLast ? null : <SettingsDivider />}
              </Fragment>
            );
          }))}
        </SettingsGroup>
      ))}

    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  setupIntro: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.gray100,
    marginBottom: spacing.lg,
  },
  setupTitle: {
    ...typography.titleMd,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  setupDescription: {
    ...typography.bodySm,
    maxWidth: 330,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  privacyNote: {
    maxWidth: 330,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  privacyText: {
    ...typography.bodyXs,
    flex: 1,
    color: colors.textSecondary,
  },
  entrySection: {
    gap: spacing.sm,
  },
  actionCard: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  choiceCard: {
    overflow: 'hidden',
    marginHorizontal: -spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  action: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  actionDescription: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionDivider: {
    marginLeft: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  formCard: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  formHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  formCopy: {
    flex: 1,
  },
  formTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  formDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reviewCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.gray100,
  },
  reviewTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  reviewDescription: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  reviewPrivacy: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  inviteCode: {
    ...typography.bodySm,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.68,
  },
});
