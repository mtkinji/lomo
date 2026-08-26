-- Kwilt: address Supabase Security Advisor findings for public tables/functions.
-- - Enable RLS on internal telemetry/referral tables that should only be touched via service role.
-- - Fix function search_path warnings by pinning all custom public functions to `public`.
-- - Ensure helper functions used by RLS behave correctly under RLS.

-- Internal tables used only via Edge Functions / service role.
alter table public.kwilt_ai_usage_daily enable row level security;
alter table public.kwilt_ai_usage_monthly enable row level security;
alter table public.kwilt_ai_requests enable row level security;
alter table public.kwilt_ai_usage_minutely enable row level security;
alter table public.kwilt_ai_usage_onboarding enable row level security;
alter table public.kwilt_ai_bonus_monthly enable row level security;
alter table public.kwilt_referrals enable row level security;
alter table public.kwilt_referral_redemptions enable row level security;

-- Pin function search_path so lookup resolution cannot be influenced by caller settings.
alter function public.kwilt_increment_ai_usage_daily(text, date) set search_path = public;
alter function public.kwilt_increment_ai_usage_monthly(text, text, integer, bigint) set search_path = public;
alter function public.kwilt_increment_ai_usage_minutely(text, timestamptz) set search_path = public;
alter function public.kwilt_increment_ai_usage_onboarding(text, integer) set search_path = public;
alter function public.kwilt_increment_ai_bonus_monthly(text, text, integer) set search_path = public;
alter function public.kwilt_try_uuid(text) set search_path = public;
alter function public.kwilt_hash_pro_code(text) set search_path = public;
alter function public.kwilt_redeem_pro_code(text, text) set search_path = public;
alter function public.kwilt_is_member(text, uuid, uuid) set search_path = public;
alter function public.kwilt_is_member(text, text, uuid) set search_path = public;
alter function public.kwilt_normalize_friendship_pair(uuid, uuid) set search_path = public;
alter function public.kwilt_are_friends(uuid, uuid) set search_path = public;
alter function public.kwilt_get_friend_ids(uuid) set search_path = public;
alter function public.kwilt_is_following(uuid, uuid) set search_path = public;
alter function public.kwilt_is_blocked(uuid, uuid) set search_path = public;
alter function public.kwilt_can_view_user_feed(uuid, uuid) set search_path = public;
alter function public.kwilt_admin_use_summary(uuid, text[], integer) set search_path = public;

-- The live/shared-goals policy path uses the text overload; make it match the later UUID fix.
alter function public.kwilt_is_member(text, text, uuid) security definer;

-- This helper must be able to see blocks where `target` blocked `viewer`, which ordinary RLS
-- on `kwilt_blocks` intentionally hides from `viewer`.
alter function public.kwilt_is_blocked(uuid, uuid) security definer;
