# Credit Velocity Metrics - Testing Guide

## What Was Implemented

Credit spending velocity metrics have been added to the Super Admin Tools to track how quickly users consume AI credits. This helps assess user engagement and value realization.

### New Metrics (7-day window)

1. **Credits per active day** - Total credits ÷ days with at least 1 credit spent (intensity when active)
2. **Credits per calendar day** - Total credits ÷ 7 days (overall burn rate)

### New Metrics (current month)

3. **Credits this month** - Total credits spent in current month
4. **Days since first credit** - Days elapsed from month start to first credit spent
5. **Days since last credit** - Days since most recent credit spent

## Files Changed

1. **Database**: `supabase/migrations/20260107000020_kwilt_admin_use_summary_credit_velocity.sql`
   - Extended `kwilt_admin_use_summary` RPC function with credit calculations

2. **TypeScript Types**: `src/services/kwiltUsersDirectory.ts`
   - Added 5 new fields to `DirectoryUseSummary` type

3. **UI**: `src/features/account/SuperAdminToolsScreen.tsx`
   - Added display fields in the "Use" tab after "AI actions (7d)"

## Testing Instructions

### 1. Deploy the Migration

Apply the new migration to your Supabase instance:

```bash
# Local testing
npx supabase start
npx supabase db reset

# Production deployment
npx supabase link
npx supabase db push
```

### 2. Deploy the Edge Function

The `/admin/use-summary` endpoint in the `pro-codes` Edge Function should automatically pass through the new fields. No code changes needed, but redeploy to ensure it's using the latest RPC function:

```bash
npx supabase functions deploy pro-codes
```

### 3. Test Cases

Open Super Admin Tools in the app and test with various user profiles:

#### Test Case 1: No Credits Spent
- **User**: Someone who has never used AI features
- **Expected**: All credit metrics show "—" or 0

#### Test Case 2: Sporadic Usage
- **User**: Someone who used credits on 2-3 days out of 7
- **Expected**:
  - `credits_per_active_day_7d` > `credits_per_calendar_day_7d`
  - Both should show decimal values (e.g., "3.5")
  - `days_since_last_credit` should be recent (0-2 days)

#### Test Case 3: Daily Active User
- **User**: Someone who uses AI every day
- **Expected**:
  - `credits_per_active_day_7d` ≈ `credits_per_calendar_day_7d`
  - Both should be similar values
  - `days_since_last_credit` should be 0 or 1

#### Test Case 4: New Month / First Credit
- **User**: Just started using credits this month
- **Expected**:
  - `days_since_first_credit_this_month` should be 0-3 days
  - `credits_this_month` should match recent usage

#### Test Case 5: Inactive User
- **User**: Used credits weeks/months ago but not recently
- **Expected**:
  - `credits_per_active_day_7d` and `credits_per_calendar_day_7d` show 0 or "—"
  - `days_since_last_credit` should be large number (30+, 60+, etc.)
  - `credits_this_month` should be 0

### 4. Validation Queries

You can manually validate calculations against the database:

```sql
-- Check 7-day credit totals for a specific install
SELECT 
  SUM(count) as total_credits_7d,
  COUNT(*) FILTER (WHERE count > 0) as active_days
FROM kwilt_ai_usage_daily 
WHERE quota_key = 'install:YOUR_INSTALL_ID_HERE'
  AND day >= CURRENT_DATE - INTERVAL '7 days';

-- Check monthly credits
SELECT 
  month,
  SUM(actions_count) as credits_this_month
FROM kwilt_ai_usage_monthly
WHERE quota_key = 'install:YOUR_INSTALL_ID_HERE'
  AND month = to_char(now() at time zone 'UTC', 'YYYY-MM')
GROUP BY month;

-- Check first and last credit dates
SELECT 
  MIN(day) as first_credit_day,
  MAX(day) as last_credit_day,
  CURRENT_DATE - MIN(day) as days_since_first,
  CURRENT_DATE - MAX(day) as days_since_last
FROM kwilt_ai_usage_daily
WHERE quota_key = 'install:YOUR_INSTALL_ID_HERE'
  AND count > 0;
```

### 5. UI Validation

In SuperAdminToolsScreen "Use" tab, verify:
- All metrics display correctly with proper formatting
- Decimal values show 1 decimal place (e.g., "2.3" not "2.333333")
- Day counts show "Xd ago" format
- Null values show "—"
- Zero values show "0" (not "—")

## Edge Cases to Watch

1. **Division by zero**: When `active_credit_days_7d = 0`, `credits_per_active_day_7d` should be `null` (shown as "—")
2. **Month rollover**: Users who started using credits last month should see `days_since_first_credit_this_month` reset for the new month
3. **No install IDs**: Users/installs without associated install IDs should handle gracefully (show "—")
4. **Large numbers**: Heavy Pro users with 100+ credits should display correctly without UI overflow

## Success Criteria

- [ ] Migration applies without errors
- [ ] All 5 new metrics display in SuperAdminToolsScreen "Use" tab
- [ ] Metrics calculate correctly for test cases 1-5
- [ ] UI formatting is clean and readable
- [ ] No TypeScript or linter errors
- [ ] Edge cases handle gracefully (no crashes or errors)

## Rollback Plan

If issues occur, you can rollback by:

1. Reverting the UI changes in `SuperAdminToolsScreen.tsx`
2. Reverting the type changes in `kwiltUsersDirectory.ts`
3. Restoring the previous version of the RPC function (or leaving the new one - it's backward compatible since it only adds columns)






