-- Isolated SQL unit harness ONLY. This is not a full Supabase schema or a
-- migration-chain test. Canonical authority delegates are loaded from source
-- when practical; snapshot/catalog projections use actor-checking stubs.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key,is_anonymous boolean default false,deleted_at timestamptz,banned_until timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
create table public.kwilt_people(id uuid primary key,display_name text);
create table public.kwilt_person_auth_bindings(user_id uuid,person_id uuid,status text);
create table public.kwilt_household_memberships(id uuid primary key,household_id uuid,person_id uuid,status text,role text,joined_at timestamptz default now());
create table public.kwilt_meal_plans(id uuid primary key default gen_random_uuid(),household_id uuid,organizer_person_id uuid,organizer_membership_id uuid,version integer default 1,state text default 'draft',horizon jsonb,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.kwilt_meal_plan_candidates(id uuid primary key,plan_id uuid,position integer,kind text,title text,recipe_snapshot jsonb,suggested_by_person_id uuid,lifecycle_state text default 'idea',created_at timestamptz default now(),sent_at timestamptz,sent_by_person_id uuid,resolved_at timestamptz,resolved_by_person_id uuid,removed_grocery_behavior text,lifecycle_updated_at timestamptz default now());
create table public.kwilt_meal_choice_rounds(id uuid,plan_id uuid,version integer,state text,closes_at timestamptz,opened_at timestamptz);
create table public.kwilt_meal_candidate_reactions(candidate_id uuid,person_id uuid);
create table public.kwilt_recipes(id uuid primary key,lifecycle text default 'active',owner_person_id uuid);
create table public.kwilt_recipe_versions(id uuid primary key,recipe_id uuid,content_hash text,scaling_state text);
create table public.kwilt_recipe_ingredients(id uuid,recipe_version_id uuid,original_text text,optional boolean);
create table public.kwilt_grocery_lists(id uuid primary key default gen_random_uuid(),owner_person_id uuid,source_kind text,source_household_id uuid,source_meal_plan_id uuid,source_meal_plan_version integer,revision integer default 1,status text default 'review_needed',payload_hash text,rebased_from_list_id uuid,rebased_from_revision integer,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.kwilt_grocery_items(id uuid primary key default gen_random_uuid(),grocery_list_id uuid,position integer,concept text,quantity_min numeric,quantity_max numeric,unit text,package_quantity numeric,package_unit text,preparation text,optional boolean,aisle text,original_display_texts jsonb,review_reason text,state text default 'needed',note text,updated_at timestamptz default now());
create table public.kwilt_grocery_item_sources(id uuid primary key default gen_random_uuid(),grocery_item_id uuid,kind text,recipe_version_id uuid,ingredient_line_id uuid,source_snapshot jsonb,note_id text,request_id text,requested_by_person_id uuid,plan_candidate_id uuid,contribution_quantity_min numeric,contribution_quantity_max numeric,contribution_unit text,contribution_optional boolean);
create table public.kwilt_grocery_item_corrections(id uuid primary key default gen_random_uuid(),grocery_item_id uuid,grocery_list_revision integer,corrected_by_person_id uuid,before_value jsonb,after_value jsonb,reason text,created_at timestamptz default now());
create table public.kwilt_grocery_rebase_conflicts(id uuid primary key default gen_random_uuid(),owner_person_id uuid,from_list_id uuid,to_list_id uuid,from_item_id uuid,kind text,proposed_delta jsonb,unique(to_list_id,from_item_id,kind));
create table public.kwilt_external_execution_receipts(id uuid primary key,user_id uuid,oauth_client_id text,request_id text,operation_id text,arguments jsonb,result jsonb,before_state jsonb,unique(user_id,oauth_client_id,request_id));
create table public.kwilt_agent_proposals(id uuid primary key,user_id uuid,status text,version integer,updated_at timestamptz,permission_policy jsonb);
create table public.kwilt_external_capture_log(user_id uuid,oauth_client_id text,object_id text,object_type text,idempotency_key_hash text);
create function public.kwilt_require_permanent_user() returns uuid language plpgsql as $$ begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'permanent_user_required'; end if;
  return auth.uid(); end $$;
create function public.kwilt_current_person_id() returns uuid language sql stable as $$ select person_id from public.kwilt_person_auth_bindings where user_id=auth.uid() and status='active' $$;
create function public.kwilt_shared_meal_cart_membership(uuid) returns setof public.kwilt_household_memberships language sql stable as $$ select * from public.kwilt_household_memberships where household_id=$1 and person_id=public.kwilt_current_person_id() and status='active' $$;
create function public.kwilt_can_access_shared_meal_cart(uuid) returns boolean language sql stable as $$ select exists(select 1 from public.kwilt_meal_plans p join public.kwilt_household_memberships m on m.household_id=p.household_id where p.id=$1 and m.person_id=public.kwilt_current_person_id() and m.status='active') $$;
create function public.kwilt_can_manage_household_plan(uuid) returns boolean language sql stable as $$ select exists(select 1 from public.kwilt_meal_plans p join public.kwilt_household_memberships m on m.household_id=p.household_id where p.id=$1 and m.person_id=public.kwilt_current_person_id() and m.status='active' and m.role in ('owner','caregiver')) $$;
create function public.kwilt_can_use_recipe_version(uuid,uuid) returns boolean language sql stable as $$ select exists(select 1 from public.kwilt_recipes r join public.kwilt_recipe_versions v on v.recipe_id=r.id where r.id=$1 and v.id=$2 and r.owner_person_id=public.kwilt_current_person_id() and r.lifecycle<>'deleted') $$;
create function public.kwilt_can_read_grocery_list(uuid) returns boolean language sql stable as $$ select exists(select 1 from public.kwilt_grocery_lists l where l.id=$1 and (l.owner_person_id=public.kwilt_current_person_id() or public.kwilt_can_access_shared_meal_cart(l.source_meal_plan_id))) $$;
create function public.kwilt_validate_meal_horizon(jsonb) returns void language plpgsql as $$ begin if $1->>'kind'<>'open' then raise exception 'invalid_horizon'; end if; end $$;
create function public.kwilt_replace_meal_candidates(uuid,jsonb,uuid) returns void language plpgsql as $$ begin if $2<>'[]'::jsonb then raise exception 'fixture_disallows_replacement'; end if; end $$;
create function public.get_kwilt_agent_food_control_snapshot(uuid) returns jsonb language plpgsql as $$ begin
  if $1<>public.kwilt_require_permanent_user() then raise exception 'food_snapshot_actor_mismatch'; end if;
  return jsonb_build_object('actorPersonId',public.kwilt_current_person_id(),'mealPlans','[]'::jsonb); end $$;
create function public.list_kwilt_recipe_catalog_v2(text,integer) returns table(projection jsonb) language plpgsql as $$ begin
  perform public.kwilt_require_permanent_user(); return query select jsonb_build_object('actor',auth.uid()); end $$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant all on all tables in schema public,auth to service_role;
grant select on all tables in schema public to authenticated;
grant execute on all functions in schema public,auth to service_role,authenticated;
alter table kwilt_meal_plan_candidates add column hard_pass_overridden_at timestamptz, add column hard_pass_overridden_by_person_id uuid;
alter table kwilt_meal_candidate_reactions add column reaction text, add column created_at timestamptz default now();
create table public.kwilt_grocery_list_action_receipts(id uuid primary key default gen_random_uuid(),user_id uuid,operation_id text,idempotency_key text,request_hash text,result jsonb,unique(user_id,idempotency_key));
create schema extensions;
-- Unit-only deterministic hash stub; cryptographic implementation is not under test.
create function extensions.digest(text,text) returns bytea language sql immutable as $$ select decode(md5($1),'hex') $$;
grant usage on schema extensions to service_role;
grant all on all tables in schema public to service_role;
create table public.kwilt_meal_plan_action_receipts(id uuid primary key default gen_random_uuid(),user_id uuid,operation_id text,idempotency_key text,request_hash text,result jsonb,unique(user_id,idempotency_key));
grant all on public.kwilt_meal_plan_action_receipts to service_role;
