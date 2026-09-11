---
id: brief-home-getting-started
title: Home Getting Started and Readiness
status: draft
audiences: [audience-aspirational-family-organizers, audience-private-accountability-seekers]
personas: [Maya, David]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-capability-routed-onboarding, brief-food-capability-onboarding, brief-money-progressive-activation, brief-household-foundation, brief-shared-household-device-profiles, brief-kwilt-home-shared-life, brief-activation-experiment-loop]
exploration: docs/design-explorations/home-getting-started
owner: andrew
last_updated: 2026-09-10
---

# Home Getting Started and Readiness

## Implementation boundary — September 10

The approved inline placement has a first native slice for Household, Money and Meals. It includes independent continuation/discovery selection, explicit owner-flow invitations, durable per-account acceptance/Later/decline/hide state, and a user-opened Your next steps view. The broader brief remains draft: all-capability readiness, precise child-device prerequisites, cross-device preference sync, contextual offers and learning instrumentation are not claimed by this slice. See the [implementation plan](../superpowers/plans/2026-09-10-home-recommendations.md).

## Context

Home should help a person make Kwilt useful before their feed has much in it, then let shared life take the lead. The current share-first empty state assumes an audience and a reason to post. The broader onboarding effort already owns recognizing a useful purpose and entering a real capability. Home actively invites useful next steps, including steps the person has not discovered yet, and fills the continuity gap after entry: what I started, what is actually ready, what I can do next, and how to resume when interrupted.

This is a developed concept and draft implementation contract. It does not change production entry, promote rehearsal paths, claim runtime acceptance or authorize implementation. The [system audit](../design-explorations/home-getting-started/00-system-alignment.md) separates current source, accepted direction, historical proposals and gaps.

## Target audience

Primary: aspirational family organizers. The experience must also work for an adult using Kwilt alone or connecting with chosen people outside a Household. Household membership is neither universal setup nor a prerequisite for ordinary personal value.

## Representative persona

Maya installed Kwilt to make meals easier. Her partner has not joined; a child may use a shared iPad, another may have a personal phone. She can get a meal plan and grocery list working now. If she chooses household participation, she needs to know which invitation, grant or device action remains and who can perform it. David may share with a selected supporter and never create a Household.

## Aspirational design challenge

How might we preserve a person's chosen purpose from first install through first useful result and family participation, while Home naturally becomes their feed and every capability remains authoritative?

## Hero JTBD

`jtbd-move-the-few-things-that-matter`: the reason to configure Kwilt is to move something real in life. Orientation, setup, first value and ongoing use are distinct steps toward that outcome.

## Job flow step

The documented Maya family-life flow rates knowing the next doable action 2/5, family participation 3/5, and continued use 3/5. Home can improve the seams between existing flows; it cannot raise these scores through setup presentation alone. Household readiness is multidimensional and the underlying capability must actually deliver. These are existing document scores, not newly measured results.

## JTBD framing

When I return after starting something, help me see the next doable step and pick it up without retelling or reconfiguring my life. When other people participate, explain what is ready and what still needs someone else's action without exposing unrelated personal information. Let me use the parts I need and feel settled without adopting everything.

## Design

### 1. Place in the product system

| Layer | Owns | Ends or yields when |
| --- | --- | --- |
| Universal onboarding | Accepted Welcome/value-door reel, explicit intent, safe entry precedence | User chooses a capability or skips to explore |
| Capability onboarding | Necessary permission/setup, native work, checkpoint, authoritative first value | Its defined setup/first-value boundary is reached or user leaves |
| Home continuation | Explicit invitation to the next useful step, factual private readiness, visible progress and resumption | User hides/defers it, reaches its finite boundary, or a stronger current context takes precedence |
| Everyday capability use | Meals, money decisions, chores, goals, play and other recurring work | Continues in its own native surfaces |
| Home feed | Authorized moments, conversations, invitations and accepted source-owned arrivals | Always available; never gated on setup completion |

Home is a projection and navigation surface. It does not own financial setup, child enrollment, grants, plan creation, policy activation or ordinary personal commitments. Configuration is not automatically added as user Goals or To-dos. Existing accepted automatic Chores arrivals remain valid; this concept authorizes no new automatic feed type.

