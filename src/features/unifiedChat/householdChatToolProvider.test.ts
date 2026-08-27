import { createHouseholdChatToolProvider } from './householdChatToolProvider';

const snapshot = {
  household: { id: 'household-1', name: 'Watanabe Household' },
  currentMembershipId: 'owner-1', members: [], activations: [], grants: [],
};

function tool(id: 'household.read' | 'household.invitation.preview') {
  return { id, capabilityId: 'household' } as never;
}

test('executes the canonical native Household read action', async () => {
  const boundary = {
    read: jest.fn(async () => snapshot),
    previewInvitation: jest.fn(),
  } as never;
  const provider = createHouseholdChatToolProvider({ boundary });

  await expect(provider.execute(
    { id: 'read-household', toolId: 'household.read', arguments: {} },
    tool('household.read'),
  )).resolves.toEqual({ status: 'completed', output: { household: snapshot }, receipt: null });
});

test('normalizes and previews a Household invitation through the native action boundary', async () => {
  const preview = {
    householdName: 'Watanabe Household', inviterDisplayName: 'Andrew',
    role: 'caregiver' as const, expiresAt: '2026-09-03T12:00:00.000Z',
  };
  const boundary = {
    read: jest.fn(),
    previewInvitation: jest.fn(async () => preview),
  } as never;
  const provider = createHouseholdChatToolProvider({ boundary });

  await expect(provider.execute(
    { id: 'preview-household', toolId: 'household.invitation.preview', arguments: { code: ' ab12cd ' } },
    tool('household.invitation.preview'),
  )).resolves.toEqual({ status: 'completed', output: { invitation: preview }, receipt: null });
  expect((boundary as { previewInvitation: jest.Mock }).previewInvitation).toHaveBeenCalledWith('AB12CD');
});

test('keeps Household action errors bounded', async () => {
  const boundary = {
    read: jest.fn(async () => { throw new Error('private database detail'); }),
    previewInvitation: jest.fn(),
  } as never;
  const provider = createHouseholdChatToolProvider({ boundary });

  await expect(provider.execute(
    { id: 'read-household', toolId: 'household.read', arguments: {} },
    tool('household.read'),
  )).resolves.toEqual({
    status: 'failed', code: 'household_provider_failed',
    message: 'Kwilt could not read that Household information.', retryable: true,
  });
});
