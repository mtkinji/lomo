import type {
  ServerAgentProposalRecord,
  ServerAgentProposalRequest,
  ServerAgentToolCall,
  ServerAgentToolResult,
} from './agentRuntime.ts';

type QueryResult = { data: unknown; error: unknown };
type ProfileQuery = {
  select: (...args: unknown[]) => ProfileQuery;
  eq: (...args: unknown[]) => ProfileQuery;
  maybeSingle: () => Promise<QueryResult>;
};
type ProfileClient = { from: (table: string) => unknown };

const AGE_RANGES = new Set([
  'under-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65-plus', 'prefer-not-to-say',
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizePatch(value: unknown): Record<string, unknown> | null {
  const input = record(value);
  const keys = Object.keys(input);
  if (keys.length === 0 || keys.some((key) => key !== 'fullName' && key !== 'ageRange')) return null;
  const patch: Record<string, unknown> = {};
  if ('fullName' in input) {
    if (input.fullName !== null && typeof input.fullName !== 'string') return null;
    const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
    if (fullName.length > 160) return null;
    patch.fullName = fullName || null;
  }
  if ('ageRange' in input) {
    if (input.ageRange !== null && (typeof input.ageRange !== 'string' || !AGE_RANGES.has(input.ageRange))) return null;
    patch.ageRange = input.ageRange;
  }
  return patch;
}

async function loadProjection(client: ProfileClient, userId: string): Promise<QueryResult> {
  return (client.from('kwilt_agent_profile_projections') as ProfileQuery)
    .select('profile_id,full_name,age_range,profile_updated_at')
    .eq('user_id', userId)
    .maybeSingle();
}

export async function executeServerProfileTool({
  client, userId, call, stageProposal,
}: {
  client: ProfileClient;
  userId: string;
  call: ServerAgentToolCall;
  stageProposal?: (request: ServerAgentProposalRequest) => Promise<ServerAgentProposalRecord>;
}): Promise<ServerAgentToolResult | null> {
  if (call.toolId !== 'profile.read' && call.toolId !== 'profile.update') return null;

  const { data, error } = await loadProjection(client, userId);
  if (error) {
    return { status: 'failed', code: 'profile_read_failed', message: 'Kwilt could not read the current Profile.', retryable: true };
  }
  const projection = record(data);
  const profileId = typeof projection.profile_id === 'string' ? projection.profile_id.trim() : '';
  const expectedUpdatedAt = typeof projection.profile_updated_at === 'string'
    ? projection.profile_updated_at
    : '';

  if (call.toolId === 'profile.read') {
    return {
      status: 'completed',
      output: {
        profile: profileId ? {
          id: profileId,
          fullName: typeof projection.full_name === 'string' ? projection.full_name : null,
          ageRange: typeof projection.age_range === 'string' ? projection.age_range : null,
          updatedAt: expectedUpdatedAt || null,
        } : null,
      },
      receipt: null,
    };
  }

  const patch = normalizePatch(call.arguments.fields);
  if (!patch) {
    return { status: 'failed', code: 'invalid_profile_patch', message: 'A display name or supported age range is required.', retryable: false };
  }
  if (!profileId || !expectedUpdatedAt) {
    return { status: 'failed', code: 'profile_version_unavailable', message: 'Kwilt could not establish the current native Profile version.', retryable: true };
  }
  if (!stageProposal) {
    return { status: 'unavailable', reason: 'server_proposal_persistence_unavailable', retryable: false };
  }
  const proposal = await stageProposal({
    capabilityId: 'profile',
    title: 'Update your Profile',
    body: 'Reviews the requested Profile fields before the native Profile owner applies them.',
    operation: {
      type: 'update_profile', targetType: 'profile', targetId: profileId,
      summary: 'Update Profile display fields', payload: { ...patch, expectedUpdatedAt },
    },
  });
  return { status: 'proposed', proposal };
}