### 2. Entry and exit contract

Priority is concrete context before generic orientation or Home:

1. Honor a validated exact link, invitation, device setup or authoritative restore after the identity/authority gates required by its owner.
2. Preserve an active interrupted native flow and its owner-defined resume behavior. Home does not steal an OAuth callback, device claim, draft or result.
3. For unscoped new users, retain the accepted Welcome/value-door reel when its separate production gate passes. Until then, retain current production first-time onboarding.
4. A selected door goes directly to that capability. Its native result remains on screen at success; there is no forced bounce to Home.
5. For the future promoted new-user cohort, Home becomes the default unscoped shell destination after orientation. Skip tour still opens the capability side sheet unobscured. Home does not interrupt that exit or cover the menu. On the next unobscured Home view, it may offer one inline starting invitation. Skip tour declines the tour, not all future setup help. This revises the earlier concept's broader suppression rule while preserving the existing unobstructed exit.
6. Existing users retain current launch/restore behavior. This concept does not reset their navigation or infer newness from missing local state.
7. Home-launched work uses an explicit return context. Back/close follows the owner's draft and cancellation semantics and restores Home's position. Completion stays at the useful native result; ordinary Back or Home navigation returns when wanted.

The global drawer's `initialRouteName` must not simply be changed for everyone. Cohort/default-shell behavior belongs in actual entry resolution. Changing a policy helper without wiring and verifying the real host is insufficient.

### 3. Home composition

Placement recommendation: a persistent inline recommendation region above, and visually distinct from, the chronological feed. It can feature either a continuation or discovery offer, with at most one quiet but explicit complementary row. Getting started is the setup-detail destination, not the name or scope of all ongoing recommendations. See [placement and discovery alternatives](../design-explorations/home-getting-started/07-recommendation-placement-and-discovery.md). This recommendation still needs comparative native design review. An automatic bottom guide is an alternative to test, not the chosen default.

Keep the full gray canvas, Home header, current plus action, and feed grammar.

Within the private recommendation region, an active continuation can show Getting started progress. It shows the intended useful outcome, one recommended next action, and up to two quiet milestone rows showing what is already useful or comes next. One primary action does not mean only one visible piece of information. The full sequence remains available through See setup steps. Waiting does not have a disabled primary button. There are no automatic timers, rings for every capability, tutorial carousels or setup posts.

- **No actual feed content, active chosen path:** give the single continuation enough room to explain the next action. Do not simultaneously render the old share-first empty-state CTA as a competing primary action.
- **Real feed content present:** keep actual content immediately available. A first post alone does not collapse needed guidance. Use compact guidance after the active useful outcome is reached or the user minimizes it; when unread content or a source-owned action needs room, compact temporarily without recording setup completion. On the target phone at ordinary text size, the first item's identity/content should begin without scrolling; accessibility sizes may expand naturally.
- **Only waiting work:** show a compact factual status. If another independent continuation or eligible discovery offer is actionable, it may be the foreground action with the pending item in the overview.
- **All relevant paths complete or hidden:** feed leads. Nothing celebrates a global 100% score or opens a new capability automatically. A relevant unused capability can be explicitly offered without waiting for another current-capability event, subject to benefit, eligibility and dismissal; finishing setup does not permanently disable discovery.
- **No selected path:** offer one eligible starting invitation in the visible Home region. For a known new adult without other context: “What would you like Kwilt to help with first?” with “Choose a starting point” opening the existing value-door catalog. Do not infer a partner or children. If no supported offer is eligible, use a neutral empty state; never fabricate missing setup from feed emptiness.

User-authored posts, accepted Chores arrivals and current needs-you items remain separate from the private setup region. An actionable source-owned arrival takes precedence over a large setup treatment; keep guidance compact rather than duplicating that arrival as another card. Home discovery does not require a post, and a first post does not complete setup.

Home overflow contains **Getting started**. This is a full-page personal overview using existing page/navigation patterns, not a new primary tab. It shows chosen paths with factual status and a short Suggested next section. A visible “See setup steps” link in the active Home region makes it discoverable without overflow. Eligible unchosen paths can be invited directly on Home when a declared trigger explains their benefit; broader browsing reuses the accepted value-door catalog and availability rules. Do not create a second editorial registry.

