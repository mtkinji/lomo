-- Extend Shared Home from action delivery into a closed, recipient-only
-- envelope for intentionally shared Goal content.

alter table public.kwilt_shared_deliveries
  drop constraint if exists kwilt_shared_deliveries_event_kind_check,
  drop constraint if exists kwilt_shared_deliveries_source_capability_check,
  drop constraint if exists kwilt_shared_deliveries_source_entity_type_check,
  drop constraint if exists kwilt_shared_deliveries_state_check,
  drop constraint if exists kwilt_shared_deliveries_body_length,
  drop constraint if exists kwilt_shared_deliveries_destination_kind;

alter table public.kwilt_shared_deliveries
  add constraint kwilt_shared_deliveries_event_kind_check
    check (event_kind in ('goal_invitation', 'game_turn', 'goal_checkin')),
  add constraint kwilt_shared_deliveries_source_capability_check
    check (source_capability in ('goals', 'games')),
  add constraint kwilt_shared_deliveries_source_entity_type_check
    check (source_entity_type in ('goal_invite', 'game_session', 'goal_checkin')),
  add constraint kwilt_shared_deliveries_state_check
    check (state in ('pending', 'available', 'settled', 'expired', 'unavailable')),
  add constraint kwilt_shared_deliveries_body_length
    check (char_length(body) between 1 and 500),
  add constraint kwilt_shared_deliveries_destination_kind check (
    (event_kind = 'goal_invitation'
      and source_capability = 'goals'
      and source_entity_type = 'goal_invite'
      and destination ->> 'kind' = 'goal_invite'
      and nullif(btrim(destination ->> 'inviteCode'), '') is not null)
    or
    (event_kind = 'game_turn'
      and source_capability = 'games'
      and source_entity_type = 'game_session'
      and destination ->> 'kind' = 'game_room'
      and nullif(btrim(destination ->> 'sessionId'), '') is not null)
    or
    (event_kind = 'goal_checkin'
      and source_capability = 'goals'
      and source_entity_type = 'goal_checkin'
      and state = 'available'
      and destination ->> 'kind' = 'goal'
      and nullif(btrim(destination ->> 'goalId'), '') is not null)
  );

comment on table public.kwilt_shared_deliveries is
  'Recipient-only projection of intentionally shared, capability-owned Kwilt content and actions.';
