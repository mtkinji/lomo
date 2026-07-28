import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { getSupabaseClient } from '../../services/backend/supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../ui/Button';
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
  acceptCaregiverInvite,
  addDependentChild,
  createCaregiverInvite,
  getHouseholdSnapshot,
  setCaregiverCapabilityGrant,
  setChildCapabilityActivation,
  type ChildCapabilityId,
  type ChildCapabilityState,
  type HouseholdSnapshot,
} from './data/household';

const CAPABILITIES: readonly { id: ChildCapabilityId; name: string }[] = [
  { id: 'todos', name: 'To-dos' },
  { id: 'screen-time', name: 'Screen Time' },
];

const enabledStates = new Set<ChildCapabilityState>(['active', 'pending_setup', 'blocked']);

function stateDescription(state: ChildCapabilityState | undefined): string {
  switch (state) {
    case 'pending_setup': return 'Needs device setup';
    case 'pending_cleanup': return 'Turning off';
    case 'blocked': return 'Needs attention';
    case 'active': return 'Active';
    default: return 'Off';
  }
}

export function HouseholdSettingsScreen({ navigation }: NativeStackScreenProps<SettingsStackParamList, 'SettingsHousehold'>) {
  const authIdentity = useAppStore((state) => state.authIdentity);
  const [snapshot, setSnapshot] = useState<HouseholdSnapshot | null>(null);
  const [childName, setChildName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
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

  const runMutation = async (key: string, action: () => Promise<HouseholdSnapshot>) => {
    if (mutationKey) return;
    setMutationKey(key);
    try {
      setSnapshot(await action());
    } catch (error) {
      Alert.alert('Household change did not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMutationKey(null);
    }
  };

  const addChild = async () => {
    if (!client || !childName.trim()) return;
    const name = childName.trim();
    await runMutation('add-child', () => addDependentChild(client, {
      householdId: snapshot?.household?.id ?? null,
      displayName: name,
      ownerDisplayName: authIdentity?.name || 'Kwilter',
    }));
    setChildName('');
  };

  const createInvite = async () => {
    if (!client || mutationKey) return;
    setMutationKey('invite');
    try {
      const invite = await createCaregiverInvite(client, {
        householdId: snapshot?.household?.id ?? null,
        invitedEmail: inviteEmail,
        ownerDisplayName: authIdentity?.name || 'Kwilter',
      });
      setInviteCode(invite.code);
      setInviteEmail('');
      await load();
    } catch (error) {
      Alert.alert('Unable to create invitation', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setMutationKey(null);
    }
  };

  const joinHousehold = async () => {
    if (!client || !joinCode.trim()) return;
    await runMutation('join', () => acceptCaregiverInvite(client, {
      code: joinCode,
      displayName: authIdentity?.name || 'Caregiver',
    }));
    setJoinCode('');
  };

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
      <SettingsGroup
        footer="Household membership shares the family roster—not personal Goals, Activities, Money, chats, or other private content."
        title="Your family"
      >
        <SettingsRow title="Household" value={loading ? 'Loading…' : snapshot?.household?.name ?? 'Not set up yet'} />
        {snapshot?.household ? (
          <>
            <SettingsDivider />
            <SettingsRow title="Your role" value={currentMember?.role ?? 'Member'} />
          </>
        ) : null}
      </SettingsGroup>

      {isOwner ? (
        <SettingsGroup
          footer="Adding the first child creates your private Household automatically. Capabilities stay off until you choose them for that child."
          title="Add a child"
        >
          <View>
            <Input accessibilityLabel="Child name" label="Name" onChangeText={setChildName} value={childName} />
            <Button disabled={!childName.trim() || Boolean(mutationKey)} fullWidth onPress={() => void addChild()}>
              {mutationKey === 'add-child' ? 'Adding…' : 'Add child'}
            </Button>
          </View>
        </SettingsGroup>
      ) : null}

      {!snapshot?.household ? (
        <SettingsGroup
          footer="Use the code from your family organizer. You will join as a caregiver without automatic access to any child's capabilities."
          title="Join a household"
        >
          <View>
            <Input autoCapitalize="characters" accessibilityLabel="Caregiver invite code" label="Invite code" onChangeText={setJoinCode} value={joinCode} />
            <Button disabled={!joinCode.trim() || Boolean(mutationKey)} fullWidth onPress={() => void joinHousehold()}>
              {mutationKey === 'join' ? 'Joining…' : 'Join household'}
            </Button>
          </View>
        </SettingsGroup>
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

      {isOwner ? (
        <SettingsGroup
          footer="An invited caregiver joins with no child-capability authority. You grant that separately for each child and capability."
          title="Invite a caregiver"
        >
          <View>
            <Input autoCapitalize="none" keyboardType="email-address" label="Email (optional)" onChangeText={setInviteEmail} value={inviteEmail} />
            <Button disabled={Boolean(mutationKey)} fullWidth onPress={() => void createInvite()}>
              {mutationKey === 'invite' ? 'Creating…' : 'Create invite code'}
            </Button>
            {inviteCode ? <Text selectable>Invite code: {inviteCode}</Text> : null}
          </View>
        </SettingsGroup>
      ) : null}
    </SettingsPage>
  );
}
