export const DEFAULT_TEMPORARY_OPEN_MINUTES = 20 as const;

export type ScreenTimeRuleDomain = 'personal' | 'money' | 'family';

export type ScreenTimeRuleSubject =
  | { kind: 'self' }
  | { kind: 'child'; membershipId: string };

export type ScreenTimeRuleTrigger =
  | { type: 'focus_active' }
  | { type: 'real_step_pending'; minFocusMinutes: number }
  | { type: 'money_review'; categorySourceId: string }
  | { type: 'family_agreement'; agreementId: string };

export type ScreenTimeRule = {
  id: string;
  domain: ScreenTimeRuleDomain;
  subject: ScreenTimeRuleSubject;
  selectionId: string;
  title: string;
  trigger: ScreenTimeRuleTrigger;
  temporaryOpen: {
    allowed: boolean;
    durationMinutes: typeof DEFAULT_TEMPORARY_OPEN_MINUTES;
  };
  active: boolean;
  desiredVersion: number;
  appliedVersion: number | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value != null && typeof value === 'object' && !Array.isArray(value)
);

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned || null;
};

const positiveInteger = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
};

function normalizeSubject(value: unknown): ScreenTimeRuleSubject | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'self') return { kind: 'self' };
  if (value.kind === 'child') {
    const membershipId = cleanString(value.membershipId);
    return membershipId ? { kind: 'child', membershipId } : null;
  }
  return null;
}

function normalizeTrigger(value: unknown): ScreenTimeRuleTrigger | null {
  if (!isRecord(value)) return null;
  if (value.type === 'focus_active') return { type: 'focus_active' };
  if (value.type === 'real_step_pending') {
    return {
      type: 'real_step_pending',
      minFocusMinutes: positiveInteger(value.minFocusMinutes, 10),
    };
  }
  if (value.type === 'money_review') {
    const categorySourceId = cleanString(value.categorySourceId);
    return categorySourceId ? { type: 'money_review', categorySourceId } : null;
  }
  if (value.type === 'family_agreement') {
    const agreementId = cleanString(value.agreementId);
    return agreementId ? { type: 'family_agreement', agreementId } : null;
  }
  return null;
}

const triggerMatchesDomain = (
  domain: ScreenTimeRuleDomain,
  trigger: ScreenTimeRuleTrigger,
): boolean => {
  if (domain === 'personal') {
    return trigger.type === 'focus_active' || trigger.type === 'real_step_pending';
  }
  if (domain === 'money') return trigger.type === 'money_review';
  return trigger.type === 'family_agreement';
};

export function normalizeScreenTimeRule(value: unknown): ScreenTimeRule | null {
  if (!isRecord(value)) return null;
  const id = cleanString(value.id);
  const selectionId = cleanString(value.selectionId);
  const title = cleanString(value.title);
  const domain = value.domain;
  const subject = normalizeSubject(value.subject);
  const trigger = normalizeTrigger(value.trigger);

  if (!id || !selectionId || !title
    || (domain !== 'personal' && domain !== 'money' && domain !== 'family')
    || !subject || !trigger || !triggerMatchesDomain(domain, trigger)) return null;
  if (domain === 'family' ? subject.kind !== 'child' : subject.kind !== 'self') return null;

  const temporaryOpen = isRecord(value.temporaryOpen) ? value.temporaryOpen : {};
  const desiredVersion = positiveInteger(value.desiredVersion, 1);
  const appliedCandidate = Number(value.appliedVersion);
  const appliedVersion = Number.isInteger(appliedCandidate) && appliedCandidate > 0
    ? appliedCandidate
    : null;

  return {
    id,
    domain,
    subject,
    selectionId,
    title,
    trigger,
    temporaryOpen: {
      allowed: temporaryOpen.allowed === true,
      durationMinutes: DEFAULT_TEMPORARY_OPEN_MINUTES,
    },
    active: value.active === true,
    desiredVersion,
    appliedVersion,
  };
}

