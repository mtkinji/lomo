# Frame: Private Day Bridge

## What the user said

> This problem feels self-evident. The question is whether Kwilt can implement it in a really elegant way.

## Restated in user voice

When my work calendar, personal calendar, and small intentions live in different places, I want one private understanding of the time I actually have and a simple way to protect time for what matters, so that I do not get double-booked, lose ordinary to-dos, or expose personal details at work.

## Target audience

`audience-burned-out-productivity-power-users` - people who already have capable tools but are tired of maintaining the seams between them.

## Representative persona

Marcus has separate calendars because work and personal life have different owners and visibility rules. He has also accumulated enough task systems to know that another universal organizer will become another thing to maintain.

- Current situation: work commitments, personal commitments, and small Activities compete for the same finite day without sharing a trustworthy privacy boundary.
- What he is trying to do: know what time is genuinely available and turn one meaningful intention into protected time.
- Emotional state or tension: capable but tired of juggling, wary of oversharing, and skeptical of automation that continually rearranges his day.
- What would make this feel wrong: a replacement calendar, a sync-rules control panel, surprise writes, copied personal metadata, or an AI schedule that will not stay put.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - the calendar matters only because it is where an intention becomes real enough to happen.

## Job flow step

Marcus's current flow scores **Decide next action** 3/5, with Plan helping but not yet serving as the spine of the "what now?" moment. This concept adds the missing transition between deciding and doing: protect honest time for the action using the whole day's availability without requiring Marcus to reconcile systems himself.

## Active anchors

- `jtbd-carry-intentions-into-action` - an Activity should survive the gap between capture and a real commitment of time.
- `jtbd-trust-this-app-with-my-life` - calendar access and cross-calendar writes must be minimal, inspectable, reversible, and privacy-preserving.

## Friction we're addressing

Calendar aggregation alone lets Marcus see conflicts but does not keep coworkers from booking apparently free work time. Calendar mirroring can prevent double-booking but risks copying personal context into an employer-controlled system. Tasks remain a third layer unless promoting an Activity into time is both direct and trustworthy.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Plan already owns the private day view, recommendations, calendar lens, slot capture, and scheduling application.
- Existing user flow: Quick Add or Chat creates an Activity; Plan recommends or lets the user choose a slot; a reviewed commit creates a calendar event.
- Existing domain/data model: Activity is the canonical day-level unit. `scheduledAt` and `calendarBinding` record the real commitment; external calendar events remain external evidence rather than Kwilt Activities.
- Existing technical affordances: Google and Outlook accounts can be connected; selected calendars count as busy time; one configured default write calendar receives all planned items; provider writes already have proposal, conflict, receipt, undo, and reconciliation foundations in different parts of the current system.
- Existing UX/copy conventions: explicit review before meaningful external writes, calm conflict warnings, user override, and plain receipts.

Constraints to preserve:

- Activities remain the only Kwilt-owned forward-planning unit.
- Plan remains the only private composite view of the day; no new top-level Calendar destination.
- Source calendars remain separate and retain their own ownership and visibility rules.
- Capture never requires a calendar, Goal, Arc, or scheduling decision.
- No personal title, notes, location, Goal, Arc, guests, or deep link may cross into a work calendar through a privacy projection.
- External writes are explicit, understandable, reversible, and stable.

Constraints we may challenge:

- The single default write calendar should remain authoritative for detailed planned events; anonymous protection needs a separate optional target rather than per-item destination selection.
- Reading full event details should not be required when a calendar is used only for conflict protection.

Design implication:

The elegant unit is not calendar-to-calendar synchronization. It is one **protected Kwilt commitment**: the Activity-backed event continues to go to the existing default write calendar, plus an optional anonymous `Busy` projection in a calendar that only needs to know the time is unavailable. Kwilt owns the relationship and receipt; it does not ask for another detailed-event destination or clone the calendars themselves.

## Aspirational design challenge

How might we help Marcus turn one Kwilt Activity into protected time across his fragmented day, while keeping every calendar separate, revealing only the minimum necessary information, and adding no system he has to maintain?

## Out of scope

- Replacing Apple, Google, or Outlook as the user's general calendar.
- Synchronizing every existing event between every connected calendar.
- Meeting scheduling links, invitations, attendee management, or RSVP workflows.
- Continuous AI reshuffling of accepted commitments.
- A general-purpose rules builder for calendar sync directions and metadata fields.

## Resolved direction

Anonymous protection is a one-time Plan calendar preference, such as `Protect planned time on Work`, with a quiet per-commitment override. The existing default write calendar remains unchanged and is never selected again while scheduling an individual Activity.