### 4. What counts as progress

Persist or derive these as separate facts:

| Fact | Example | Must not be substituted with |
| --- | --- | --- |
| Orientation exit | Chose Meals or skipped tour | Setup completed |
| Intent | Explicitly started Meals or enabled a child-specific setup | Page impression, missing feature use, campaign guess |
| Setup milestone | Accepted membership; usable Money plan; device connected | Button tapped or route opened |
| First useful result | Capability's declared durable result | Completion of explanatory UI |
| Extended first cycle | Food plan sent to groceries and list reviewed | Mandatory universal setup |
| Current readiness | Exact capability, actor and device are presently eligible/ready | Historical completion receipt |
| Later adoption | Independent use of the capability/result | Daily app opens or reading the checklist |

Use a named finite path: **Money setup · 2 of 4 steps**, where the owner can support four stable milestones. Counts are completed milestones, not elapsed effort or estimated time. Numeric UI is omitted until those milestones and evidence predicates are declared.

No global percentage across Kwilt, Household, children or devices. Optional sharing is outside a personal Meals denominator. Starting another path creates a separate scope; it never reduces another path's completed count. A skipped optional step is labeled skipped, not successful. Required unfinished work that is hidden remains unfinished. Record first completion historically; if a connection later fails, show a current maintenance state without undoing the earned milestone.

A parent can see **Connected — Screen Time setup remains**, because both facts can be true. A bank can be linked while data is still syncing. A household can have multiple members but no content or participation yet. Never collapse these distinctions into “ready.”

### 5. Household readiness

Household readiness is evaluated for a chosen use case, member and, when relevant, device. Home reads only the current viewer's authorized projection.

| Dimension | Example fact | Owning surface and consequence |
| --- | --- | --- |
| Membership | Invitation pending, accepted adult, dependent profile exists | Household; adding a profile does not require child email or its own phone |
| Authority | Caregiver has grant for this capability and child | Household/capability; role alone does not authorize management |
| Capability selection | Child-specific capability intentionally active or pending | Household; sibling setup never activates another child |
| Device participation | Personal child device vs shared household iPad | Household devices; different enrollment and actor models |
| Native prerequisites | Apple authorization and selected opaque targets | Screen Time owner; separate from Kwilt pairing |
| Applied state | Device acknowledged the current desired policy version | Screen Time owner; saved desired state alone is insufficient |
| Content participation | Plan shared, member can participate, real contribution exists | Relevant capability; roster membership is not data sharing |

No new global prerequisite sequence is imposed. Ask for Household only when a selected action requires collaboration. A usable solo Meals flow and personal Goal flow remain complete on their own. Screen Time for the user's own phone must not be confused with family controls for a child.

Home can say which actor or device must act only when that fact is authorized and known. Examples below use fictional names. Recipients of invitations see accept/review within the existing invitation owner, not organizer setup tasks. An expired invitation routes to reviewed recovery; never resend automatically. Leaving a pairing page can cancel the live session under current owner behavior; resume must request fresh setup rather than replay a stored code.

Adult personal Home only in this concept. A caregiver's Money setup, account status, private path choices and permission state never appear in child or shared-device Household Mode. No child Home route is added. Role or account switches cover and clear private projections before rendering the next identity.

### 6. Capability integration contracts

| Path | Home's relevant continuation | Setup/first-value evidence | Additional boundary |
| --- | --- | --- | --- |
| Household participation | Invite the user to start relevant household participation, then resume member actions and explain pending acceptance | Authorized membership/invitation owner state | No universal requirement for all family members; no resend or implicit grant |
| Meals | Choose recipe, resume plan, or compile/review grocery list using owner checkpoint | Keep meal-plan first value and grocery payoff distinct | Optional sharing; opening share UI is not sharing success; grocery-first stays valid |
| Money | Continue owner step or resolve a specific current recovery state | Money's real usable-plan/foundation result | Linked account and demo plan cannot prove real household budget readiness; Pro and data coverage remain owner-owned |
| Family Screen Time | Continue exact child/device setup or explain pending application | Grants, activation, native authorization/selection, exact desired/applied receipt | Pairing is one milestone; simulated proof cannot establish physical enforcement |
| Goals | Resume the chosen guided creation; open resulting Goal | Existing Goal creation receipt and native record | Creating a Goal is not completing the Goal; do not require identity setup for unrelated paths |
| Chat | Reopen an explicitly unfinished conversation when owner can identify it | Durable conversation only proves conversation continuity | Sending a message is not a “setup completed” or useful-answer milestone |
| Chores / Games | Owner continuation only after route and first-use contract are validated | Actual owner receipt appropriate to promise | Registry presence does not imply production availability; not new mandatory setup |
| Connections / sharing | Explicit invitation to connect or share at a relevant value moment, followed by the user choosing the person and scope | Owner-confirmed relationship/publication | Household is one audience path; do not require it for David's selected supporter |

