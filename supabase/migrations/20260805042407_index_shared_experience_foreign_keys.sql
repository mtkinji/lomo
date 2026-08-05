-- Keep relationship joins and cascading cleanup predictable as shared Games and
-- Household history grows. PostgreSQL does not index foreign keys automatically.

create index if not exists game_actions_actor_user_id_idx
  on public.game_actions (actor_user_id);
create index if not exists game_actions_participant_id_idx
  on public.game_actions (participant_id);

create index if not exists game_invites_claimed_by_idx
  on public.game_invites (claimed_by);
create index if not exists game_invites_created_by_idx
  on public.game_invites (created_by);
create index if not exists game_invites_participant_id_idx
  on public.game_invites (participant_id);

create index if not exists game_saved_players_linked_user_id_idx
  on public.game_saved_players (linked_user_id);

create index if not exists game_sessions_host_user_id_idx
  on public.game_sessions (host_user_id);

create index if not exists kwilt_household_audit_events_actor_membership_id_idx
  on public.kwilt_household_audit_events (actor_membership_id);
create index if not exists kwilt_household_audit_events_household_id_idx
  on public.kwilt_household_audit_events (household_id);
create index if not exists kwilt_household_audit_events_subject_membership_id_idx
  on public.kwilt_household_audit_events (subject_membership_id);

create index if not exists kwilt_household_capability_grants_capability_id_idx
  on public.kwilt_household_capability_grants (capability_id);
create index if not exists kwilt_household_capability_grants_caregiver_membership_id_idx
  on public.kwilt_household_capability_grants (caregiver_membership_id);
create index if not exists kwilt_household_capability_grants_child_membership_id_idx
  on public.kwilt_household_capability_grants (child_membership_id);
create index if not exists kwilt_household_capability_grants_granted_by_membership_id_idx
  on public.kwilt_household_capability_grants (granted_by_membership_id);

create index if not exists kwilt_household_invites_accepted_by_membership_id_idx
  on public.kwilt_household_invites (accepted_by_membership_id);
create index if not exists kwilt_household_invites_created_by_membership_id_idx
  on public.kwilt_household_invites (created_by_membership_id);
create index if not exists kwilt_household_invites_household_id_idx
  on public.kwilt_household_invites (household_id);

create index if not exists kwilt_household_memberships_person_id_idx
  on public.kwilt_household_memberships (person_id);

create index if not exists kwilt_households_created_by_user_id_idx
  on public.kwilt_households (created_by_user_id);

create index if not exists kwilt_people_created_by_user_id_idx
  on public.kwilt_people (created_by_user_id);
