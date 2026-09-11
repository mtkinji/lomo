# Home across situations

September 10, 2026. Revised design framing after Andrew rejected the native treatments and the shadcn comparison. Proposal, not approved UI or implemented behavior.

## Correction

There is no single answer to what opening Home should feel like. The same person can have a first-run question, a populated feed, an adopted capability, another unfinished path and a relevant undiscovered capability at once. A single next-action slot, a global adoption level or a sequence from onboarding to feed cannot capture that.

## Independent evidence

- Entry: first unscoped visit, ordinary return, explicit Home navigation or exact invitation/deep link. Exact destinations keep their owner flow; Home does not intercept them.
- Chosen purpose: known and still active, already fulfilled, or unknown. Preserve onboarding choices instead of asking again.
- Per-capability state: unknown, not tried, invitation accepted, setup in progress, usable, first value reached, established use, blocked or declined. Adoption does not mean every possible feature is configured; inactivity alone does not revoke it.
- Household readiness: solo by choice, participation desired, invitation unsent/pending/accepted, grants missing, child/device steps outstanding. Each fact is separate, scoped to a person and outcome, and owned by its existing capability.
- Feed: no activity, first meaningful activity, unread/current activity, or quiet after prior use. Feed emptiness never means setup is incomplete.
- Attention and preferences: an explicit request, an action another person needs, saved work, a declined offer, or room for discovery. Unknown evidence must not fabricate a personalized diagnosis.

These describe context, not six dashboards or visible status badges.

## Situations to design together

| Situation | What should lead | Explicit invitation / continuity | Discovery |
| --- | --- | --- | --- |
| First Home, purpose not yet known | A useful welcome that helps choose a beginning | Invite a concrete outcome; avoid asking for a post before it has an audience or purpose | A small considered set of outcome choices supplies discovery |
| First Home after Meals was chosen | Continuity with that choice | Complete the actual next step toward the chosen meal outcome | Secondary only when useful; no repeated all-app chooser |
| Newly invited member; existing feed | The inviter's reason and authorized shared context | Join the relevant activity after required acceptance; do not replay organizer setup | Later, based on this person's needs and role |
| Setup unfinished; real feed activity | Shared activity and a findable continuation coexist | Resume the accepted step; do not bury it in chronology or force it ahead of every post | Can coexist without becoming a permanent second mandatory slot |
| Meals established; Money untried | A settled Home, with feed or useful orientation | No Meals setup prompt merely because it is the only adopted capability | Offer a clear Money benefit where appropriate; non-use is not incompletion |
| Several capabilities established; another accepted path incomplete | Established use remains intact | Continue that specific path; show progress only within it | Still possible without forcing broader adoption |
| Household invitation sent, awaiting response | Real waiting status and independent useful actions | Pending is not an invitation-to-send-again; do not treat someone else's action as her unfinished task | Independent capabilities may remain available |
| All chosen paths usable; feed empty or quiet | Calm, useful Home with access to existing value | Do not restart onboarding, invent urgency or pressure sharing | An optional credible new benefit may lead when there is little else, without implying deficiency |
| Relevant capability declined or guidance hidden | Respect the preference | Recovery remains user-requested | Do not immediately relabel the same suggestion to show it again |

## Composition roles, not one fixed widget

Home needs a stable page identity with several bounded roles:

1. Arrival guidance: temporary, for a real first-use or new-participant situation. It may occupy more space because there is a genuine orientation job.
2. Continuity: persistent access to a chosen unfinished outcome. It is recoverable outside feed chronology and can become quiet once other content needs space.
3. Opportunity: an invitation to an unused capability with a legible benefit. It may lead on an otherwise quiet Home or appear as a subordinate Home section when activity leads. It is not automatically an incomplete setup step.
4. Shared life: real authorized posts and interactions, with its existing response and publication grammar.

Do not render all four roles as four panels. Evidence decides which exist and which deserves emphasis. A relevant incoming request, a stated purpose and the person's preferences matter more than raw post count. Avoid continually rearranging the screen during a visit; use meaningful transitions rather than every refresh.

## Selection must answer two questions

Which invitation is useful, and how much of Home should it occupy in this situation? The current implementation mostly answers the first with a deterministic candidate list and applies one presentation everywhere. Visual exploration must now answer the second across scenarios.

Any discovery offer should explain the outcome before a product name becomes its only message. A broad supported benefit is honest when context is thin; an invented inference from Meals usage to financial need is not. No quotas, rotating promotions, setup percentages across capabilities or forced tour completion.

## Next design artifact

Create one coherent set of Home screens for: first visit with unknown purpose; Meals-first arrival; mixed feed plus unfinished path; Meals established with a meaningful unused capability; and settled/quiet Home. Show the same person's transition between them and explicit triggers, CTAs, verified results and dismissals. Evaluate whether the roles remain recognizable without making every screen identical. Compare patterns within each situation after this composition model is settled. The prior three component sketches are reference studies, not accepted directions.
