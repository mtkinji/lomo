import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260728190000_household_foundation.sql',
);
const mealCountMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/pending-migrations/20260817180341_add_usual_diner_count.sql',
), 'utf8');

describe('Household foundation migration', () => {
  const migration = readFileSync(migrationPath, 'utf8');

  it('defines canonical family identities, memberships, authorization, and audit state', () => {
    for (const table of [
      'kwilt_people',
      'kwilt_person_auth_bindings',
      'kwilt_households',
      'kwilt_household_memberships',
      'kwilt_child_capability_catalog',
      'kwilt_child_capability_activations',
      'kwilt_household_capability_grants',
      'kwilt_household_invites',
      'kwilt_household_audit_events',
    ]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('keeps child activation independent by household, child, and capability', () => {
    expect(migration).toContain(
      'unique (household_id, child_membership_id, capability_id)',
    );
    expect(migration).toContain("check (state in ('inactive', 'pending_setup', 'active', 'pending_cleanup', 'blocked'))");
    expect(migration).toContain("('todos', 'To-dos', true)");
    expect(migration).toContain("('screen-time', 'Screen Time', true)");
    expect(migration).not.toContain('activate_all_children');
  });

  it('exposes only narrow authenticated Household commands', () => {
    for (const rpc of [
      'get_kwilt_household_snapshot',
      'add_kwilt_dependent',
      'set_kwilt_child_capability_activation',
      'set_kwilt_household_capability_grant',
      'create_kwilt_household_invite',
      'accept_kwilt_household_invite',
      'remove_kwilt_household_member',
    ]) {
      expect(migration).toContain(`create or replace function public.${rpc}`);
      expect(migration).toMatch(new RegExp(
        `create or replace function public\\.${rpc}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
      ));
      expect(migration).toMatch(new RegExp(
        `revoke execute on function public\\.${rpc}\\([^;]*from public, anon;`,
      ));
      expect(migration).toMatch(new RegExp(
        `grant execute on function public\\.${rpc}\\([^;]*to authenticated;`,
      ));
    }
  });

  it('requires a permanent authenticated user for every authority-changing path', () => {
    expect(migration).toContain("auth.jwt()->>'is_anonymous'");
    expect(migration).toContain("raise exception 'authentication_required'");
    expect(migration).toContain("raise exception 'household_owner_required'");
    expect(migration).toContain("raise exception 'capability_grant_required'");
  });

  it('prevents app clients from mutating family tables directly', () => {
    expect(migration).toContain('revoke insert, update, delete on public.kwilt_people from anon, authenticated');
    expect(migration).toContain('revoke insert, update, delete on public.kwilt_household_memberships from anon, authenticated');
    expect(migration).toContain('revoke insert, update, delete on public.kwilt_child_capability_activations from anon, authenticated');
    expect(migration).toContain('revoke insert, update, delete on public.kwilt_household_capability_grants from anon, authenticated');
    expect(migration).toContain('revoke insert, update, delete on public.kwilt_household_audit_events from anon, authenticated');
  });

  it('limits activation and grant metadata to the owner or explicitly involved members', () => {
    expect(migration).toContain('create or replace function public.kwilt_can_view_child_capability');
    expect(migration).toContain('grant_row.caregiver_membership_id = v_actor.id');
    expect(migration).toContain('grant_row.child_membership_id = p_child_membership_id');
    expect(migration).toContain(
      'public.kwilt_can_view_child_capability(household_id, child_membership_id, capability_id)',
    );
    expect(migration).toContain(
      'public.kwilt_can_view_capability_grant(household_id, caregiver_membership_id, child_membership_id)',
    );
  });

  it('records authority-changing operations in the audit stream', () => {
    for (const eventType of [
      'dependent_added',
      'child_capability_changed',
      'capability_grant_changed',
      'caregiver_invited',
      'caregiver_joined',
      'member_removed',
    ]) {
      expect(migration).toContain(`'${eventType}'`);
    }
  });
});

describe('Household meal count migration', () => {
  it('adds a bounded count and preserves the authority command boundary', () => {
    expect(mealCountMigration).toContain('add column usual_diner_count integer');
    expect(mealCountMigration).toContain('usual_diner_count between 1 and 20');
    expect(mealCountMigration).toContain('cardinality(usual_diner_person_ids)');
    expect(mealCountMigration).toContain('p_usual_diner_count integer');
    expect(mealCountMigration).toContain("raise exception 'invalid_usual_diner_count'");
    expect(mealCountMigration).toContain("perform public.kwilt_require_permanent_user()");
    expect(mealCountMigration).toContain('public.kwilt_can_manage_meal_preferences(p_household_id)');
    expect(mealCountMigration).toMatch(/revoke execute on function public\.set_kwilt_meal_planner_preferences\(uuid, uuid\[\], integer, text\) from public, anon;/);
    expect(mealCountMigration).toMatch(/grant execute on function public\.set_kwilt_meal_planner_preferences\(uuid, uuid\[\], integer, text\) to authenticated;/);
  });

  it('keeps the released command compatible with older installed app versions', () => {
    expect(mealCountMigration).not.toContain('drop function public.set_kwilt_meal_planner_preferences(uuid, uuid[], text)');
    expect(mealCountMigration).toContain('greatest(');
    expect(mealCountMigration).toMatch(/revoke execute on function public\.set_kwilt_meal_planner_preferences\(uuid, uuid\[\], text\) from public, anon;/);
    expect(mealCountMigration).toMatch(/grant execute on function public\.set_kwilt_meal_planner_preferences\(uuid, uuid\[\], text\) to authenticated;/);
  });
});
