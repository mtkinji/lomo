-- Kwilt: referral codes + redemptions (install-based, pre-account).

create table if not exists public.kwilt_referrals (
  referral_code text primary key,
  inviter_quota_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_referrals_inviter_idx on public.kwilt_referrals(inviter_quota_key);

create table if not exists public.kwilt_referral_redemptions (
  referral_code text not null references public.kwilt_referrals(referral_code) on delete cascade,
  friend_quota_key text not null,
  redeemed_at timestamptz not null default now(),
  primary key (referral_code, friend_quota_key)
);

-- A friend install can only redeem once (prevents farming across multiple codes).
create unique index if not exists kwilt_referral_redemptions_friend_unique on public.kwilt_referral_redemptions(friend_quota_key);


