import {
  projectScreenTimeGuideActions,
  type ScreenTimeActor,
} from './screenTimeGuideActions';
import type { ScreenTimeRule } from './screenTimeRule';

const selfRule = (id: string, allowed = true): ScreenTimeRule => ({
  id,
  domain: 'personal',
  subject: { kind: 'self' },
  selectionId: id,
  title: 'Do a real step first',
  trigger: { type: 'real_step_pending', minFocusMinutes: 10 },
  temporaryOpen: { allowed, durationMinutes: 20 },
  active: true,
  desiredVersion: 1,
  appliedVersion: 1,
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

const project = (actor: ScreenTimeActor, rules: ScreenTimeRule[]) =>
  projectScreenTimeGuideActions({ actor, activeRules: rules });

describe('projectScreenTimeGuideActions', () => {
  it('lets an adult temporarily open every applicable self-authored rule atomically', () => {
    expect(project({ kind: 'self_adult' }, [selfRule('real-step'), selfRule('focus')])).toMatchObject({
      canTemporarilyOpen: true,
      temporaryOpenMinutes: 20,
      temporaryOpenRuleIds: ['real-step', 'focus'],
    });
  });

  it('does not offer a temporary opening when any overlapping rule cannot be overridden', () => {
    expect(project({ kind: 'self_adult' }, [selfRule('real-step'), selfRule('focus', false)])).toMatchObject({
      canTemporarilyOpen: false,
      temporaryOpenRuleIds: [],
    });
  });

  it('lets an owner or scoped caregiver temporarily open a family rule', () => {
    expect(project({ kind: 'household_owner' }, [familyRule()]).canTemporarilyOpen).toBe(true);
    expect(project({ kind: 'household_caregiver', childMembershipIds: ['child-1'] }, [familyRule()]).canTemporarilyOpen).toBe(true);
  });

  it('never lets a child or unscoped caregiver directly open a family rule', () => {
    expect(project({ kind: 'household_child', membershipId: 'child-1' }, [familyRule()])).toMatchObject({
      canTemporarilyOpen: false,
      temporaryOpenRuleIds: [],
      requiresCaregiver: true,
    });
    expect(project({ kind: 'household_caregiver', childMembershipIds: ['child-2'] }, [familyRule()])).toMatchObject({
      canTemporarilyOpen: false,
      temporaryOpenRuleIds: [],
      requiresCaregiver: true,
    });
  });

  it('does not claim an atomic opening for two family claims on one child', () => {
    const first = familyRule();
    const second = {
      ...familyRule(),
      id: 'family-social',
      selectionId: 'family_social',
      trigger: { type: 'family_agreement' as const, agreementId: 'agreement-2' },
    };
    expect(project({ kind: 'household_owner' }, [first, second]).canTemporarilyOpen).toBe(false);
  });
});
