---
id: brief-goal-partners-post-share-experience
title: Goal Partners Post-Share Experience
status: accepted
audiences: [audience-private-accountability-seekers]
personas: [David]
hero_jtbd: jtbd-invite-the-right-people-in
job_flow: job-flow-david-invite-the-right-people-in
serves: [jtbd-invite-the-right-people-in, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [growth-evangelism-shared-goals]
owner: andrew
last_updated: 2026-05-13
---

## Context

Once a goal has been shared, the header share affordance no longer represents a blank "share this" action. It represents a chosen circle of partners attached to the goal. The current drawer still reads like an onboarding/share surface and gives the strongest visual weight to sending a check-in update, which makes the post-share state feel muddy: the user tapped access management, but the sheet asks them to communicate.

## Target Audience

`audience-private-accountability-seekers` describes users who want accountability without turning their lives into content. This work matters because the post-share state is where privacy expectations become concrete: who can see this, what can they see, and how do I invite or remove people?

## Representative Persona

David has shared a meaningful goal with a spouse, mentor, friend, coach, or small group. He wants the support relationship to feel real and visible, but not social-feed-shaped or performative.

## Aspirational Design Challenge

How might we help David see and grow his partner circle without losing the calm, private feel of his goal page?

## Hero JTBD

`jtbd-invite-the-right-people-in` is the demand spine: David wants to invite support into a specific goal while keeping the rest of his work private and reversible.

## Job Flow Step

`job-flow-david-invite-the-right-people-in` is the intended flow for this surface: after the first invite, the user needs to understand who is attached, add another person, and manage access without a social-product posture. If the job-flow file does not exist yet, this brief establishes the missing step for future documentation.

## JTBD Framing

In user voice: "I already invited someone into this goal. Help me see who is here, add someone else if I want, and keep the boundary clear." This serves `jtbd-invite-the-right-people-in` directly, supports `jtbd-carry-intentions-into-action` by keeping check-ins connected to actual progress, and protects `jtbd-trust-this-app-with-my-life` by making visibility clear and reversible.

## Design

The goal header keeps its current share/supporter affordance. The post-tap drawer becomes state-aware:

- Before the first share, it remains `Share this goal`, with invite channels and a compact explanation of what partners can see.
- After the first share, it becomes `Partners`. The dominant content is the partner list: avatar, display name, role/status, and access-management affordances.
- The invite channels stay available under `Invite another partner`.
- Privacy copy is elevated into a small callout: "Your to-dos stay private. Partners only see check-ins and progress."
- The dominant `Send a check-in update` row is removed from the share drawer. Check-ins belong on the goal canvas, where the user is looking at progress.

The goal canvas gains a quiet shared-state card near the to-do section. It names the attached partners and offers `Send a check-in`, opening the existing check-in composer. This keeps communication tied to actual goal work rather than hidden behind the access button.

## Success Signal

David can open a shared goal, glance at who is following, add another partner, or find the access-management path in under three taps. Check-ins originate from the goal canvas rather than the share drawer, so the share surface feels like a calm access surface instead of a mixed-purpose modal.

## Open Questions

Partner removal and resend flows currently depend on backend capability beyond member listing. Until the service supports per-member removal or resend, the drawer routes access changes through the existing manage-sharing path and keeps invite channels available for inviting another partner.

## Design Update: iOS-Style Share And Partners Split

After comparing the flow against iOS Notes, the header pattern moves from one stateful share/supporter control to two single-purpose controls:

- The Share icon is always present and always means send or invite someone to this goal.
- The Partners icon appears only after the goal has been shared and always means manage or engage with the people already attached.

The share drawer is now invite-only. It does not render partner empty states, partner lists, or post-share management actions. It shows the goal preview, a small access descriptor, invite channels, and the privacy line.

Partner management reuses the existing goal members sheet instead of introducing a new `PartnersSheet` component. Opening from the Partners header icon lands on the Check-ins tab (engagement-first); a dedicated `Partners` tab handles access management. This keeps the interaction close to the native Notes grammar without adding a new custom surface.

## Design Update: Partners Check-In Model

The next iteration replaces the manual "check-in composer first" model with an action-triggered, user-approved draft system. The goal is to remove the blank-page tax on partner support while keeping the user in full control of what gets shared.

- **Check-ins are specific completed actions the user approves before sharing.** Messages should read like `I finished the workshop outline.` instead of generic preset chips. Celebration belongs in the surrounding UI, not inside the message text.
- **Drafts are per-goal and persistent.** A shared goal can hold one active draft, keyed by `goalId + partnerCircleKey`. Drafts can span days, accumulate items, and never auto-expire. Closing a prompt means "not now," not "discard."
- **Triggers.** Completing a meaningful activity, focus session, or goal tied to a shared goal queues an item into that goal's draft. Captured-but-not-completed to-dos do not enter the draft. Undoing a completion removes the item from the draft.
- **Prompt cadence.** Immediate approval prompt on the first check-in-worthy item if there is no active draft. Subsequent items are appended quietly with a small confirmation toast. An optional end-of-day review surfaces drafts that have unsent content and are outside their dismissal cooldown; each shared goal gets its own card in that review.
- **Pending draft affordance is goal-local.** A small amber badge attaches to the 44px Partners button frame on the goal header when an unsent draft exists. The Check-ins tab in the Partners sheet renders a `Ready to send` / `Draft check-in` / `A few wins collected` card above the feed with `Send`, `Edit`, `Skip` actions and item-level remove controls when editing.
- **Partner notifications.** Owner reminders and partner send notifications are separate systems. Partners only get notified when the user explicitly sends. Default cap: one partner notification per goal per day, with batching across goals when notification infrastructure supports it.
- **Partner response paths.** App-member partners respond in-app with authenticated identity. Invited web/guest partners can cheer or send a short reply from the invite landing page without installing, via the public `share-web-cheer` and `share-web-reply` Supabase functions. Provenance (`webCheer: true` / `webReply: true` plus optional `senderName`) is preserved through the feed.
- **Partner conversion ladder.** Invited partners get value first: cheer the latest check-in, optionally send a short reply, optionally add a name, then see a contextual install/open CTA. Attribution (`inviteCode`, `ref`, `goalId`) flows from invite open through install/open so we can measure the full loop into shared-goal activation and the partner's own first goal.
- **The manual composer is a fallback.** It stays available in the Check-ins tab as a text-first editor for cases when there is no triggering completion to draft from.

## Implementation Surface

- `src/services/checkinDrafts.ts` is the single policy layer (draft lifecycle, item ops, text composition, cooldowns, partner-circle changes, send/skip semantics). Backed by `src/store/useCheckinDraftStore.ts` for persistence.
- `src/features/goals/CheckinApprovalSheet.tsx` is the action-triggered approval moment.
- `src/features/goals/PendingCheckinDraftCard.tsx` is the recovery card in the Check-ins tab.
- `src/features/goals/GoalFeedSection.tsx` renders user-authored check-ins as the hero feed item; automatic `progress_made` events drop to a quieter system row.
- `supabase/functions/share-web-reply/index.ts` is the new public reply endpoint paired with the existing `share-web-cheer` function.
- `kwilt-site/components/share/ShareResponseForm.tsx` and the `/api/share-reply` Next.js route handle the no-install reply path; the invite landing page now previews the latest check-in text and emits `invite_landing_viewed`, `invite_landing_action_selected`, and `invite_landing_install_cta_selected` for the conversion ladder.
