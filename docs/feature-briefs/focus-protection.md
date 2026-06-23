---
id: brief-focus-protection
title: Focus Protection
status: draft
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-focus-mode-education]
owner: andrew
last_updated: 2026-06-19
---

# Focus Protection

## Context

Focus Sessions already help a user turn an Activity into a bounded period of work, but the device around that session can still pull the user away through social apps, notifications, entertainment loops, and habitual switching. Focus Protection gives users an optional way to configure device-level protections once, then have Kwilt apply them automatically during normal Focus Sessions.

## Target audience

`audience-burned-out-productivity-power-users` needs help moving the few things that matter without maintaining another system. Focus Protection matters for this audience because the value is not a new productivity workflow; it is a quieter environment around a Focus Session they already chose to start.

## Representative persona

Marcus has a concrete Activity in front of him and wants enough support to stay with it. He has tried strict productivity systems before, so Focus Protection must feel optional, reversible, and quiet rather than moralizing or configuration-heavy.

## Aspirational design challenge

How might we help Marcus enter a quieter work environment when he starts a Focus Session, while preserving one Focus concept, configure-once simplicity, and trust that protections will always clear?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Focus Protection serves Marcus by making the execution environment stronger for the small number of commitments he actually wants to move.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter` names "Decide what to do next" as a step with a delivery score of 3. Focus Protection strengthens the Focus action inside that step, then supports "Capture progress without maintaining the system" by applying and clearing protections without repeated user setup.

## JTBD framing

When Marcus starts a Focus Session, he wants Kwilt to reduce the distractions most likely to pull him away, so the intention can become trusted follow-through instead of another item he meant to do. The work serves `jtbd-move-the-few-things-that-matter` by protecting meaningful work, `jtbd-carry-intentions-into-action` by lowering the activation energy from intention to session, and `jtbd-trust-this-app-with-my-life` because device-level restrictions require transparency, permission clarity, and reliable cleanup.

## Design

Focus Protection is not a separate session type. Users only start normal Focus Sessions. If Focus Protection is enabled, Kwilt applies the configured protection providers when the session begins and removes them when the session ends, is canceled, expires, or needs recovery cleanup.

Settings location:

```text
Settings
  Focus
    Screen Time Protection
      Focus Sessions
```

Initial Settings state:

```text
Focus Sessions
Reduce distractions during focus sessions.
Status: Off
[ Enable ]
```

Enable intro:

```text
Focus Protection
Kwilt can help create a more focused work environment.

When a focus session starts, Kwilt can:
- Reduce interruptions
- Silence distractions
- Restrict selected apps

[ Continue ]
```

After the user continues, Kwilt requests required permissions, presents the native Screen Time selection flow, saves the selected restrictions, and marks setup completed. Completed Settings state:

```text
Focus Sessions
Status: On
Manage Settings >
```

The MVP provider is Screen Time restrictions. The user chooses apps, websites, or categories through Apple's Screen Time selection UI, which uses opaque tokens rather than exposing app choices to Kwilt directly. Kwilt stores the selected token payload, applies restrictions at Focus Session start, and clears restrictions at Focus Session end/cancel/expiry. The first version should prefer system-default shielding unless custom shield copy is required for App Review or trust.

Implementation shape:

```ts
interface FocusProtectionSettings {
  enabled: boolean;
  screenTimeEnabled: boolean;
  restrictedApps: AppToken[];
  restrictedCategories: CategoryToken[];
  setupCompleted: boolean;
  lastUpdated: string;
}

interface FocusProtectionProvider {
  id: 'screenTime' | 'notifications' | 'appleFocus' | 'websites';
  apply(sessionId: string): Promise<FocusProtectionResult>;
  remove(sessionId: string): Promise<FocusProtectionResult>;
  reconcile?(sessionId: string | null): Promise<FocusProtectionResult>;
}
```

Lifecycle:

```ts
async function onFocusSessionStart(sessionId: string) {
  if (focusProtection.enabled) {
    await focusProtectionService.applyForSession(sessionId);
  }
}

