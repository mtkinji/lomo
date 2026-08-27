# Conversational UI Parity Inventory v1

Date: 2026-08-27
Status: source- and contract-test complete; runtime proof remains channel-specific
Audience: Nina (`audience-ai-native-life-operators`)
Hero JTBD: `jtbd-trust-this-app-with-my-life`
Job-flow step: express, review, apply, and recover a practical action without surrendering control

## Outcome

Kwilt now has a machine-readable inventory connecting its primary native surfaces and ordinary-language user intents to the canonical capability-operation manifest. The inventory is not a claim that every action works yet. It makes each action land in one truthful state: implemented, native-review-only, pending a provider, externally bounded, deliberately excluded, or explicitly recorded as a prioritized gap.

Canonical sources:

- Native surfaces, intent groups, and gaps: `src/capabilities/uiParityInventory.ts`
- Capability policy and mobile/Phone truth: `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts`
- ChatGPT connector exposure: `supabase/functions/_shared/externalMcp.ts`
- Drift enforcement: `src/capabilities/uiParityInventory.test.ts`

## Current census

| Measure | Count |
| --- | ---: |
| Audited surfaces | 23 |
| Included surfaces | 20 |
| Deliberately excluded surfaces | 3 |
| Ordinary-language intent groups | 89 |
| Canonical operations mapped exactly once | 145 |
| Explicit native-intent gaps | 33 |
| P0 gaps | 10 |
| P1 gaps | 14 |
| P2 gaps | 7 |
| P3 gaps | 2 |

Channel truth at this checkpoint:

| Channel | State | Count |
| --- | --- | ---: |
| Mobile Chat | Live | 58 |
| Mobile Chat | Native confirmation only | 19 |
| Mobile Chat | Pending provider | 61 |
| Mobile Chat | Excluded | 7 |
| ChatGPT connector | Exposed | 66 |
| ChatGPT connector | Pending provider | 70 |
| ChatGPT connector | Explicit boundary | 5 |
| ChatGPT connector | Not applicable | 2 |
| ChatGPT connector | Excluded capability | 2 |

Voice currently inherits the same operation and safety policy as typed mobile Chat, but its proof is marked source-only. Signed-device microphone, interruption, lifecycle, latency, and spoken-confirmation evidence remain separate gates; the inventory does not promote source coverage into physical-device proof.

## Surface coverage

| Surface | Scope | Intent groups | Operations | Gaps |
| --- | --- | ---: | ---: | ---: |
| Chat and contextual answers | Included | 2 | 2 | 0 |
| People and relationship memory | Included | 5 | 5 | 0 |
| Household and family membership | Included | 6 | 7 | 3 |
| Profile | Included | 2 | 2 | 0 |
| Arcs | Included | 4 | 5 | 0 |
| Goals | Included | 6 | 7 | 0 |
| To-dos and Focus | Included | 11 | 21 | 0 |
| Plan and calendar placement | Included | 4 | 6 | 2 |
| Chapters | Included | 2 | 4 | 2 |
| Account and general settings | Included | 4 | 4 | 10 |
| Money | Included | 6 | 9 | 4 |
| Explore | Excluded | 1 | 1 | 0 |
| Games | Excluded | 1 | 1 | 0 |
| Chores | Included | 1 | 1 | 5 |
| Recipes and Cook Mode | Included | 7 | 18 | 2 |
| Meal Plan | Included | 5 | 11 | 1 |
| Groceries, food stock, receipts, and handoff | Included | 8 | 19 | 0 |
| Food budget and grocery savings | Included | 3 | 5 | 0 |
| Screen Time | Included | 7 | 14 | 2 |
| Notifications | Included | 1 | 1 | 1 |
| Search and navigation | Included | 1 | 1 | 1 |
| Phone and cross-channel continuation | Included | 1 | 1 | 0 |
| Developer and diagnostic surfaces | Excluded | 1 | 0 | 0 |

## P0 gap queue

These are the first capability gaps to close because they are central native actions, not optional convenience settings.

| Surface | Missing intent | Why it is P0 |
| --- | --- | --- |
| Household | Update a household member profile or relationship | A primary family-management action has no canonical Chat operation. |
| Household | Remove or release a household member | Authority and dependent access need a reviewed, reversible operation. |
| Money | Change the monthly budget plan | Budget editing is a core Money action. |
| Money | Correct transaction meaning or planning treatment | Current Chat can only open native review, not stage the exact correction. |
| Chores | List and inspect chores and review status | Chat lacks bounded evidence for the main Chores inventory. |
| Chores | Create, edit, pause, or delete a chore | Chore-series management has no operation family. |
| Chores | Complete a chore and attach required evidence | Occurrence completion and evidence policy are absent. |
| Chores | Approve or return a completed chore | Caregiver review needs a consequential typed action. |
| Screen Time | List and inspect personal Screen Time rules | Personal rule inventory is not available as structured Chat evidence. |
| Screen Time | Pause or remove a personal Screen Time rule | Native rule lifecycle changes lack a canonical operation. |

All P1-P3 gaps, their exact ids, and their reasons live in the machine-readable inventory so they cannot disappear from later implementation work.

## Exclusions and bounded actions

- Games and Explore are deliberately excluded from conversational control for this program.
- Developer tools, labs, Super Admin, fixture controls, authentication mechanics, paywall presentation, and diagnostic actions are not user capability parity obligations.
- Credential entry, OAuth consent, Apple authorization, biometric authentication, app/file selection, OS widget placement, retailer payment, and public-rights attestations remain native or provider-owned review steps.
- A ChatGPT tool being exposed means the connector can invoke its truthful server contract. It does not mean a device-owned effect has completed; those results remain proposals or native handoffs until an authoritative receipt exists.

## Drift contract

The focused inventory test fails when:

1. A canonical operation has no primary native surface.
2. An operation appears on more than one primary surface mapping.
3. The product registry and inventory operation sets diverge.
4. A referenced source path no longer exists.
5. An included surface lacks both mapped intents and explicit gaps.
6. An unsupported native intent lacks a priority or reason.
7. ChatGPT coverage is missing for any canonical operation.

This is the acceptance plan for the remaining work: validate what is already green in live ChatGPT and signed native builds, then close gaps capability-by-capability without allowing UI, mobile Chat, voice, Phone, and connector truth to drift apart.