The existing registry's stable `budget-app-controls` ID currently describes Money foundation in source. Keep identity stable and use the current declared contract/version. Before implementation, reconcile older brief wording through the owning Money contract rather than silently changing its promise here.

### 7. Explicit invitations are part of the experience

Design correction from Andrew: do not write “she decides to share” without designing the prompt that helps her recognize the benefit and take the action. Optional means the person can decline; it does not mean the app stays silent. Every setup or adoption step must specify how the person encounters it, the concrete benefit, the CTA, and what happens afterward.

There are three invitation kinds:
- **Start:** help a new person begin even without a selected path.
- **Continue:** invite the next required step in an active path, with readiness and progress.
- **Extend:** after a useful result, invite the directly related benefit that another person or capability can enable. Acceptance creates a separate chosen path; it is not implicit consent to a mutation.

| Trigger, verified by the owner | Explicit invitation and benefit | CTA and destination | After action |
| --- | --- | --- | --- |
| A real personal meal plan exists; sharing is available and has not been declined | “Choose meals together. Invite someone in your household to weigh in on this plan.” | Invite someone → existing plan sharing / Household path | Show confirmed send/pending state; keep solo planning usable |
| That plan already has eligible participants but is private | “Let your household weigh in on these meals.” | Share this plan → existing audience review | Owner confirms actual sharing; opening the sheet is not completion |
| A real plan can compile groceries | “Your meals are planned. Build the grocery list.” | Build grocery list → native compiler | Then explicitly offer review of the real list |
| User selected Money, or explicitly asks for money help, and owner requires a connection | “Connect an account to build your plan from real income and spending.” | Connect account → Money-owned eligibility and setup | Show syncing, next plan step, or truthful recovery |
| Authorized caregiver explicitly added a child; a supported personal-device setup is available | “Set up how Sam will use Kwilt.” | Set up access → existing member/device choices | Explain shared-device vs personal-device choices; do not assume a phone exists |
| Personal child device connected and Screen Time is an eligible, relevant next option | “Set Screen Time limits for Sam.” Explain what setup requires before starting | Set up Screen Time → exact child-owned setup | Invite authorization, selection, review and application in order; no premature active claim |
| Screen Time setup has a known next prerequisite | Name that actual step and the device/actor needed | Continue setup → authoritative checkpoint | Advance only from owner evidence |
| User explicitly chose shared Home but has no approved recipients | “Bring someone into your day. Connect with someone you’d like to share moments with.” | Connect with someone → existing connections choices | No assumed partner, Household requirement, automatic contacts access or invite send |

These are proposed contextual invitations, not assertions that all production paths are ready. Eligibility still gates them. Source surfaces offer the invitation at the useful moment; Home carries the same unaccepted or unfinished invitation afterward. Use a shared offer identity so the two surfaces do not nag independently. Do not stack a new modal on a native celebration; use its accepted action slot or an inline follow-up.

Invitation visibility and readiness progress have separate lifecycles. The first missed glance is not a refusal: an eligible invitation may stay visible on subsequent Home visits until accepted, explicitly deferred/declined, completed elsewhere or invalidated. One invitation is prominent at a time; quiet next/ready/parked rows may remain visible so the sequence is understandable. Do this later suppresses that offer under the explicit deferral rule; Hide from Home persists. A dismissed sharing invitation does not disable all unrelated setup help, and a new milestone must not be manufactured merely to replay the same offer.

