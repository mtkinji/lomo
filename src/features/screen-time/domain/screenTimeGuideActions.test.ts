import {
  projectScreenTimeGuideActions,
  type ScreenTimeActor,
} from './screenTimeGuideActions';
import type { ScreenTimeRule } from './screenTimeRule';

const selfRule = (overrides: Partial<ScreenTimeRule> = {}): ScreenTimeRule => ({
  id: 'real-step',
  domain: 'personal',
  subject: { kind: 'self' },
  selectionId: 'real-step',
  title: 'Do a real step first',
  trigger: { type: 'real_step_pending', minFocusMinutes: 10 },
  temporaryOpen: { allowed: true, durationMinutes: 20 },
  active: true,
  desiredVersion: 1,
  appliedVersion: 1,
  ...overrides,
});

const familyRule = (childMembershipId = 'child-1'): ScreenTimeRule => ({
  id: 'family-games',
  domain: 'family',
  subject: { kind: 'child', membershipId: childMembershipId },
  selectionId: 'family_games',
  title: 'Games after responsibilities',
  trigger: { type: 'family_agreement', agreementId: 'agreement-1' },
  temporaryOpen: { allowed: true, durationMinutes: 20 },
  active: true,
  desiredVersion: 4,
  appliedVersion: 4,
});

const project = (
  actor: ScreenTimeActor,
  rules: ScreenTimeRule[],
  unresolvedCount = 0,
) => projectScreenTimeGuideActions({ actor, activeRules: rules, unresolvedCount });

describe('projectScreenTimeGuideActions', () => {
  it('offers one exact prerequisite only when it resolves the full active set', () => {
    expect(project({ kind: 'self_adult' }, [selfRule()])).toMatchObject({
      resolutionKind: 'actionable',
      requirementAction: {
        kind: 'real_step',
        label: 'Do this first',
        destination: 'kwilt://today?source=screen-time&highlightSuggested=1',
      },
      canManageRules: true,
    });

    expect(project({ kind: 'self_adult' }, [
      selfRule(),
      selfRule({ id: 'focus', trigger: { type: 'focus_active' } }),
    ])).toMatchObject({ resolutionKind: 'mixed', requirementAction: null });
  });

  it('treats time and usage rules as boundaries without a generic action', () => {
    expect(project({ kind: 'self_adult' }, [selfRule({
      trigger: { type: 'daily_usage_limit', minutes: 15, reset: 'daily' },
    })])).toMatchObject({
      resolutionKind: 'boundary',
      requirementAction: null,
      canManageRules: true,
    });
  });

  it('suppresses prerequisite actions when any restriction is unresolved', () => {
    expect(project({ kind: 'self_adult' }, [selfRule()], 1)).toMatchObject({
      resolutionKind: 'unresolved',
      requirementAction: null,
      canManageRules: true,
    });
  });

  it('allows management for an owner or scoped caregiver but never for a child', () => {
    expect(project({ kind: 'household_owner' }, [familyRule()])).toMatchObject({
      canManageRules: true,
      requiresCaregiver: false,
    });
    expect(project(
      { kind: 'household_caregiver', childMembershipIds: ['child-1'] },
      [familyRule()],
    )).toMatchObject({ canManageRules: true, requiresCaregiver: false });
    expect(project(
      { kind: 'household_child', membershipId: 'child-1' },
      [familyRule()],
    )).toMatchObject({
      canManageRules: false,
      requiresCaregiver: true,
      requirementAction: null,
    });
    expect(project(
      { kind: 'household_caregiver', childMembershipIds: ['child-2'] },
      [familyRule()],
    )).toMatchObject({ canManageRules: false, requiresCaregiver: true });
  });
});
