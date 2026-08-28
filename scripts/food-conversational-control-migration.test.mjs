import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  new URL('../supabase/migrations/20260827221500_food_conversational_control.sql', import.meta.url),
  'utf8',
);

test('meal preferences have an exact version and preserve the native four-argument RPC', () => {
  assert.match(sql, /add column if not exists version integer not null default 1/);
  assert.match(sql, /set_kwilt_meal_planner_preferences\(\s*p_household_id uuid,\s*p_usual_diner_person_ids uuid\[\],\s*p_usual_diner_count integer,\s*p_setup_state text/s);
  assert.match(sql, /version = public\.kwilt_meal_planner_preferences\.version \+ 1/);
});

test('conversational preference writes enforce household authority, exact version, and idempotency', () => {
  assert.match(sql, /update_kwilt_meal_preferences_conversational/);
  assert.match(sql, /kwilt_can_manage_meal_preferences\(p_household_id\)/);
  assert.match(sql, /p_expected_version is distinct from v_current_version/);
  assert.match(sql, /kwilt_meal_preference_action_receipts/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /unique \(user_id, idempotency_key\)/);
});

test('meal preference receipts are owner-readable and cannot be forged by clients', () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /revoke insert, update, delete on public\.kwilt_meal_preference_action_receipts from public, anon, authenticated/);
});

test('reviewed food-need changes stay bounded and execute inside the same transaction', () => {
  assert.match(sql, /jsonb_array_length\(coalesce\(p_food_need_changes, '\[\]'::jsonb\)\) > 100/);
  assert.match(sql, /perform public\.set_kwilt_person_food_need/);
  assert.match(sql, /raise exception 'invalid_food_need_change'/);
});

test('the server snapshot binds the caller and exposes only bounded preference projections', () => {
  assert.match(sql, /get_kwilt_agent_food_control_snapshot\(p_user_id uuid\)/);
  assert.match(sql, /if v_user_id <> p_user_id then raise exception 'food_snapshot_actor_mismatch'/);
  assert.match(sql, /'recipeFavorites'/);
  assert.match(sql, /'hiddenRecipes'/);
  assert.match(sql, /'recipeImportDrafts'/);
  assert.match(sql, /candidate\.state in \('extracting','needs_review'\).*limit 20/s);
  assert.match(sql, /'recipes'/);
  assert.match(sql, /public\.kwilt_can_read_recipe\(recipe\.id\)/);
  assert.match(sql, /order by candidate\.updated_at desc limit 200/);
  assert.match(sql, /'scalingState', version_row\.scaling_state/);
  assert.match(sql, /'scaleRule', ingredient\.scale_rule/);
  assert.match(sql, /'equipmentRequirements'/);
  assert.match(sql, /'mealPreferences'/);
  assert.match(sql, /'mealPlans'/);
  assert.match(sql, /'mealChoiceRounds'/);
  assert.match(sql, /'foodStock'/);
  assert.match(sql, /'foodCycle'/);
  assert.match(sql, /'groceryLists'/);
  assert.match(sql, /membership\.role in \('owner','caregiver'\)/);
  assert.match(sql, /revoke all on function public\.get_kwilt_agent_food_control_snapshot\(uuid\) from public, anon, authenticated/);
});

test('Recipe import approval is owner-bound, versioned, and replay-safe', () => {
  assert.match(sql, /alter table public\.kwilt_recipe_import_drafts[\s\S]*add column if not exists version integer not null default 1/);
  assert.match(sql, /approve_kwilt_recipe_import_conversational/);
  assert.match(sql, /v_draft\.owner_person_id <> v_person_id/);
  assert.match(sql, /v_draft\.approval_idempotency_key = p_idempotency_key/);
  assert.match(sql, /v_draft\.version is distinct from p_expected_draft_version/);
  assert.match(sql, /set version = version \+ 1/);
});

test('Cook Session actions preserve exact revisions and idempotent receipts', () => {
  assert.match(sql, /kwilt_cook_session_action_receipts/);
  assert.match(sql, /unique \(user_id, idempotency_key\)/);
  assert.match(sql, /apply_kwilt_cook_session_conversational/);
  assert.match(sql, /public\.sync_kwilt_recipe_cook_session\(p_session, p_expected_revision\)/);
  assert.match(sql, /receipt\.result \|\| jsonb_build_object\('replayed', true\)/);
  assert.match(sql, /'cookSessions'/);
  assert.match(sql, /candidate\.owner_person_id = v_person_id[\s\S]*limit 20/);
});