Acceptance scenarios added: a user who never opened Household receives the contextual plan-sharing invitation; an eligible caregiver receives an explicit setup invitation after adding a child; a completed setup milestone leads to the next actual prerequisite; an ignored invitation remains findable; an explicit decline is honored across source and Home; Skip tour does not leave new Home inert.

### 8. Deterministic selection and suppression

Compute only after identity, permissions and necessary owner state are known. A stale/failed read is unknown, never an empty household or incomplete setup.

Filter first: supported release/route, personal-adult context, current scope authorization, either an explicit path or a declared contextually relevant invitation, and appropriate device/entitlement eligibility. For a user who already started a now-unavailable path, preserve an honest owner recovery/status route rather than erase their progress or promote an unusable action.

Maintain two candidate sets: continuation and discovery. The list below describes continuation precedence and candidate sources, not a global ranking that always places discovery last. Explicit foregrounding and important actionable recovery can lead; otherwise compare useful current payoff with credible new value. When continuation leads, keep one eligible discovery invitation visibly available in the complementary row. When discovery leads, preserve the relevant continuation row.

Candidate considerations:
1. User explicitly foregrounded an outcome or step.
2. A required prerequisite or repair that enables that outcome and is actionable by this user now.
3. The shortest credible continuation to the current useful payoff, including the capability's finite first-use cycle.
4. A timely invitation to participation when it improves that same outcome; offer before collaboration becomes an afterthought, but never block the independent payoff.
5. A meaningful unused capability, with benefit and prerequisites explained; it need not depend on or wait until completion of the current capability.
6. A starting invitation for a known new adult with no intent. Otherwise no automatic suggestion.

Recency breaks ties rather than defining usefulness. Availability includes whether the necessary person, device or permission is needed now. Do not show invented completion times; state concrete requirements such as “You’ll need Sam’s phone.” A slow bank sync or pending partner response permits a useful independent step instead of parking all guidance.

A path selection is not required to show an invitation; it is required to start the proposed work. Required prerequisites matter within their accepted path; they do not make all unrelated discovery ineligible. Offer a new capability for its own credible benefit as well as for adjacency to recent work. Avoid a rotating feature catalog or ranking commercial value above user benefit.

Waiting candidates do not compete as actionable steps. If only waiting exists, show the factual status. When multiple selected child/device instances exist, show one recommended scoped action plus up to two quiet status/next rows and expose the full sequence in the overview; no global family red badge. Selection stays stable during the visit unless the user acts, scope changes or the action becomes invalid. Background refresh should not rotate cards.

- **Do this later:** remove the prominent invitation and retain a quiet Later row in the active Getting started region/overview. It can be resumed without hunting in Settings, but does not automatically return as the primary card on relaunch.
- **Not for me:** remove an unstarted suggested outcome from recommendations until the user changes that preference. Do not treat this as a claim that the whole capability can never be useful.
- **I need help:** within step details, offer the owner's explanation, recovery or supported alternative. A stuck required step is not a lack of interest.
- **Hide from Home** in overflow: persist suppression until the user explicitly resumes it from Getting started; recovery remains available in its owner.
- **Choose something else:** preserve native draft/progress and switch foreground path; does not mark the old path completed.
- **Skip tour / Explore:** preserve the unobscured exit. On the next unobscured Home view, one inline invitation may help the user start. Never automatically reopen the reel or launch setup.
- First value dismisses setup guidance once the result is observed on the native path; no duplicate celebration. A declared finite first-cycle continuation may remain compact if it is part of the chosen capability contract, as in Food. It must not silently append cross-capability obligations. It should explicitly invite a useful next capability when a declared trigger applies; accepting starts a separate path, without changing the completed denominator.
- Quiet or filtered feeds do not reactivate guidance. Loss of the last post does not expand a previously compact panel during the same visit.

Maintenance may appear compactly for an active path when authoritative owner state identifies a real problem, with cause and direct recovery. Respect hide preferences. Existing critical safety messaging belongs to its approved owner flow and is not suppressed or reinvented by this setup feature.

### 9. Projection and persistence contract

Extend existing capability-onboarding infrastructure rather than introduce a second completion store. Proposed adapter output:

