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

## Activation

No tutorial is required. Successful ordinary commands teach the capability. Contextual entry points may show one concrete example from their owning capability.

## Bet

We are betting that natural language reliably completing existing app jobs creates meaningful value before timeline presentation is polished. If users cannot predict what Kwilt controls, improve examples and capability discovery rather than add modes.

## Success signal

Andrew can run the standing command matrix on a signed build without selecting a mode, navigating before the request, or correcting false success claims.
