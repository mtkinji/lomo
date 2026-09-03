import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityRepeatBasis, ActivityRepeatCustom, ActivityRepeatRule } from '../../../domain/types';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { uploadFileToSignedUrl } from '../../../services/files/uploadFileToSignedUrl';

export type ChoreActor = {
  membershipId: string;
  displayName: string;
  role: 'owner' | 'caregiver' | 'child';
};

export type ChoreDefinitionRecord = {
  id: string;
  activitySeriesId: string;
  title: string;
  definitionOfDone: string;
  status: 'active' | 'paused' | 'deleted';
  participation: 'assigned' | 'open';
  assignedMembershipId: string | null;
  repeatRule?: ActivityRepeatRule;
  repeatCustom: ActivityRepeatCustom | null;
  repeatBasis: ActivityRepeatBasis;
  photoPolicy: 'optional' | 'required';
  reviewPolicy: 'trusted' | 'caregiver_review';
  tokenValue: 1 | 2 | 3;
  updatedAt: string;
};

export type ChoreOccurrenceRecord = {
  id: string;
  definitionId: string;
  activityId: string;
  scheduledDate: string | null;
  title: string;
  status: 'ready' | 'available' | 'claimed' | 'waiting_approval' | 'needs_another_pass' | 'missed' | 'completed';
  assignedMembershipId: string | null;
  performedByMembershipId: string | null;
  performedAt: string | null;
  completionSource?: 'direct' | 'earlier_day';
  reportedAt?: string | null;
  evidenceRefs: string[];
  evidencePreviewUrls?: string[];
  reviewNote: string | null;
  policyOverrides?: Partial<Pick<ChoreDefinitionRecord, 'definitionOfDone' | 'photoPolicy' | 'reviewPolicy' | 'tokenValue'>>;
  tokenCredited: boolean;
  updatedAt: string;
};

export type ChoreRewardReservation = {
  id: string;
  membershipId: string;
  tokenCount: number;
  centsPerToken: number;
  moneyAmountCents: number;
  status: 'reserved' | 'cancelled' | 'settled';
  updatedAt: string;
};

export type ChoreControlSnapshot = {
  household: { id: string; name: string };
  actor: ChoreActor;
  members: ChoreActor[];
  definitions: ChoreDefinitionRecord[];
  occurrences: ChoreOccurrenceRecord[];
  reward: {
    enabled: boolean;
    centsPerToken: number;
    version: string;
    balances: Array<{ membershipId: string; availableTokens: number; reservedTokens: number }>;
    reservations: ChoreRewardReservation[];
  };
  observedAt: string;
};

export type ChoreRepositoryOperation = {
  requestId: string;
  operationId: string;
  targetId: string | null;
  expectedVersion: string | null;
  payload: Record<string, unknown>;
  /** Captured locally for safe outbox replay; never sent inside the operation payload. */
  actorContext?: { actorMembershipId: string; installId: string } | null;
};

export type ChoreRepositoryResult = {
  operationId: string;
  status: 'completed' | 'queued_offline';
  result?: unknown;
  updatedAt?: string;
};

export interface ChoreRepository {
  read(): Promise<ChoreControlSnapshot>;
  execute(operation: ChoreRepositoryOperation): Promise<ChoreRepositoryResult>;
  replayOutbox(): Promise<{ replayed: number; remaining: number }>;
  uploadEvidence(input: { occurrenceId: string; fileUri: string; mimeType?: string | null }): Promise<string>;
}

type Outbox = {
  load(): Promise<ChoreRepositoryOperation[]>;
  save(items: ChoreRepositoryOperation[]): Promise<void>;
};

const OUTBOX_KEY = 'kwilt-chore-action-outbox-v1';
const defaultOutbox: Outbox = {
  async load() {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as ChoreRepositoryOperation[]; } catch { return []; }
  },
  async save(items) {
    if (items.length === 0) await AsyncStorage.removeItem(OUTBOX_KEY);
    else await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  },
};

type RpcClient = Pick<SupabaseClient, 'rpc'>;
type RpcResult = { data: unknown; error: { message?: string } | null };
type ChoreActorContext = { actorMembershipId: string; installId: string } | null;

function validActor(value: unknown): value is ChoreActor {
  const input = value as Partial<ChoreActor> | null;
  return !!input && typeof input.membershipId === 'string' && typeof input.displayName === 'string'
    && ['owner', 'caregiver', 'child'].includes(String(input.role));
}