- Stable path and contract version; opaque internal instance scope for user/household/member/device as needed.
- Release/presentation eligibility and why, evaluated by the owner.
- State: not started, in progress, waiting, ready, needs attention, unavailable or unknown.
- Named milestone facts with evidence source/version and observation freshness.
- Owner-defined checkpoint and typed start/resume/recovery destination.
- Next required actor class and whether the viewer can act now.
- Separate setup-complete, first-value and optional first-cycle evidence.

Home persists only presentation choices: foreground path, defer/hide state keyed to scope/step version, and whether a completion acknowledgement was seen, and invitation exposure/acceptance/decline state keyed to offer and relevant context. Mere exposure does not create a started path or suppress an offer permanently. Domain success is reconstructed from owner state/receipts. Local rehearsal records require explicit provenance isolation before production consumption. Do not blindly reuse the current per-user local rehearsal store as production onboarding truth.

Refresh through existing owner queries on focus, successful return and relevant source updates. Do not make Home orchestrate background bank syncs or continuously poll all children. Unknown sources should degrade independently so the feed and unrelated ready paths remain usable. Missing local data after reinstall should hydrate/reconstruct and suppress unsupported claims, not replay new-user setup.

For production, settle cross-device preference persistence before release. Recommended end state: account-scoped synchronized explicit hide/foreground preferences; device-local transient visit/layout state. Rehearsal may be local-only. Never store invitation tokens or sensitive domain content in Home preference data.

### 10. Example states and copy direction

Illustrative copy, subject to the owning route and current eligibility:

| Situation | Home says | Action |
| --- | --- | --- |
| Meals chosen; real plan exists, groceries not compiled | “Your meals are planned. Build the grocery list.” | Build grocery list |
| Household invite sent and still valid | “Invitation sent. You can keep using Kwilt while they join.” | Quiet View invitation; another already-chosen independent action may lead |
| Child device paired, next setup is on that device | “Sam's phone is connected. Continue Screen Time setup on that phone.” | View setup; no false Activate here action |
| Device has not confirmed new policy | “Waiting for Sam's phone to apply the changes.” | Owner status/recovery, if actionable |
| Money owner says accounts are linked but setup step remains | “Continue setting up your Money plan.” | Resume Money |
| Known new adult, no chosen path after Skip tour | “What would you like Kwilt to help with first?” on the next unobscured Home view | Choose a starting point; Do this later |
| Established household with no recent posts | “No moments here yet.” | Existing voluntary share/connection controls; no setup diagnosis |
| Owner status cannot refresh | “Setup status is unavailable right now.” only in opened overview or previously visible status | Try again; no zero-percent fallback |

No “You're falling behind,” percentage of family health, inferred household composition, or congratulation for a step not verified. Explain pricing or eligibility before entering a path whose next action requires it; route through the capability's existing explanation, not a Home-generated upsell.

### 11. Scenario acceptance matrix

| Scenario | Expected result |
| --- | --- |
| Clean adult chooses Meals | Immediate native Food path; optional Household; Home later resumes actual checkpoint |
| Clean adult skips reel | Real side sheet unobscured; next unobscured Home view has an inline starting invitation, never a reopened tour |
| Money-only adult, no Household | Relevant owner Money path; no invite/kids checklist |
| Invited caregiver | Invitation context first; role/grant-aware next action after owner acceptance |
| Dependent profile without auth or phone | No demand to create email or pair a personal device unless the selected capability needs it |
| Shared iPad in child mode | No caregiver Home or setup projection; approved child surface remains |
| One of several child phones connected | Correct child's connection milestone only; siblings unchanged; controls not claimed active |
| Waiting policy acknowledgement | Pending wording; completed only on current applied receipt; stale receipt does not satisfy newer version |
| Accepted invite but no posts | Membership respected; no reinvite; quiet feed remains valid |
| External supporter, no Household | Selected-person relationship path remains valid |
| Capability first value with feed already populated | Stay at native result; Home compact or settled on return; post anchor preserved |
| Account/grant revoked while Home visible | Protected state removed before next actor render; action reauthorized by owner |
| Network failure / missing local record | No onboarding reset, completion claim or household-empty inference |
| Deep link while setup ongoing | Exact destination wins; draft retained per owner; no Home hijack |
| User defers or hides | Suppression follows explicit rules; relaunch/time passage does not nag |
| Reinstall established user | Recover authoritative state; no default onboarding because local store is empty |
| Bank disconnect after first value | Historical milestone retained; factual current owner recovery, not lost setup percentage |
| New feature introduced | No new obligation or reduction in prior progress |
| Demo/rehearsal state on production account | Cannot qualify as production completion or actionable readiness |
| Unsupported, unpaid or wrong-device path | No misleading start; explicit requested intent gets truthful prerequisite/owner resolution |

