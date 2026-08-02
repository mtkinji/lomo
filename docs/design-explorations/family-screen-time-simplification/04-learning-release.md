# Learning Release: Simple Family Screen Time Administration

## Concept To Build

Give one caregiver one calm Screen Time agreement for Charlie that can be reviewed and controlled from either Charlie's Household page or Unified Chat.

## Capability Delta

Today, the caregiver cannot:

- administer the learning agreement without reading repeated explanations;
- ask Chat for the current family Screen Time state;
- propose the same agreement change from native and Chat;
- follow one truthful saved-to-device-applied status across both surfaces.

After this release, the caregiver can:

- use a progressive setup and compact agreement card;
- invoke the starter agreement without a generic editor;
- read the agreement and current child explanation from Chat;
- propose and confirm agreement changes in Chat;
- follow native-only setup through an exact handoff;
- see server acceptance and child-device application as separate states.

Still intentionally not supported:

- multiple active rules, arbitrary boolean logic, Android enforcement, or Phone Agent policy writes;
- conversational Apple app-token selection, authorization, or device release;
- production claims without signed physical-device proof.

## User Experience

From Charlie's page, Screen Time is one card. Incomplete setup shows one next action. Active setup shows Games, the schedule/limit, Charlie's current explanation, and Edit. A device failure replaces technical detail with one recovery action.

From Chat, requests such as “What are Charlie's Screen Time rules?”, “Let Charlie use Games from 4 to 7 on school days,” and “Give Charlie 10 more minutes today” produce a direct answer or compact proposal. Chat opens the exact native step when Apple or caregiver-device interaction is required.

## Existing Product Relationship

This simplifies the existing Household learning screen and evolves the existing `screen_time.configure` Chat boundary. It does not create another Screen Time product, move Screen Time into global navigation, or transfer policy ownership to Chat.

## Buildable Slice

Must be real:

- shared native/Chat agreement summary and status vocabulary;
- child-scoped authorized read model;
- compact native card and progressive setup;
- typed Chat read, agreement proposal, bounded exception proposal, and exact native handoff;
- explicit caregiver confirmation and stale-version protection;
- separate policy mutation receipt and device application receipt;
- analytics for entry, proposal, confirmation, handoff, device acknowledgement, and recovery.

Can be thin or temporary:

- one child, one device, one active starter rule;
- fixed Games label in the pre-picker simulator slice;
- development acknowledgement adapter confined to Developer Tools;
- only two exception durations;
- local-build Chat provider until the server family policy RPC is available.

Intentionally excluded:

- responsibilities until Household Activity assignment is ready;
- device usage reporting, content history, dashboards, advanced schedule templates, billing, or broad household adoption.

## Release Channel

Local build first for native/Chat comprehension and parity, then TestFlight for Apple authorization and child-device delivery. Production remains hidden until signed-device reliability and cleanup are proven.

## Brand-Goodwill Guardrails

- No beta machinery on the ordinary parent surface.
- No parenting judgments, surveillance framing, or false urgency.
- Chat shows one proposal and one consequence, not an operations transcript.
- Every limitation is stated at the point where it changes the next action.

## Reversibility

The compact presentation layer can replace the learning screen without migrating policy data. Chat operations are capability-manifest entries and can remain bounded or hidden independently. Native handoffs preserve the existing route as a fallback. Additive server records retain idempotency and policy history if the UI is revised.

## Permanent Product Threshold

Promote when a caregiver can complete setup and ordinary edits from both surfaces, signed devices apply and clear exact versions reliably, the child explanation remains accurate offline, and repeated family use measurably reduces manual unlock requests.