function parseSnapshot(value: unknown): ChoreControlSnapshot {
  const input = value as Partial<ChoreControlSnapshot> | null;
  if (!input || !input.household || typeof input.household.id !== 'string'
    || !validActor(input.actor) || !Array.isArray(input.members) || !input.members.every(validActor)
    || !Array.isArray(input.definitions) || !Array.isArray(input.occurrences)
    || !input.reward || !Array.isArray(input.reward.balances) || !Array.isArray(input.reward.reservations)
    || typeof input.observedAt !== 'string') throw new Error('invalid_chore_projection');
  return input as ChoreControlSnapshot;
}

function isOffline(error: { message?: string } | null): boolean {
  return /network|offline|fetch|connection/i.test(error?.message ?? '');
}

export function createChoreRepository(
  client?: RpcClient,
  outbox: Outbox = defaultOutbox,
  getActorContext: () => Promise<ChoreActorContext> = async () => null,
): ChoreRepository {
  let resolvedClient = client;
  const rpcClient = () => (resolvedClient ??= getSupabaseClient());
  const run = async (operation: ChoreRepositoryOperation): Promise<ChoreRepositoryResult> => {
    const actor = operation.actorContext === undefined ? await getActorContext() : operation.actorContext;
    const { actorContext: _actorContext, ...wireOperation } = operation;
    const { data, error } = await rpcClient().rpc('execute_kwilt_chore_action', {
      p_operation: wireOperation,
      p_actor_membership_id: actor?.actorMembershipId ?? null,
      p_install_id: actor?.installId ?? null,
    }) as RpcResult;
    if (error) throw new Error(error.message || 'chore_operation_failed');
    if (!data || typeof data !== 'object') throw new Error('invalid_chore_action_receipt');
    return data as ChoreRepositoryResult;
  };
  return {
    async read() {
      const actor = await getActorContext();
      const { data, error } = await rpcClient().rpc('get_kwilt_chore_snapshot', {
        p_actor_membership_id: actor?.actorMembershipId ?? null,
        p_install_id: actor?.installId ?? null,
      }) as RpcResult;
      if (error) throw new Error(error.message || 'chore_read_failed');
      if (data === null) throw new Error('household_membership_required');
      const snapshot = parseSnapshot(data);
      const fullClient = rpcClient() as SupabaseClient;
      if (!fullClient.storage) return snapshot;
      const occurrences = await Promise.all(snapshot.occurrences.map(async (occurrence) => ({
        ...occurrence,
        evidencePreviewUrls: (await Promise.all(occurrence.evidenceRefs.map(async (storageRef) => {
          const signed = await fullClient.storage.from('chore_evidence').createSignedUrl(storageRef, 3600);
          if (signed.error || !signed.data?.signedUrl) throw new Error(signed.error?.message || 'chore_evidence_preview_failed');
          return signed.data.signedUrl;
        }))),
      })));
      return { ...snapshot, occurrences };
    },
    async execute(operation) {
      const governedOperation = { ...operation, actorContext: await getActorContext() };
      try { return await run(governedOperation); } catch (error) {
        if (!isOffline({ message: error instanceof Error ? error.message : String(error) })) throw error;
        const pending = await outbox.load();
        if (!pending.some((item) => item.requestId === operation.requestId)) {
          await outbox.save([...pending, governedOperation]);
        }
        return { operationId: operation.operationId, status: 'queued_offline' };
      }
    },
    async replayOutbox() {
      const pending = await outbox.load();
      const remaining: ChoreRepositoryOperation[] = [];
      let replayed = 0;
      for (const operation of pending) {
        try { await run(operation); replayed += 1; } catch { remaining.push(operation); }
      }
      await outbox.save(remaining);
      return { replayed, remaining: remaining.length };
    },
    async uploadEvidence({ occurrenceId, fileUri, mimeType }) {
      const fullClient = rpcClient() as SupabaseClient;
      if (!fullClient.storage) throw new Error('chore_evidence_storage_unavailable');
      const extension = mimeType === 'image/png' ? 'png' : 'jpg';
      const suffix = typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const storageRef = `${occurrenceId}/${suffix}.${extension}`;
      const { data, error } = await fullClient.storage.from('chore_evidence').createSignedUploadUrl(storageRef);
      if (error || !data?.signedUrl) throw new Error(error?.message || 'chore_evidence_upload_init_failed');
      await uploadFileToSignedUrl({ signedUrl: data.signedUrl, fileUri, mimeType });
      return storageRef;
    },
  };
}