### 12. A visible path to a useful outcome

The unit of guidance is a finite outcome the person understands, such as **Make this week's meals easier** or **Set up Screen Time for Sam**. It can cross existing capabilities without becoming a new user-maintained Plan, Goal or task list. It is a derived setup sequence attached to existing path/offer identity; owners still supply each milestone and its evidence.

Show a recommendation before asking another open-ended question when context supports one. Meals intent should produce a Meals sequence. Existing membership/grants should remove satisfied prerequisites. Unknown intent can use the existing outcome catalog, but Home should not repeatedly return the person to the same choice screen they skipped.

Example after a personal meal plan exists:

> **Make this week's meals easier**
> Meals chosen ✓
> **Build your grocery list**
> Bring the ingredients for these meals into one list.
> **Build grocery list**
> Next: Review the list
> Optional: Choose meals with someone · Invite someone

An invitation to collaboration may instead lead when gathering input is the user's explicit purpose and feedback will still affect the plan. Do not always put social recruitment immediately after a saved record. “Ready to make a grocery list” is a different moment from “We still need to decide what to eat.” Preserve both paths.

Numeric progress belongs to the bounded outcome and counts only declared required milestones. An optional collaboration branch may be visible without reducing or blocking personal setup progress. Show positive state, such as “Your meal plan is ready,” as prominently as missing work. At completion, explain the durable return location: “Find it in Meals → Groceries.” A second successful independent use is measured adoption, not another required setup checkbox.

### 13. Invitations must deliver value to the recipient

Design the two sides of participation together. “Invite someone” is incomplete unless the recipient knows who invited them, what they can do, what joining/sharing exposes, and where they will land afterward.

For the meal example, proposed recipient experience: review the legitimate invitation and scope, complete required identity/acceptance, then reach the specific plan or choice round with an explicit **Choose meals** or **View plan** action appropriate to its state. Do not require the recipient to configure a Household, repeat the generic reel, or recruit another person before participating.

Preserve membership and content authority separately: accepting a Household invitation does not automatically share the plan. The originating flow must obtain explicit authorization for the specific content handoff. Carry a validated destination through sign-in/install only where the real entry infrastructure supports it. If exact continuation is missing, expired, revoked or deleted, explain that state and offer an authorized recovery; do not claim seamless deferred deep linking already exists.

For Maya, show only owner-authorized facts: invitation sent, accepted membership, and actual plan participation when available. No “hasn't opened it” surveillance or invented response status. A waiting invitation must not become Maya's failure or force repeated reminders. Sender setup completion and recipient response are distinct milestones.

### 14. Reach the first shared interaction deliberately

The journey must not say “a real moment appears” without explaining its cause. After the relevant shared result, invite one concrete interaction through existing owner surfaces: respond to a meal choice, thank a real contribution, or share a selected photo/story. These are invitations, never automatic personal publication.

Home's existing moment suggestions can help the person recognize something real to share. Their availability is not proof of completion or permission to publish. Retain review and audience selection. If there is no real contribution, recipient or source material, do not fabricate feed examples as household activity.

A solo adult need not manufacture a social feed to finish setup. Once their chosen outcome works, Home can show its confirmed result and a quiet route to it while retaining voluntary connection/discovery. Do not keep an oversized setup panel merely because the feed is empty. Conversely, one incoming post must not erase active family setup guidance.

Use two independent axes for layout: guidance state (active, waiting, parked, settled) and feed state (empty, real content, needs action). Settled+empty is a valid Home; active+populated is also valid. No arbitrary post-count threshold determines adoption.

### 15. Additional acceptance scenarios