async function onFocusSessionEnd(sessionId: string) {
  await focusProtectionService.removeForSession(sessionId);
}
```

The service should record provider status per session, attempt cleanup idempotently, and expose a manual "Turn Off Protection" recovery action from Settings if stale protections are detected. Normal Focus UI should not ask the user whether to protect the session.

Future providers can include notification controls, Apple Focus mode integration, website restrictions, and scheduled Focus blocks. Those providers should attach to the same session lifecycle rather than introducing profiles or session variants. For app restrictions outside an active Focus Session, see [Meaningful First App Access](meaningful-first-app-access.md); that mode is day/access-scoped rather than session-scoped.

### Relationship to Meaningful First

Focus Protection and Meaningful First share the Screen Time Protection settings surface, Screen Time authorization, selected apps/categories, and native provider foundation. They differ in activation:

```text
Focus Sessions = quiet selected apps only while a Focus Session is active.
Meaningful First = quiet selected apps until real progress in Kwilt.
```

If both modes are enabled, selected apps remain shielded while either mode has an active restriction reason. Completing a qualifying Focus Session can both end Focus Protection and unlock Meaningful First for the day. Disabling one mode must not clear restrictions owned by the other mode.

### Scheduled to-dos, notifications, and calendar handoff

When a to-do is scheduled for the current time, the user-facing concept is still "Start Focus." Kwilt should not apply device restrictions merely because a scheduled time arrived. The consent moment is the Focus Session starting.

Kwilt and calendar notifications serve different jobs:

- The calendar app says, "This block of time has started."
- Kwilt says, "Start the work session for this to-do."

If Kwilt creates or exports a calendar event, the event description should include a deep link back to the exact Activity with the Focus sheet ready:

```text
Open in Kwilt to start a Focus Session:
kwilt://activity/<activityId>?openFocus=1
```

Tapping that link should open the Activity and present the Focus sheet. It should not immediately start the session or activate Screen Time protections, because a generic calendar event is not Kwilt's clearest consent surface.

Kwilt-owned notifications can be more direct. An activity reminder can show:

```text
Boshi Landing Page
It's time for this.
[ Start Focus ]
```

If the user taps the notification body, Kwilt should open the Activity or Focus sheet. If the user taps the explicit Start Focus action, Kwilt may start the Focus Session directly. If Focus Protection is enabled, protections activate as part of that session start.

Duplicate reminder posture:

- If Kwilt only exported an `.ics` file or opened a provider composer, assume the calendar app owns the time reminder unless the user also enabled a Kwilt reminder.
- If Kwilt owns both the scheduled Activity reminder and the calendar event in a future true-sync integration, default toward one actionable Kwilt notification and a passive calendar event to avoid double-pinging.
- Calendar deep links should use `openFocus=1`; Kwilt-owned explicit start actions, widgets, Shortcuts, or App Intents can use an explicit start route such as `autoStartFocus=1` when the user chose the action.

Rule of thumb:

```text
Calendar link = take me to the to-do, ready to start.
Kwilt Start Focus action = start the session now.
Focus Protection = activates only after the session starts.
```

## Success signal

Users can enable Focus Protection, complete Screen Time setup, start ordinary Focus Sessions, and finish or cancel them with restrictions applied and removed cleanly. The practical metrics are Focus Protection enabled rate, Screen Time setup completion rate, protected Focus Sessions started, protected Focus Session completion rate, average protected Focus minutes, repeat protected usage, and cleanup failure rate.

## Open questions

- Does V1 need custom shield configuration, or is system-default Screen Time shielding enough?
- What is the right recovery UI if the app crashes, is killed, or loses permission while protections are active?
- Should Focus Protection be Pro-gated, and if so, how do we avoid turning first setup into a monetization interruption?
- Should Kwilt suppress its own scheduled Activity reminder when the user exports to calendar, or only when a future true-sync integration confirms the provider reminder is active?

## References

- [Design exploration: Focus Protection](../design-explorations/focus-protection/03-converge.md)
- [Feature brief: Calendar Export (ICS)](calendar-export-ics.md)
- [Feature brief: Meaningful First App Access](meaningful-first-app-access.md)
- [Apple: Screen Time technology frameworks](https://developer.apple.com/documentation/screentimeapidocumentation)
- [Apple: Configuring Family Controls](https://developer.apple.com/documentation/xcode/configuring-family-controls)
- [Apple: FamilyActivityPicker](https://developer.apple.com/documentation/familycontrols/familyactivitypicker)
- [Apple: ManagedSettingsStore](https://developer.apple.com/documentation/managedsettings/managedsettingsstore)
