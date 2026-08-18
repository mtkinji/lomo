# Converge: Conversational App Control MVP

## Chosen alternative

One natural-language interpreter over capability-owned operations.

## Capability delta

Before, users navigate to the correct capability and translate intent into fields. Existing AI paths can perform some workflows, but routing is inconsistent and a response may stop before the requested outcome exists.

After:

- “Create a to-do called Take out the trash and remind me every Tuesday night” creates the Activity, asks only for a missing exact time, configures recurrence and reminder, and returns the saved result.
- “What's on my Plan tomorrow?” reads the authoritative Plan date and reports what is actually placed.
- “Create a Goal to walk every day next week” creates or reviews the Goal, then offers the repeating linked Activity that makes it actionable.
- A future Screen Time operation becomes conversational when that capability registers its operation and native authorization path.

Still intentionally impossible: silent sharing, account deletion, purchases, family-device enforcement, or other consequential actions without the owning confirmation; claims of success without an authoritative result; control of a capability Kwilt has not implemented.

## Reductive decisions

- Mobile Chat is the MVP channel.
- The operation matrix, not timeline appearance, defines completion.
- Phone Agent, background queues, and cross-channel continuation are follow-on work.
- Do not add a command language, modes, or per-capability chat UI.

## System-facing App Intents adapter

Siri and Shortcuts should not become another natural-language interpreter or a
parallel operation registry. App Intents expose a selected subset of the same
capability-owned operations to the system, while App Entities let Siri resolve
the Kwilt records those operations address.

The first entity/action priority is To-dos, Grocery lists/items, and read-only
Budget-category answers. Recipes follow for find/open and later reviewed
ingredient handoff. Goals remain represented because they are useful context
for requests such as “add this under my Family goal,” but Goal-specific Siri
commands are not a launch priority. Focus resolves a To-do entity rather than a
raw Activity ID.

Direct, bounded utterances may use a typed App Intent. Open-ended and
cross-capability utterances enter this chosen interpreter through an **Ask
Kwilt** intent with their resolved context intact. Both lanes keep capability
policy, confirmation, authoritative receipts, correction, and undo in Kwilt.

Budget entities publish identity and display metadata only. Financial values
are retrieved on demand from the authoritative Money answer contract, retain
freshness and privacy-lock behavior, and are not indexed into Spotlight.

The detailed platform strategy and first Siri proof matrix live in
[`docs/apple-ecosystem-opportunities.md`](../../apple-ecosystem-opportunities.md).

## Activation

No tutorial is required. Successful ordinary commands teach the capability. Contextual entry points may show one concrete example from their owning capability.

## Bet

We are betting that natural language reliably completing existing app jobs creates meaningful value before timeline presentation is polished. If users cannot predict what Kwilt controls, improve examples and capability discovery rather than add modes.

For system entrypoints, we are additionally betting that frequent capture and
bounded recall—To-dos, Groceries, and Budget answers—will earn repeat use before
broad object parity. If Goal or Recipe actions are rarely invoked, retain their
entity representations for resolution without promoting more shortcuts.

## Success signal

Andrew can run the standing command matrix on a signed build without selecting a mode, navigating before the request, or correcting false success claims.