- User can identify the intended payoff, completed milestone and next step without opening the full overview.
- Money or device waiting does not prevent an already available independent step.
- Later remains findable as a quiet row; Not for me does not reappear automatically; help preserves progress.
- A meal-plan recipient reaches the authorized plan after necessary acceptance, or receives honest recovery when exact continuation cannot be preserved.
- Household membership acceptance alone never shares content or marks recipient participation complete.
- A solo user's useful outcome can settle Home guidance despite an empty feed.
- A populated feed cannot erase an unfinished child-device prerequisite.
- After first value, the user can find the result again without Home guidance.
- An invited person can achieve their first contribution without becoming another household administrator.

### 16. Ongoing capability discovery

Home has two responsibilities: help the person continue useful work and invite them into meaningful unused capabilities. Discovery persists after finite setup is settled and does not require the person to finish their current capability first. Broad explicit needs and authorized context can justify an offer; when context is sparse, use truthful general benefit copy from supported registry offers instead of claiming personalization.

An offer names a concrete outcome and action, such as exploring Money, finding a shared game or considering Screen Time when relevant. Eligibility and declared current capability contracts determine which examples can ship. Showing an offer does not create setup work or change completion progress; accepting it starts its owner path.

At most one featured offer and one quiet complementary row are proposed for Home. The row must name the actual continuation or discovery benefit, not hide it behind generic More. Detailed setup milestones belong in the continuation treatment/overview. Do not make a new Discover tab the only route to discover capabilities.

New acceptance cases: an established Meals-only user can encounter a relevant Money or other eligible discovery offer without finishing every Meals step; discovery remains possible with no current setup; important continuation remains findable while discovery is featured; generic benefit copy does not assert inferred private motives; dismissal is shared across native contextual offers and Home. Final placement needs native comparison using the same offer content.

## Success signal

People can predict what to do next, who must do it and what result to expect. Users encounter understandable invitations without hunting through menus; more invited and chosen paths reach their authoritative useful result and later independent use, without more confusion, unwanted setup prompts or hidden posts. Track setup, first value, extended first cycle and return separately. Also distinguish adoption of a previously unused capability from continuation in an existing one; discovery cannot be evaluated only through current-path completion. Current first-value events of differing strength are not pooled as equivalent activation.

The [learning plan](../design-explorations/home-getting-started/05-evaluate-learning.md) defines comprehension gates and disconfirming signals. No current behavioral uplift is claimed.

## Learning release

See [release sequence](../design-explorations/home-getting-started/04-learning-release.md). Build locally first, then internal TestFlight. Home continuation can be rehearsed with existing owner facts, but changing automatic first install remains gated by Capability-Routed First Install. Full family Screen Time requires separate real device/authorization/application proof.

## Spec refinement

Resolved for this proposed concept:
- Home actively invites and continues useful setup after orientation; no competing universal tour or mandatory conversation. A person need not discover a feature before being invited to use it.
- Default Home landing is scoped to future new-user shell entry; exact/native/returning contexts win.
- One private region with one recommended action and a short visible sequence; finite outcome-based progress; distinct Later, Not for me and help states.
- Household readiness is per use/member/device; no global completion boolean.
- Capability owner facts determine completion; Home stores presentation preferences only.
- Adult Home scope; no automatic sharing or child-feed extension.

Implementation must pin exact adapter milestone versions, executable route params, eligibility evaluators, source freshness bounds and preference persistence schema. These are source-integration decisions within this contract, not grounds to invent new user flows. Owner contract conflicts must be recorded and resolved before that adapter is promoted. Prototype numeric counts only after defining the finite milestones.

Required build verification: regression-first state/selection logic, owner-contract tests, actual native entry/return/large-text/VoiceOver/relaunch, multi-account authority, applicable physical-device Screen Time proof, and source-diff verification at completion. Static mockups prove composition only.

## Open questions

The developed recommendation is reviewable without resolving these by assumption in production:

- Accept the future new-user Home default while preserving existing-user navigation and Skip tour's menu exit?
- Accept distinct Later, Not for me, and persistent Hide from Home semantics, with a visible quiet route back to parked steps?
- Which adapters have sufficient real owner evidence for the first production cohort? The current registry/rehearsal distinction cannot answer this alone.

No production rollout or app implementation has occurred as part of this concept development.
