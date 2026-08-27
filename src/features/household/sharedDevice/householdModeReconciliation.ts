import type { SupabaseClient } from '@supabase/supabase-js';
import { getInstallId } from '../../../services/installId';
import { getHouseholdSnapshot, type HouseholdSnapshot } from '../data/household';
import {
  listHouseholdDevices,
  type HouseholdDevice,
} from '../data/householdDeviceParticipation';
import type { HouseholdModeSession } from './useHouseholdModeStore';

export function projectCurrentHouseholdModeSession(
  session: HouseholdModeSession,
  devices: HouseholdDevice[],
  snapshot: HouseholdSnapshot,
  currentInstallId: string,
): HouseholdModeSession | null {
  const device = devices.find((candidate) => (
    candidate.id === session.deviceId
    && candidate.householdId === session.householdId
    && candidate.kind === 'shared_household'
    && candidate.status === 'ready'
    && candidate.installId === currentInstallId
  ));
  if (!device || !snapshot.household || snapshot.household.id !== session.householdId
    || !snapshot.currentMembershipId
    || device.assignedCaregiverMembershipId !== snapshot.currentMembershipId) return null;

  const allowed = new Set(device.memberIds);
  const members = snapshot.members.filter((member) => (
    member.role === 'child' && allowed.has(member.id)
  )).map((member) => ({
    id: member.id,
    displayName: member.displayName,
    capabilityIds: snapshot.activations.filter((activation) => (
      activation.childMembershipId === member.id && activation.state === 'active'
    )).map((activation) => activation.capabilityId),
  }));
  return {
    ...session,
    verification: 'current',
    members,
    activeMemberId: members.some((member) => member.id === session.activeMemberId)
      ? session.activeMemberId : null,
  };
}

export async function reconcileHouseholdModeSession(
  client: SupabaseClient,
  session: HouseholdModeSession,
): Promise<HouseholdModeSession | null> {
  const [devices, snapshot] = await Promise.all([
    listHouseholdDevices(client, session.householdId),
    getHouseholdSnapshot(client),
  ]);
  return projectCurrentHouseholdModeSession(session, devices, snapshot, await getInstallId());
}