test('Recipe collaborator invites are owner-bound, versioned, and replay-safe', () => {
  assert.match(sql, /create table if not exists public\.kwilt_recipe_collaboration_action_receipts/i);
  assert.match(sql, /create or replace function public\.invite_kwilt_recipe_collaborator_conversational\([\s\S]*p_expected_version integer[\s\S]*p_idempotency_key text/i);
  assert.match(sql, /v_recipe\.owner_person_id <> v_actor_person_id/i);
  assert.match(sql, /v_current_version is distinct from p_expected_version/i);
  assert.match(sql, /on conflict \(recipe_id, grantee_person_id\)/i);
  assert.match(sql, /revoke insert, update, delete on public\.kwilt_recipe_collaboration_action_receipts from public, anon, authenticated/i);
});

test('Meal Plan conversational writes are exact-version and idempotent', () => {
  assert.match(sql, /create table if not exists public\.kwilt_meal_plan_action_receipts/i);
  assert.match(sql, /create or replace function public\.apply_kwilt_meal_plan_conversational\([\s\S]*p_operation_id text[\s\S]*p_expected_version integer[\s\S]*p_idempotency_key text[\s\S]*p_payload jsonb/i);
  assert.match(sql, /meal_plan_idempotency_conflict/i);
  assert.match(sql, /public\.create_kwilt_meal_plan\(/i);
  assert.match(sql, /public\.update_kwilt_meal_plan\(/i);
  assert.match(sql, /raise exception 'meal_candidate_not_found'/i);
  assert.match(sql, /raise exception 'meal_candidate_id_exists'/i);
  assert.match(sql, /raise exception 'meal_candidate_recipe_exists'/i);
  assert.match(sql, /alter column household_id drop not null[\s\S]*alter column organizer_membership_id drop not null/i);
  assert.match(sql, /create or replace function public\.kwilt_is_meal_plan_organizer[\s\S]*plan\.organizer_person_id/i);
  assert.match(sql, /create or replace function public\.create_kwilt_meal_plan[\s\S]*p_household_id is null/i);
  assert.match(sql, /'meal_planning\.round\.open'/i);
  assert.match(sql, /'meal_planning\.response\.submit'/i);
  assert.match(sql, /public\.revise_kwilt_meal_plan\(/i);
  assert.match(sql, /finalize_kwilt_personal_meal_plan_conversational/i);
  assert.match(sql, /'meal_planning\.plan\.finalize'/i);
  assert.match(sql, /v_plan\.household_id is null[\s\S]*finalize_kwilt_personal_meal_plan_conversational/i);
});

test('Food Stock conversational writes are owner-bound, exact, and replay-safe', () => {
  assert.match(sql, /create table if not exists public\.kwilt_food_stock_action_receipts/i);
  assert.match(sql, /unique \(user_id, idempotency_key\)/i);
  assert.match(sql, /create or replace function public\.apply_kwilt_food_stock_conversational\([\s\S]*p_expected_observation_id uuid[\s\S]*p_idempotency_key text/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(v_person_id::text \|\| ':' \|\| lower\(v_concept\)/i);
  assert.match(sql, /p_expected_observation_id is distinct from v_current\.id/i);
  assert.match(sql, /public\.observe_kwilt_food_stock\(v_observation\)/i);
  assert.match(sql, /food_stock_idempotency_conflict/i);
  assert.match(sql, /revoke insert, update, delete on public\.kwilt_food_stock_action_receipts from public, anon, authenticated/i);
});

test('Grocery item conversational writes preserve exact revisions, provenance, and replay receipts', () => {
  assert.match(sql, /create table if not exists public\.kwilt_grocery_list_action_receipts/i);
  assert.match(sql, /create or replace function public\.apply_kwilt_grocery_list_conversational\([\s\S]*p_expected_revision integer[\s\S]*p_idempotency_key text/i);
  assert.match(sql, /public\.add_kwilt_grocery_item\(p_target_id,p_expected_revision,p_payload->>'title'\)/i);
  assert.match(sql, /set kind='household_request'[\s\S]*request_id=btrim\(p_idempotency_key\)/i);
  assert.match(sql, /public\.update_kwilt_grocery_item\(p_target_id,p_expected_revision/i);
  assert.match(sql, /public\.set_kwilt_grocery_item_state\(p_target_id,p_expected_revision,v_state\)/i);
  assert.match(sql, /grocery_list_idempotency_conflict/i);
  assert.match(sql, /revoke insert, update, delete on public\.kwilt_grocery_list_action_receipts from public, anon, authenticated/i);
});
