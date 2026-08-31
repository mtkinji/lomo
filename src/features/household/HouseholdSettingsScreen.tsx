import { Pressable } from '@/src/ui/HapticPressable';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
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
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import {
  acceptHouseholdInvitation,
  acceptPendingHouseholdInvitation,
  addDependentHouseholdMember,
  createHouseholdInvitation,
  findPendingHouseholdInvitation,
  previewHouseholdInvitation,
  readHousehold,
  setHouseholdCaregiverGrant,
  setHouseholdChildCapability,
  type HouseholdActionReceipt,
} from '../../capabilities/relationships/actions/relationshipActions';
import {
  buildHouseholdInviteUrl,
  formatHouseholdInviteCode,
  type ChildCapabilityId,
  type ChildCapabilityState,
  type HouseholdInvitation,
  type HouseholdInvitationPreview,
  type HouseholdSnapshot,
} from './data/household';
import { createHouseholdActionBoundary } from './data/householdActionBoundary';
import { resolveHouseholdAvatars, type HouseholdAvatarMap } from './data/householdAvatars';

const CAREGIVER_MANAGED_CAPABILITIES: readonly { id: ChildCapabilityId; name: string }[] = [
  { id: 'todos', name: 'To-dos' },
  { id: 'screen-time', name: 'Screen Time' },
];
const MEAL_PLANNING_CAPABILITY = { id: 'meal-planning', name: 'Meal Planning' } as const;

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

function HouseholdMemberRow({
  member,
  onPress,
}: {
  member: HouseholdSnapshot['members'][number];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={member.displayName}
      onPress={onPress}
      style={({ pressed }) => [styles.memberRow, pressed ? styles.pressed : null]}
    >
      <ProfileAvatar name={member.displayName} avatarUrl={member.avatarUrl} size={42} />
      <View style={styles.memberCopy}>
        <Text numberOfLines={1} style={styles.memberName}>{member.displayName}</Text>
        <Text numberOfLines={1} style={styles.memberRole}>
          {member.role === 'owner' ? 'Organizer' : member.role === 'caregiver' ? 'Caregiver' : 'Child'}
        </Text>
      </View>
      <Icon color={colors.textSecondary} name="chevronRight" size={17} />
    </Pressable>
  );
}

