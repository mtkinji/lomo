export type ScreenTimeOverrideTarget = {
  childMembershipId: string;
  selectionId: string;
  expectedVersion: number;
};

export type ScreenTimeProposalOperation =
  | {
      type: 'block_family_screen_time_selection';
      targetId: null;
      payload: {
        targets: ScreenTimeOverrideTarget[];
        timeBasis: 'wall_clock';
        expiresAt: string;
      };
    }
  | {
      type: 'allow_family_screen_time_selection';
      targetId: null;
      payload: {
        targets: ScreenTimeOverrideTarget[];
        timeBasis: 'wall_clock';
        expiresAt: string;
      };
    };

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value != null && typeof value === 'object' && !Array.isArray(value)
);

function parseTarget(value: unknown): ScreenTimeOverrideTarget | null {
  if (!isRecord(value) || Object.keys(value).some((key) => (
    key !== 'childMembershipId' && key !== 'selectionId' && key !== 'expectedVersion'
  ))) return null;
  if (typeof value.childMembershipId !== 'string' || !value.childMembershipId.trim()
    || typeof value.selectionId !== 'string' || !value.selectionId.trim()
    || !Number.isInteger(value.expectedVersion) || Number(value.expectedVersion) < 0) return null;
  return {
    childMembershipId: value.childMembershipId,
    selectionId: value.selectionId,
    expectedVersion: Number(value.expectedVersion),
  };
}

export function parseScreenTimeOverrideProposal(
  value: unknown,
  now = new Date(),
): ScreenTimeProposalOperation | null {
  if (!isRecord(value) || Object.keys(value).some((key) => (
    key !== 'action' && key !== 'targets' && key !== 'timeBasis' && key !== 'expiresAt'
  ))) return null;
  if ((value.action !== 'block' && value.action !== 'allow')
    || value.timeBasis !== 'wall_clock'
    || !Array.isArray(value.targets) || value.targets.length === 0 || value.targets.length > 20
    || typeof value.expiresAt !== 'string') return null;
  const targets = value.targets.map(parseTarget);
  if (targets.some((target) => target === null)) return null;
  const parsedTargets = targets as ScreenTimeOverrideTarget[];
  if (new Set(parsedTargets.map((target) => target.childMembershipId)).size !== parsedTargets.length) return null;
  const expiresAt = new Date(value.expiresAt);
  const duration = expiresAt.getTime() - now.getTime();
  if (!Number.isFinite(expiresAt.getTime()) || duration <= 0 || duration > 7 * 24 * 60 * 60_000) return null;
  return {
    type: value.action === 'block'
      ? 'block_family_screen_time_selection'
      : 'allow_family_screen_time_selection',
    targetId: null,
    payload: { targets: parsedTargets, timeBasis: 'wall_clock', expiresAt: expiresAt.toISOString() },
  };
}

export function parseStoredScreenTimeProposalOperation(value: unknown): ScreenTimeProposalOperation | null {
  if (!isRecord(value)
    || (value.type !== 'block_family_screen_time_selection'
      && value.type !== 'allow_family_screen_time_selection')
    || value.targetId !== null
    || !isRecord(value.payload)) return null;
  if (value.payload.timeBasis !== 'wall_clock'
    || !Array.isArray(value.payload.targets) || value.payload.targets.length === 0 || value.payload.targets.length > 20
    || typeof value.payload.expiresAt !== 'string') return null;
  const targets = value.payload.targets.map(parseTarget);
  if (targets.some((target) => target === null)) return null;
  const parsedTargets = targets as ScreenTimeOverrideTarget[];
  if (new Set(parsedTargets.map((target) => target.childMembershipId)).size !== parsedTargets.length) return null;
  const expiresAt = new Date(value.payload.expiresAt);
  if (!Number.isFinite(expiresAt.getTime())) return null;
  return {
    type: value.type,
    targetId: null,
    payload: { targets: parsedTargets, timeBasis: 'wall_clock', expiresAt: expiresAt.toISOString() },
  };
}
