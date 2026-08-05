import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260805042407_index_shared_experience_foreign_keys.sql',
);

describe('Shared experience foreign-key indexes migration', () => {
  const migration = readFileSync(migrationPath, 'utf8').toLowerCase();

  it('indexes the Games relationship columns used for joins and cleanup', () => {
    for (const indexName of [
      'game_actions_actor_user_id_idx',
      'game_actions_participant_id_idx',
      'game_invites_claimed_by_idx',
      'game_invites_created_by_idx',
      'game_invites_participant_id_idx',
      'game_saved_players_linked_user_id_idx',
      'game_sessions_host_user_id_idx',
    ]) {
      expect(migration).toContain(`create index if not exists ${indexName}`);
    }
  });

  it('indexes the Household relationship columns used for joins and cleanup', () => {
    for (const indexName of [
      'kwilt_household_audit_events_actor_membership_id_idx',
      'kwilt_household_audit_events_household_id_idx',
      'kwilt_household_audit_events_subject_membership_id_idx',
      'kwilt_household_capability_grants_capability_id_idx',
      'kwilt_household_capability_grants_caregiver_membership_id_idx',
      'kwilt_household_capability_grants_child_membership_id_idx',
      'kwilt_household_capability_grants_granted_by_membership_id_idx',
      'kwilt_household_invites_accepted_by_membership_id_idx',
      'kwilt_household_invites_created_by_membership_id_idx',
      'kwilt_household_invites_household_id_idx',
      'kwilt_household_memberships_person_id_idx',
      'kwilt_households_created_by_user_id_idx',
      'kwilt_people_created_by_user_id_idx',
    ]) {
      expect(migration).toContain(`create index if not exists ${indexName}`);
    }
  });
});
