# Notification analytics (no server)

Kwilt’s MVP uses **local notifications** via `expo-notifications`. Without a server, iOS/Android do **not** provide a reliable “delivered” callback while the app is backgrounded or terminated. We therefore track:

- **scheduled**: what we asked the OS to schedule
- **opened**: when the user taps the notification (reliable)
- **received (foreground only)**: when a notification arrives while the app is open
- **fired (estimated)**: best-effort estimate that a scheduled notification has fired (background fetch + app launch reconciliation)

## Event names

- `notification_scheduled`
- `notification_cancelled`
- `notification_received` (foreground only)
- `notification_opened`
- `notification_fired_estimated` (best-effort)

All events include `notification_type` which is one of:
- `activityReminder`
- `dailyShowUp`
- `streak`
- `reactivation`

## How fired estimation works

### Activity reminders (one-shot)
When an `activityReminder` is scheduled we persist a ledger entry in `AsyncStorage` keyed by `activityId`. Periodically (and on app launch) we:

1. Fetch `Notifications.getAllScheduledNotificationsAsync()`
2. If the scheduled time is in the past and the request is no longer scheduled, we emit `notification_fired_estimated`

### Daily show-up (repeating)
Repeating notifications don’t disappear from the scheduled list after firing, so we estimate once per day:

- If local time is past `dailyShowUpTime` and we haven’t marked today, emit `notification_fired_estimated` and store `lastFiredDateKey`.

## Background fetch requirements

Background fetch requires a **development build / production build**. It is **not reliable in Expo Go**.

Kwilt registers a background fetch task (`kwilt-notification-reconcile-v1`) in `NotificationService.init()` using `expo-task-manager` + `expo-background-fetch`.

## Quick validation

1. Enable notifications
2. Schedule a reminder (add `reminderAt` to an activity) or daily show-up
3. Use PostHog **Live events**:
   - confirm `notification_scheduled`
   - tap the notification → confirm `notification_opened`
   - after the scheduled time passes, confirm `notification_fired_estimated` (may arrive on next launch if background fetch doesn’t run)


