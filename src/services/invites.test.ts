jest.mock('./backend/supabaseClient', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('./backend/auth', () => ({
  ensureSignedInWithPrompt: jest.fn(),
  getAccessToken: jest.fn(),
}));

jest.mock('./installId', () => ({
  getInstallId: jest.fn().mockResolvedValue('install-1'),
}));

jest.mock('./edgeFunctions', () => ({
  getEdgeFunctionUrl: jest.fn(),
}));

jest.mock('../utils/getEnv', () => ({
  getSupabasePublishableKey: jest.fn(() => 'publishable-key'),
  getEnvVar: jest.fn(() => null),
}));

import { getSupabaseClient } from './backend/supabaseClient';
import { ensureSignedInWithPrompt, getAccessToken } from './backend/auth';
import { getEdgeFunctionUrl } from './edgeFunctions';
import {
  createGoalInvite,
  declineTargetedGoalInvite,
  listGoalShareRecipients,
  previewGoalInvite,
} from './invites';

const getClient = getSupabaseClient as jest.MockedFunction<typeof getSupabaseClient>;
const ensureSignedIn = ensureSignedInWithPrompt as jest.MockedFunction<typeof ensureSignedInWithPrompt>;
const accessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const edgeUrl = getEdgeFunctionUrl as jest.MockedFunction<typeof getEdgeFunctionUrl>;
const originalFetch = global.fetch;

describe('recipient-bound Goal invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    accessToken.mockResolvedValue('access-token');
    ensureSignedIn.mockResolvedValue({ access_token: 'access-token' } as never);
    edgeUrl.mockImplementation((name) => `https://example.test/${name}`);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('loads only the minimum recipient projection from the authenticated RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        {
          recipient_kind: 'household',
          relationship_id: 'membership-1',
          display_name: 'Blaire',
          avatar_url: null,
          recipient_user_id: 'must-not-leak',
        },
        {
          recipient_kind: 'friend',
          relationship_id: 'friendship-1',
          display_name: 'Ruth',
          avatar_url: 'https://example.test/ruth.jpg',
        },
      ],
      error: null,
    });
    getClient.mockReturnValue({ rpc } as never);

    await expect(listGoalShareRecipients()).resolves.toEqual([
      {
        kind: 'household',
        relationshipId: 'membership-1',
        displayName: 'Blaire',
        avatarUrl: null,
      },
      {
        kind: 'friend',
        relationshipId: 'friendship-1',
        displayName: 'Ruth',
        avatarUrl: 'https://example.test/ruth.jpg',
      },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_kwilt_goal_share_recipients');
  });

  it('sends only the selected relationship handle when creating a targeted invite', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        inviteCode: 'target-code',
        inviteUrl: 'kwilt://invite?code=target-code',
      }),
    })) as never;

    await createGoalInvite({
      goalId: 'goal-1',
      goalTitle: 'Walk together',
      recipient: { kind: 'friend', relationshipId: 'friendship-1' },
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      entityType: 'goal',
      entityId: 'goal-1',
      recipient: { kind: 'friend', relationshipId: 'friendship-1' },
    }));
    expect(String(init.body)).not.toContain('friendUserId');
  });

  it('preserves safe targeted-create errors for recipient lifecycle decisions', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({
        error: { message: 'This person already has access', code: 'already_has_access' },
      }),
    })) as never;

    await expect(createGoalInvite({
      goalId: 'goal-1',
      goalTitle: 'Walk together',
      recipient: { kind: 'friend', relationshipId: 'friendship-1' },
    })).rejects.toEqual(expect.objectContaining({
      status: 409,
      code: 'already_has_access',
    }));
  });

  it('adds an existing session to preview requests without prompting for sign-in', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        entityId: 'goal-1',
        payload: { goalTitle: 'Walk together' },
      }),
    })) as never;

    await previewGoalInvite('target-code');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer access-token');
    expect(ensureSignedIn).not.toHaveBeenCalled();
  });

  it('preserves safe preview error codes for sign-in and wrong-account decisions', async () => {
    accessToken.mockResolvedValue(null);
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({
        error: { message: 'Sign in to view this invitation', code: 'unauthorized' },
      }),
    })) as never;

    await expect(previewGoalInvite('target-code')).rejects.toEqual(expect.objectContaining({
      status: 401,
      code: 'unauthorized',
    }));
  });

  it('declines through the authenticated atomic response command', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { state: 'declined' }, error: null });
    getClient.mockReturnValue({ rpc } as never);

    await expect(declineTargetedGoalInvite('target-code')).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('respond_to_kwilt_targeted_goal_invite', {
      p_code: 'target-code',
      p_action: 'decline',
    });
  });
});
