export type ScreenTimeOverrideTarget = {
  childMembershipId: string;
  selectionId: string;
  expectedVersion: number;
};

export type ScreenTimePrerequisiteActivity = {
  selectionId: string;
  thresholdMinutes: number;
  reset: 'daily';
};

export type ScreenTimePrerequisiteAgreementRule = {
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  dailyLimitMinutes: number | null;
  prerequisiteActivity: ScreenTimePrerequisiteActivity;
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
    }
  | {
      type: 'create_family_screen_time_prerequisite_agreement';
      targetId: null;
      payload: {
        childMembershipId: string;
        targetSelectionId: string;
        expectedPolicyVersion: number;
        rule: ScreenTimePrerequisiteAgreementRule;
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

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function parsePrerequisiteRule(value: unknown): ScreenTimePrerequisiteAgreementRule | null {
  if (!isRecord(value) || Object.keys(value).some((key) => ![
    'weekdays', 'startMinute', 'endMinute', 'dailyLimitMinutes', 'prerequisiteActivity',
  ].includes(key)) || !Array.isArray(value.weekdays) || value.weekdays.length === 0
    || value.weekdays.length > 7 || !value.weekdays.every((day) => isIntegerInRange(day, 0, 6))
    || new Set(value.weekdays).size !== value.weekdays.length
    || !isIntegerInRange(value.startMinute, 0, 1439)
    || !isIntegerInRange(value.endMinute, 1, 1440)
    || Number(value.endMinute) <= Number(value.startMinute)
    || !(value.dailyLimitMinutes === null || isIntegerInRange(value.dailyLimitMinutes, 1, 1440))
    || !isRecord(value.prerequisiteActivity)
    || Object.keys(value.prerequisiteActivity).some((key) => ![
      'selectionId', 'thresholdMinutes', 'reset',
    ].includes(key))
    || typeof value.prerequisiteActivity.selectionId !== 'string'
    || !value.prerequisiteActivity.selectionId.trim()
    || !isIntegerInRange(value.prerequisiteActivity.thresholdMinutes, 1, 1440)
    || value.prerequisiteActivity.reset !== 'daily') return null;
  return {
    weekdays: [...value.weekdays] as number[],
    startMinute: Number(value.startMinute),
    endMinute: Number(value.endMinute),
    dailyLimitMinutes: value.dailyLimitMinutes === null ? null : Number(value.dailyLimitMinutes),
    prerequisiteActivity: {
      selectionId: value.prerequisiteActivity.selectionId,
      thresholdMinutes: Number(value.prerequisiteActivity.thresholdMinutes),
      reset: 'daily',
    },
  };
}

export function parseScreenTimePrerequisiteAgreementProposal(
  value: unknown,
): Extract<ScreenTimeProposalOperation, { type: 'create_family_screen_time_prerequisite_agreement' }> | null {
  if (!isRecord(value) || Object.keys(value).some((key) => ![
    'childMembershipId', 'targetSelectionId', 'expectedPolicyVersion', 'rule',
  ].includes(key))
    || typeof value.childMembershipId !== 'string' || !value.childMembershipId.trim()
    || typeof value.targetSelectionId !== 'string' || !value.targetSelectionId.trim()
    || !isIntegerInRange(value.expectedPolicyVersion, 0, Number.MAX_SAFE_INTEGER)) return null;
  const rule = parsePrerequisiteRule(value.rule);
  if (!rule || rule.prerequisiteActivity.selectionId === value.targetSelectionId) return null;
  return {
    type: 'create_family_screen_time_prerequisite_agreement',
    targetId: null,
    payload: {
      childMembershipId: value.childMembershipId,
      targetSelectionId: value.targetSelectionId,
      expectedPolicyVersion: Number(value.expectedPolicyVersion),
      rule,
    },
  };
}

export function parseScreenTimeOverrideProposal(
  value: unknown,
  now = new Date(),
): Exclude<ScreenTimeProposalOperation, { type: 'create_family_screen_time_prerequisite_agreement' }> | null {
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
  if (isRecord(value) && value.type === 'create_family_screen_time_prerequisite_agreement'
    && value.targetId === null && isRecord(value.payload)) {
    return parseScreenTimePrerequisiteAgreementProposal(value.payload);
  }
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
