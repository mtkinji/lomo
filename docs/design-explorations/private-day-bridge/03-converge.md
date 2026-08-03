# Converge: Private Day Bridge

## Chosen direction

Choose **Protect This Commitment**, backed by one global **Protection In Settings** preference.

The existing default write calendar remains the sole destination for detailed planned events. The first time an Activity overlaps working availability, Plan can explain protection inline and let the user choose one optional protection calendar. Kwilt remembers `Protect planned time on Work` for future placements, while always showing the result and allowing a per-commitment override.

## Why this wins

- It fully serves the immediate double-booking and privacy outcome for commitments Kwilt owns.
- It makes the privacy boundary legible at the exact moment it matters.
- It enhances existing Plan and Activity behavior instead of creating a Calendar capability.
- It establishes the durable relationship needed for move, delete, undo, and repair.
- It can fall back cleanly to a private-only commitment when work-calendar writes are unavailable or unwanted.

## Capability delta

Today, Marcus can:

- let Kwilt plan around selected calendars;
- place an Activity on the configured default write calendar;
- see the commitment in Plan.

Today, Marcus cannot:

- place a personal Activity once and have Kwilt protect that time on an employer-visible calendar without copying personal meaning;
- inspect one authoritative receipt covering both the detailed event and the anonymous protection block;
- trust one move or removal to update the entire protected commitment.

After this concept ships, Marcus can:

- place an Activity once;
- keep its real title and context in Kwilt and the existing default write calendar;
- expose only `Busy` on the selected work calendar during working availability;
- see exactly where the commitment exists and whether protection is healthy;
- move, remove, retry, or undo the managed relationship from the Activity or Plan.

Still intentionally unsupported:

- mirroring pre-existing external events;
- arbitrary calendar-to-calendar sync rules;
- background AI movement of accepted commitments;
- meeting invitations, RSVP, and scheduling links;
- hidden repair that claims success without provider confirmation.

## The smallest elegant interaction

### First protected placement

1. Marcus captures an Activity normally.
2. In Plan, he places it at a time that overlaps his configured working availability.
3. The existing commit surface shows one secondary line without asking where to write the detailed event:

   `Writes to Kwilt · Protected on Work as Busy`

4. If protection has not been configured, tapping that line opens a small protection sheet, not a destination picker:

   - **Protect this time on:** Work
   - **When:** Planned time overlaps work hours

5. Marcus commits once.
6. The Activity receipt reads:

   `Scheduled · Tue, 2:00–2:30 PM`

   `Kwilt · Protected on Work`

### Later placements

The global protection preference applies silently but never invisibly: the same secondary line remains present in the commit preview. Most placements require no extra tap, and none require choosing the detailed-event destination.

### Private-only fallback

If Marcus declines work-calendar protection, lacks write access, or is scheduling outside working availability, the line simply reports the existing behavior:

`Writes to Kwilt`

Plan still uses all authorized calendars when detecting conflicts.

## Reductive design decisions

- No new top-level Calendar destination.
- No `Private Day Bridge` product label in the UI; it is a design concept, not user vocabulary.
- No pairwise sync-direction matrix.
- No per-Activity detailed-calendar picker; the existing default write calendar remains authoritative.
- No field-by-field metadata controls. A protection event is always exactly `Busy`, with no description, location, guests, Goal, Arc, Activity title, or Kwilt deep link.
- No setup wizard before first value. Protection is introduced contextually at the first relevant placement.
- No second Activity or shadow task for the blocker.
- No notification when everything succeeds; the in-context receipt is enough.
- No automatic movement after acceptance.
- No attempt to hide partial failure. A detailed event can remain scheduled while its protection reports `Not protected on Work · Retry`.

## Calendar preference model

Preserve the current preference model and add only one outcome-based choice:

- **Read calendars** - existing calendars that contribute availability.
- **Default write calendar** - existing sole destination for every detailed planned event.
- **Protect planned time on** - one optional calendar that receives anonymous busy blocks when planned time overlaps working availability.

The initial product should preserve exactly one detailed destination and support at most one protection target. If both references point to the same calendar, Kwilt creates only the normal detailed event and no duplicate blocker. If the user wants private details at work, they choose a private or dedicated default write calendar globally; that choice is not reopened per Activity.

## Commitment relationship

The durable model can remain additive to the existing Activity calendar fields. The normal `calendarBinding` continues to represent the detailed event; one optional protection record represents the anonymous blocker:

```ts
type ActivityCalendarProtection = {
  target: CalendarRef;
  disclosure: 'busy_only';
  binding?: ActivityCalendarBinding;
  state: 'pending' | 'confirmed' | 'repair_needed' | 'removed';
};
```

`Activity.scheduledAt` and `Activity.calendarBinding` retain their current meaning. `Activity.calendarProtection` is additive and must not be disguised as a chunk binding or independent Activity. Relationship-level move, remove, retry, and undo operate over the existing binding plus the optional protection record.

## Mutation and failure contract

- Create detailed event first; without it, the Activity is not committed.
- Create the anonymous protection second.
- If detail succeeds and protection fails, keep the real commitment, record the incomplete relationship, and show `Not protected on Work · Retry`.
- A move updates every confirmed binding. If one update fails, preserve the intended start in the commitment, mark the failed edge for repair, and state which calendar is stale.
- Remove attempts every binding and retains a repair record until all provider events are confirmed absent.
- Undo operates on the relationship, not only the detailed event.
- Provider calls need per-commitment idempotency; time-window matching alone is not a safe identity strategy when two legitimate events share a slot.

## Privacy contract

The work-calendar protection event contains:

- title: `Busy`;
- start and end;
- provider-required busy/opaque availability state;
- no description, body, location, attendees, reminders, conference data, Activity metadata, Goal/Arc context, or deep link.

Kwilt should retain only the provider references and health information needed to manage the relationship. A calendar used only for availability should eventually support an availability-only data path rather than requiring event-detail ingestion.

## Activation path

The activation moment is the first Activity placed inside working availability while another writable calendar is connected and no protection calendar is configured.

Teach the feature inside the commit preview with one sentence:

`Keep the details personal and show this time as Busy at work.`

If accepted, store the selected protection calendar as a Plan calendar preference. Do not advertise the capability with a launch modal, badge, or settings checklist, and do not reopen the default write-calendar choice.

Natural adoption means Marcus schedules personal commitments through Kwilt without checking both calendars afterward because the receipt is sufficient.

## Accepted trade-offs

- V1 protects Kwilt-created commitments, not the user's entire pre-existing personal calendar.
- Some employer calendars will not allow third-party writes; private-only placement must remain useful.
- Cross-provider operations cannot be physically atomic, so the product must model and explain partial success rather than pretend atomicity.
- The first relevant placement may require one additional protection-choice tap; later placements require none.

## Rejected trade-offs

- Do not gain broader coverage by mirroring every external event.
- Do not reduce friction by making protection writes invisible.
- Do not roll back a successfully created private commitment merely because the work blocker failed.
- Do not expose more metadata to improve recovery convenience.

## Stated bet

We're betting that people primarily need Kwilt to protect the commitments they intentionally place through Kwilt, and that a visible `[default write calendar] · Protected on Work` receipt will feel more trustworthy and useful than broad background synchronization or per-item destination selection. If this is wrong because users immediately expect protection for all existing personal events, we would revisit external-event mirroring as a separate, explicitly permissioned capability rather than quietly expanding this one.

## Success signal

Marcus can capture an Activity, place it during working availability, see the real event on his configured default write calendar and only `Busy` on his protection calendar, then move or remove it once without picking another detailed destination, leaking metadata, creating duplicates, or wondering which calendars changed.
