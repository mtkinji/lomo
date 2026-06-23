# Converge: Meaningful First App Access

## Scoring

- Daily Meaningful First: strongest V1 fit. It matches the Duolingo-style precedent while keeping Kwilt's version anchored to real Activities and Focus Sessions.
- Action Unlocks A Time Window: powerful later, but it introduces more rule management and can feel like screen-time currency.
- Scheduled Work Gate: elegant for calendar-heavy users, but too dependent on scheduling behavior for the first version.
- Shield As Reflection Prompt: humane but weak; it risks becoming another dismissible speed bump.
- User-Chosen Anchor Action: useful as setup flexibility, but should not displace a strong recommended default.

## Chosen alternative

Ship Option A: Daily Meaningful First, with a small amount of Option E's setup flexibility.

The user enables the mode from Focus Protection / Screen Time settings, chooses apps or categories to save for later, and accepts a recommended default: "Unlock after one meaningful move in Kwilt." V1 qualifying actions should be:

- Complete a Focus Session at or above the user's minimum duration.
- Complete an Activity.
- Record real progress on an Activity.

Creating an Activity, opening Today, browsing AI chat, editing settings, or viewing a screen should not qualify by default. Those actions may be useful, but they are not enough to justify unlocking distracting apps.

## User-facing model

The user should think:

```text
I can open these apps after I make real progress in Kwilt.
```

Not:

```text
Kwilt is rewarding me with screen time.
```

The shield should sound like an agreement the user made with themself:

```text
Do one thing first.
Make real progress in Kwilt. Then this app opens for the day.
```

## Accepted trade-offs

- The first version is iOS-first because it depends on Screen Time APIs.
- Unlocking for the rest of the day is simpler than repeated access windows, but may be too loose for heavy doomscrolling.
- Qualifying actions must be stricter than existing streak-qualifying actions so the feature does not become an engagement hack.
- Bypass must exist because the user owns the device and legitimate needs will happen.
- Shield customization and parent-app launch behavior must be verified in the current iOS API before final implementation.

## Rejected trade-offs

- Do not call this Focus Mode; Kwilt already uses Focus for work sessions.
- Do not require Arc/Goal selection before a qualifying action.
- Do not count app opens, passive views, AI chats with no saved output, or settings edits as qualifying actions.
- Do not show a self-control score, streak warning, or "you failed" state.
- Do not make the feature impossible to override.

## Stated bet

We're betting that Marcus will welcome a self-authored daily gate if it protects his first meaningful move without making Kwilt feel punitive. If the gate feels too weak, we revisit access windows. If it feels too coercive, we simplify toward a shield prompt that opens Kwilt without requiring completion.

## Success signal

Users enable the gate, complete setup, perform a meaningful Kwilt action before unlocking selected apps, and continue using Kwilt without disabling the feature quickly. Important safety signals are bypass rate, disable rate, setup abandonment, shield complaints, and whether qualifying actions remain high-quality rather than token taps.
