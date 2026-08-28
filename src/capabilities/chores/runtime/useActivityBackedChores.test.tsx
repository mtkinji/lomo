import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ChoreControlSnapshot, ChoreRepository } from '../data/choreRepository';
import { useActivityBackedChores } from './useActivityBackedChores';
import { useHouseholdModeStore } from '../../../features/household/sharedDevice/useHouseholdModeStore';

const snapshot: ChoreControlSnapshot = {
  household: { id: 'household-1', name: 'Home' },
  actor: { membershipId: 'child-1', displayName: 'Charlie', role: 'child' },
  members: [{ membershipId: 'child-1', displayName: 'Charlie', role: 'child' }],
  definitions: [{ id: 'profile-1', activitySeriesId: 'series-1', title: 'Dishes', definitionOfDone: 'Dry', status: 'active', participation: 'open', assignedMembershipId: null, repeatRule: 'daily', repeatCustom: null, repeatBasis: 'scheduled', photoPolicy: 'optional', reviewPolicy: 'trusted', tokenValue: 1, updatedAt: 'profile-v1' }],
  occurrences: [{ id: 'occurrence-1', definitionId: 'profile-1', activityId: 'activity-1', scheduledDate: '2026-08-27', title: 'Dishes', status: 'available', assignedMembershipId: null, performedByMembershipId: null, performedAt: null, evidenceRefs: [], reviewNote: null, tokenCredited: false, updatedAt: 'occurrence-v1' }],
  reward: { enabled: false, centsPerToken: 50, version: 'reward-v1', balances: [{ membershipId: 'child-1', availableTokens: 0, reservedTokens: 0 }], reservations: [] },
  observedAt: '2026-08-27T18:00:00.000Z',
};

const mockRepository: jest.Mocked<ChoreRepository> = {
  read: jest.fn(async () => snapshot),
  execute: jest.fn(async (operation) => ({ operationId: operation.operationId, status: 'completed' as const })),
  replayOutbox: jest.fn(async () => ({ replayed: 0, remaining: 0 })),
  uploadEvidence: jest.fn(async (_input: Parameters<ChoreRepository['uploadEvidence']>[0]) => 'occurrence-1/evidence.jpg'),
};

jest.mock('../data/choreRepository', () => ({
  ...jest.requireActual('../data/choreRepository'),
  createChoreRepository: () => mockRepository,
}));
jest.mock('../../../services/installId', () => ({ getInstallId: async () => 'install-123' }));

beforeEach(() => {
  jest.clearAllMocks();
  useHouseholdModeStore.setState({ session: null, hydrated: true });
});

test('native production state reads Activity identities and executes Take through choreActions', async () => {
  const { result } = renderHook(() => useActivityBackedChores(true));
  await waitFor(() => expect(result.current.record?.occurrences[0]).toMatchObject({
    controlId: 'occurrence-1', activityOccurrenceId: 'activity-1',
  }));
  await act(async () => { await result.current.claim(result.current.record!.occurrences[0]); });
  expect(mockRepository.execute).toHaveBeenCalledWith(expect.objectContaining({
    operationId: 'chores.occurrence.claim', targetId: 'occurrence-1', expectedVersion: 'occurrence-v1',
  }));
});