export function HouseholdSettingsScreen({ navigation, route }: NativeStackScreenProps<SettingsStackParamList, 'SettingsHousehold'>) {
  const authIdentity = useAppStore((state) => state.authIdentity);
  const linkedInviteCode = route.params?.inviteCode?.trim().toUpperCase() ?? '';
  const enteredFromMealPlan = route.params?.entrySurface === 'meal-plan';
  const [snapshot, setSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [childName, setChildName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteReceipt, setInviteReceipt] = useState<HouseholdInvitation | null>(null);
  const [joinCode, setJoinCode] = useState(linkedInviteCode);
  const [invitePreview, setInvitePreview] = useState<HouseholdInvitationPreview | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(linkedInviteCode ? 'join' : null);
  const [loading, setLoading] = useState(Boolean(authIdentity));
  const [mutationKey, setMutationKey] = useState<string | null>(null);
  const reviewedLinkedInvite = useRef<string | null>(null);

  const client = useMemo(() => (authIdentity ? getSupabaseClient() : null), [authIdentity]);
  const householdActions = useMemo(() => (
    client ? createHouseholdActionBoundary(client) : null
  ), [client]);
  const currentMember = snapshot?.members.find((member) => member.id === snapshot.currentMembershipId);
  const children = snapshot?.members.filter((member) => member.role === 'child') ?? [];
  const caregivers = snapshot?.members.filter((member) => member.role === 'caregiver') ?? [];
  const isOwner = currentMember?.role === 'owner' || snapshot?.household == null;
  const childCapabilities: readonly { id: ChildCapabilityId; name: string }[] = enteredFromMealPlan
    ? [MEAL_PLANNING_CAPABILITY, ...CAREGIVER_MANAGED_CAPABILITIES]
    : [...CAREGIVER_MANAGED_CAPABILITIES, MEAL_PLANNING_CAPABILITY];

  const handleBack = useCallback(() => {
    if (enteredFromMealPlan) {
      rootNavigationRef.navigate('Food', {
        screen: 'RecipeLibrary',
        params: { openPlan: true },
      });
      return;
    }
    navigation.goBack();
  }, [enteredFromMealPlan, navigation]);

  const load = useCallback(async () => {
    if (!householdActions) return;
    setLoading(true);
    try {
      const base = (await readHousehold(householdActions)).result;
      const avatars = await resolveHouseholdAvatars().catch((): HouseholdAvatarMap => ({}));
      setSnapshot({
        ...base,
        members: base.members.map((member) => ({ ...member, ...(avatars[member.id] ?? {}) })),
      });
      if (!base.household && !linkedInviteCode) {
        const pending = (await findPendingHouseholdInvitation(householdActions)).result;
        if (pending) {
          setInvitePreview(pending);
          setEntryMode('join');
        }
      }
    } catch (error) {
      Alert.alert('Unable to load your household', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [householdActions, linkedInviteCode]);

  useEffect(() => { void load(); }, [load]);

  const runMutation = async (
    key: string,
    action: () => Promise<HouseholdActionReceipt<HouseholdSnapshot>>,
  ): Promise<boolean> => {
    if (mutationKey) return false;
    setMutationKey(key);
    try {
      setSnapshot((await action()).result);
      return true;
    } catch (error) {
      Alert.alert('Household change did not save', error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally {
      setMutationKey(null);
    }
  };

  const addChild = async () => {
    if (!householdActions || !childName.trim()) return;
    const name = childName.trim();
    const saved = await runMutation('add-child', () => addDependentHouseholdMember({
      householdId: snapshot?.household?.id ?? null,
      displayName: name,
      ownerDisplayName: authIdentity?.name || 'Kwilter',
      confirmed: true,
    }, householdActions));
    if (saved) {
      setChildName('');
      setEntryMode(null);
    }
  };

  const createInvite = async () => {
    if (!householdActions || mutationKey) return;
    setMutationKey('invite');
    try {
      const invite = (await createHouseholdInvitation({
        householdId: snapshot?.household?.id ?? null,
        role: 'caregiver',
        invitedEmail: inviteEmail,
        ownerDisplayName: authIdentity?.name || 'Kwilter',
        confirmed: true,
      }, householdActions)).result;
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
    if (!householdActions || mutationKey || !childEmail.trim()) return;
    setMutationKey('child-invite');
    try {
      const invite = (await createHouseholdInvitation({
        householdId: snapshot?.household?.id ?? null,
        role: 'child',
        invitedEmail: childEmail,
        ownerDisplayName: authIdentity?.name || 'Kwilter',
        confirmed: true,
      }, householdActions)).result;
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
    if (!householdActions || mutationKey || !joinCode.trim()) return;
    setMutationKey('preview-invite');
    try {
      setInvitePreview((await previewHouseholdInvitation(joinCode, householdActions)).result);
    } catch (error) {
      Alert.alert('Unable to review invitation', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMutationKey(null);
    }
  };

  useEffect(() => {
    if (!householdActions || !linkedInviteCode || reviewedLinkedInvite.current === linkedInviteCode) return;
    reviewedLinkedInvite.current = linkedInviteCode;
    setJoinCode(linkedInviteCode);
    setEntryMode('join');
    setMutationKey('preview-invite');
    void previewHouseholdInvitation(linkedInviteCode, householdActions)
      .then((receipt) => setInvitePreview(receipt.result))
      .catch((error) => {
        Alert.alert('Unable to review invitation', error instanceof Error ? error.message : 'Please try again.');
      })
      .finally(() => setMutationKey(null));
  }, [householdActions, linkedInviteCode]);

  const shareInvitation = async () => {
    if (!inviteReceipt) return;
    const url = buildHouseholdInviteUrl(inviteReceipt.code);
    const householdName = snapshot?.household?.name ?? 'a Household';
    const role = inviteReceipt.role === 'child' ? 'child' : 'caregiver';
    await Share.share({
      url,
      message: `${authIdentity?.name || 'Someone'} invited you to join ${householdName} as a ${role} in Kwilt. Household membership shares the family roster, not your private Goals, chats, Money, or Activities.\n\nOpen in Kwilt: ${url}\nInvite code: ${inviteReceipt.code}`,
    });
  };

  const joinHousehold = async () => {
    if (!householdActions) return;
    if (!invitePreview) return;
    const displayName = authIdentity?.name || (invitePreview.role === 'child' ? 'Child' : 'Caregiver');
    const saved = await runMutation('join', () => invitePreview.invitationId
      ? acceptPendingHouseholdInvitation({
        invitationId: invitePreview.invitationId,
        displayName,
        confirmed: true,
      }, householdActions)
      : acceptHouseholdInvitation({
        code: joinCode,
        displayName,
        confirmed: true,
      }, householdActions));
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
      ? 'Kwilt will email their account, then they’ll review before joining.'
      : entryMode === 'child-profile'
        ? 'Use this when they do not have their own Kwilt account yet.'
        : entryMode === 'caregiver'
          ? 'Enter their Kwilt email to send it, or leave it blank to share it yourself.'
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
                ? (!invitePreview?.invitationId && !joinCode.trim()) || Boolean(mutationKey)
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
              ? mutationKey === 'child-invite' ? 'Sending…' : 'Send invitation'
              : entryMode === 'caregiver'
                ? mutationKey === 'invite'
                  ? inviteEmail.trim() ? 'Sending…' : 'Creating…'
                  : inviteEmail.trim() ? 'Send invitation' : 'Create invitation'
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
      <SettingsPage onBack={handleBack} title="Household">
        <SettingsGroup footer="Sign in with your own Kwilt account before setting up family participation." title="Your family">
          <SettingsRow title="Household" value="Sign in required" />
        </SettingsGroup>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage onBack={handleBack} title="Household">
      {!snapshot?.household ? (
        <View style={styles.setupIntro}>
          <View style={styles.heroIcon}>
            <Icon color={colors.textPrimary} name="users" size={25} />
          </View>
          <Text style={styles.setupTitle}>
            {loading ? 'Finding your household…' : enteredFromMealPlan ? 'Plan meals together' : 'Start with your people'}
          </Text>
          <Text style={styles.setupDescription}>
            {enteredFromMealPlan
              ? 'Add the people you plan with. Eligible Household members can add ideas and weigh in from the same Plan.'
              : 'Bring the people you coordinate with into Kwilt. You can decide what each child uses later.'}
          </Text>
          <View style={styles.privacyNote}>
            <Icon color={colors.textSecondary} name="shield" size={16} />
            <Text style={styles.privacyText}>Only your family roster is shared. The rest of Kwilt stays private.</Text>
          </View>
        </View>
      ) : null}

      {snapshot?.household ? (
        <SettingsGroup footer={snapshot.household.name} title="Your family">
          {snapshot.members.map((member, index) => (
            <Fragment key={member.id}>
              <HouseholdMemberRow
                member={member}
                onPress={() => navigation.navigate('SettingsHouseholdMember', { membershipId: member.id })}
              />
              {index < snapshot.members.length - 1 ? <SettingsDivider /> : null}
            </Fragment>
          ))}
        </SettingsGroup>
      ) : null}

      {snapshot?.household ? (
        <SettingsGroup footer="Set up shared iPads separately from a child's personal device." title="Devices">
          <SettingsRow
            onPress={() => navigation.navigate('SettingsHouseholdDevices', {
              householdId: snapshot.household!.id,
            })}
            title="Household devices"
          />
        </SettingsGroup>
      ) : null}

      {!loading ? (
        <View style={styles.entrySection}>
          {entryMode ? entryForm : actionList}
          {inviteReceipt ? (
            <View style={styles.inviteReceipt}>
              <Text style={styles.inviteReceiptTitle}>
                {inviteReceipt.recovered ? 'Invitation ready again' : 'Invitation ready'}
              </Text>
              <View accessibilityLabel="Household invitation QR code" style={styles.inviteQr}>
                <QRCode size={148} value={buildHouseholdInviteUrl(inviteReceipt.code)} />
              </View>
              <Text selectable style={styles.inviteCode}>
                {formatHouseholdInviteCode(inviteReceipt.code)}
              </Text>
              <Text style={styles.inviteDelivery}>
                {inviteReceipt.emailDelivery === 'sent'
                  ? 'Email sent. They can also scan this QR code.'
                  : inviteReceipt.emailDelivery === 'failed'
                    ? 'Email could not be delivered. Share the QR code or manual code instead.'
                    : 'Share the QR code or manual code.'}
              </Text>
              <Text style={styles.invitePrivacy}>
                This invitation shares Household membership only. Private Kwilt content stays private.
              </Text>
              <Button fullWidth onPress={() => void shareInvitation()} variant="secondary">
                Share invitation
              </Button>
            </View>
          ) : null}
        </View>
      ) : null}

      {children.map((child) => (
        <SettingsGroup
          key={child.id}
          footer="Choose only what this child should use. A sibling's settings never change automatically."
          title={child.displayName}
        >
          {childCapabilities.map((capability, index) => {
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
                    if (!householdActions) return;
                    void runMutation(key, () => setHouseholdChildCapability({
                      childMembershipId: child.id,
                      capabilityId: capability.id,
                      enabled: !(state && enabledStates.has(state)),
                      confirmed: true,
                    }, householdActions));
                  }}
                  title={capability.name}
                  value={mutationKey === key ? 'Saving…' : stateDescription(state)}
                />
                {capability.id === 'screen-time' && state && enabledStates.has(state) ? (
                  <>
                    <SettingsDivider />
                    <SettingsRow
                      onPress={() => navigation.navigate('SettingsFamilyScreenTime', {
                        householdId: snapshot.household!.id,
                        childMembershipId: child.id,
                        childDisplayName: child.displayName,
                      })}
                      title={`${child.displayName}'s Screen Time`}
                      value={stateDescription(state)}
                    />
                  </>
                ) : null}
                {index < childCapabilities.length - 1 ? <SettingsDivider /> : null}
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
          {children.flatMap((child) => CAREGIVER_MANAGED_CAPABILITIES.map((capability, index) => {
            const granted = snapshot?.grants.some((grant) => (
              grant.caregiverMembershipId === caregiver.id
              && grant.childMembershipId === child.id
              && grant.capabilityId === capability.id
            )) ?? false;
            const key = `grant:${caregiver.id}:${child.id}:${capability.id}`;
            const isLast = child.id === children.at(-1)?.id && index === CAREGIVER_MANAGED_CAPABILITIES.length - 1;
            return (
              <Fragment key={key}>
                <SettingsToggleRow
                  disabled={Boolean(mutationKey)}
                  enabled={granted}
                  onPress={() => {
                    if (!householdActions) return;
                    void runMutation(key, () => setHouseholdCaregiverGrant({
                      caregiverMembershipId: caregiver.id,
                      childMembershipId: child.id,
                      capabilityId: capability.id,
                      granted: !granted,
                      confirmed: true,
                    }, householdActions));
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
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  inviteReceipt: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.gray100,
  },
  inviteReceiptTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  inviteQr: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  inviteDelivery: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  invitePrivacy: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.68,
  },
  memberRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  memberRole: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
