# Conversational UI Parity Inventory v1

Date: 2026-08-27
Status: source- and contract-test complete; runtime proof remains channel-specific
Audience: Nina (`audience-ai-native-life-operators`)
Hero JTBD: `jtbd-trust-this-app-with-my-life`
Job-flow step: express, review, apply, and recover a practical action without surrendering control

## Outcome

Kwilt now has a machine-readable inventory connecting its primary native surfaces and ordinary-language user intents to the canonical capability-operation manifest. The inventory is not a claim that every action works yet. It makes each action land in one truthful state: implemented, native-review-only, pending a provider, externally bounded, or deliberately excluded.

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
| Ordinary-language intent groups | 122 |
| Canonical operations mapped exactly once | 228 |
| Explicit native-intent gaps | 0 |

Channel truth at this checkpoint:

| Channel | State | Count |
| --- | --- | ---: |
| Mobile Chat | Live | 58 |
| Mobile Chat | Native confirmation only | 19 |
| Mobile Chat | Pending provider | 144 |
| Mobile Chat | Excluded | 7 |
| Phone | Live | 31 |
| Phone | Native confirmation only | 36 |
| Phone | Pending provider | 154 |
| Phone | Excluded | 7 |
| ChatGPT connector | Exposed | 66 |
| ChatGPT connector | Pending provider | 153 |
| ChatGPT connector | Explicit boundary | 5 |
| ChatGPT connector | Not applicable | 2 |
| ChatGPT connector | Excluded capability | 2 |

Voice currently inherits the same operation and safety policy as typed mobile Chat, but its proof is marked source-only. Signed-device microphone, interruption, lifecycle, latency, and spoken-confirmation evidence remain separate gates; the inventory does not promote source coverage into physical-device proof.

## Surface coverage

| Surface | Scope | Intent groups | Operations | Gaps |
| --- | --- | ---: | ---: | ---: |
| Chat and contextual answers | Included | 2 | 2 | 0 |
| People and relationship memory | Included | 5 | 5 | 0 |
| Household and family membership | Included | 9 | 13 | 0 |
| Profile | Included | 2 | 2 | 0 |
| Arcs | Included | 4 | 5 | 0 |
| Goals | Included | 6 | 7 | 0 |
| To-dos and Focus | Included | 11 | 21 | 0 |
| Plan and calendar placement | Included | 6 | 10 | 0 |
| Chapters | Included | 4 | 8 | 0 |
| Account and general settings | Included | 14 | 36 | 0 |
| Money | Included | 10 | 19 | 0 |
| Explore | Excluded | 1 | 1 | 0 |
| Games | Excluded | 1 | 1 | 0 |
| Chores | Included | 6 | 16 | 0 |
| Recipes and Cook Mode | Included | 9 | 20 | 0 |
| Meal Plan | Included | 6 | 13 | 0 |
| Groceries, food stock, receipts, and handoff | Included | 8 | 19 | 0 |
| Food budget and grocery savings | Included | 3 | 5 | 0 |
| Screen Time | Included | 9 | 19 | 0 |
| Notifications | Included | 2 | 3 | 0 |
| Search and navigation | Included | 2 | 2 | 0 |
| Phone and cross-channel continuation | Included | 1 | 1 | 0 |
| Developer and diagnostic surfaces | Excluded | 1 | 0 | 0 |

## Gap declaration checkpoint

All 33 previously prioritized intent gaps now resolve to 83 canonical operations with typed tool contracts. This closes the declaration gap only: every new operation remains `pending_provider` until a capability-owned implementation, channel registration, authoritative receipt, and channel-specific proof exist.

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
6. ChatGPT coverage is missing for any canonical operation.

This is the acceptance plan for the remaining work: implement providers capability-by-capability, then validate live ChatGPT and signed native builds without allowing UI, mobile Chat, voice, Phone, and connector truth to drift apart.
