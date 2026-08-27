import fs from 'node:fs';
import path from 'node:path';
import { KWILT_CAPABILITY_MANIFEST } from '@kwilt/agent-runtime';
import { KWILT_OPERATION_REGISTRY } from './operations';

const CONTROL_PARITY_OPERATION_IDS = `
household.member.update
household.member.remove
household.device.list
household.device.update
household.device.revoke
household.device.reconcile
plan.availability.read
plan.availability.update
plan.calendars.read
plan.calendars.update
chapters.digest_settings.read
chapters.digest_settings.update
chapters.alignment.preview
chapters.alignment.apply
settings.appearance.read
settings.appearance.update
settings.ai_model.read
settings.ai_model.update
settings.phone_agent.read
settings.phone_agent.update
settings.connected_tools.list
settings.connected_tools.get
settings.connected_tools.connect.open
settings.connected_tools.revoke
settings.sharing.list
settings.sharing.invitation.prepare
settings.sharing.connection.revoke
settings.haptics.read
settings.haptics.update
settings.widgets.read
settings.widgets.configure
settings.execution_targets.list
settings.execution_targets.get
settings.execution_targets.create
settings.execution_targets.update
settings.execution_targets.delete
settings.destinations.list
settings.destinations.get
settings.destinations.create
settings.destinations.update
settings.destinations.delete
settings.activity_areas.list
settings.activity_areas.get
settings.activity_areas.create
settings.activity_areas.update
settings.activity_areas.delete
money.budget.read
money.budget.update
money.transaction.get
money.transaction.meaning.update
money.transaction.plan_treatment.update
money.connection.disconnect
money.connection.repair.open
money.transfer.list
money.transfer.get
money.transfer.review
chores.list
chores.get
chores.definition.create
chores.definition.update
chores.definition.pause
chores.definition.delete
chores.occurrence.complete
chores.evidence.add
chores.review.approve
chores.review.return
chores.reward.read
chores.reward.configure
chores.reward.reserve
chores.reward.cancel
chores.reward.settle
recipes.favorite.update
recipes.visibility.update
meal_planning.preferences.read
meal_planning.preferences.update
screen_time.personal_rule.list
screen_time.personal_rule.get
screen_time.personal_rule.update
screen_time.personal_rule.deactivate
screen_time.personal_rule.delete
notifications.preferences.read
notifications.preferences.update
navigation.open_capability
`.trim().split('\n');

describe('KWILT_OPERATION_REGISTRY', () => {
  test('is the product projection of the one canonical capability manifest', () => {
    expect(KWILT_OPERATION_REGISTRY).toEqual(
      KWILT_CAPABILITY_MANIFEST.map(({ id, owner }) => ({ id, owner })),
    );
    expect(new Set(KWILT_CAPABILITY_MANIFEST.map((operation) => operation.id)).size)
      .toBe(KWILT_CAPABILITY_MANIFEST.length);
  });

  test('is declared independently instead of mapping the Chat manifest at runtime', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/capabilities/operations.ts'), 'utf8');
    expect(source).not.toContain('KWILT_CAPABILITY_MANIFEST.map');
    expect(Object.isFrozen(KWILT_OPERATION_REGISTRY)).toBe(true);
  });

  test('declares the complete 228-operation conversational control catalog', () => {
    const ids = KWILT_OPERATION_REGISTRY.map(({ id }) => id);

    expect(CONTROL_PARITY_OPERATION_IDS).toHaveLength(83);
    expect(KWILT_OPERATION_REGISTRY).toHaveLength(228);
    expect(ids).toEqual(expect.arrayContaining(CONTROL_PARITY_OPERATION_IDS));
    expect(new Set(ids).size).toBe(228);
  });

  test('keeps Household reads live while writes remain explicit pending-provider boundaries', () => {
    const liveReads = ['household.read', 'household.invitation.preview'] as const;
    const pendingWrites = [
      ['household.member.add_dependent', 'explicit'],
      ['household.invitation.create', 'explicit'],
      ['household.invitation.accept', 'explicit'],
      ['household.child_capability.update', 'explicit'],
      ['household.caregiver_grant.update', 'explicit'],
    ] as const;
    const byId = new Map(KWILT_CAPABILITY_MANIFEST.map((operation) => [operation.id, operation]));
    for (const id of liveReads) {
      expect(byId.get(id)).toMatchObject({
        owner: 'household', confirmation: 'none',
        channels: {
          mobile: { state: 'live', outcome: 'answer' },
          phone: { state: 'live', outcome: 'server_execution' },
        },
      });
    }
    for (const [id, confirmation] of pendingWrites) {
      expect(byId.get(id)).toMatchObject({
        owner: 'household', confirmation,
        channels: {
          mobile: { state: 'pending_provider', outcome: 'honest_boundary' },
          phone: { state: 'pending_provider', outcome: 'honest_boundary' },
        },
      });
    }
  });
});
