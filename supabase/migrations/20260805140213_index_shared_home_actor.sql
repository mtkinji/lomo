-- Cover the nullable actor foreign key for auth-user deletion and joins.
create index kwilt_shared_deliveries_actor_user_id_idx
  on public.kwilt_shared_deliveries(actor_user_id);
