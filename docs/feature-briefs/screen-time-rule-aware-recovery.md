---
id: brief-screen-time-rule-aware-recovery
title: Screen Time Rule-Aware Recovery
status: accepted
audiences: [audience-burned-out-productivity-power-users, audience-aspirational-family-organizers]
personas: [Marcus, Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-rule-based-screen-time-contextual-unlock, brief-screen-time-rule-governance]
owner: andrew
last_updated: 2026-09-19
---

# Screen Time Rule-Aware Recovery

> **Decision precedence:** This brief supersedes the contextual-unlock brief wherever that brief offers **Open for 20 minutes**, treats **Do this first** as a universal guide action, or models the guide as a temporary-override surface. It does not remove the control plane's bounded-override primitive from separately owned caregiver/request workflows.

## Context

Kwilt's bottom guide currently explains a Screen Time restriction but also offers an immediate 20-minute opening to authorized adults. That puts the escape in the same impulse moment the rule was meant to protect. The guide also uses one fixed task-shaped action even though time-of-day, daily-usage, unresolved, and overlapping rules may have no immediate prerequisite. The result weakens trust and can send people toward an action that will not restore access.

## Target audience

Burned-out productivity power users need self-authored guardrails that hold when impulse is strongest without becoming punitive or unrecoverable. Aspirational family organizers need the same boundary to distinguish a child's understanding from a caregiver's authority.

## Representative persona

Marcus created a personal rule in a calm moment and encounters it while trying to open a distracting app. He wants the intervention to preserve that earlier intention. Maya needs to understand and change a child's family agreement when circumstances genuinely change, without teaching the child that possession of the restricted device equals authority.

## Aspirational design challenge

How might we help Marcus keep the promise he made in a calm moment while preserving explicit, recoverable ownership—and ensure Maya's family rules can be changed only by a genuinely authorized caregiver?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Screen Time earns its place only when it helps the person carry an intentional choice through the moment that usually displaces it.

## Job flow step

This improves Marcus's **Decide what to do next** step in `job-flow-marcus-move-the-few-things-that-matter`, currently delivered at 3/5. The current pause is useful, but a hot-path override and generic action label undermine the decision. It also protects Maya's still-under-delivered family participation and ordinary-access steps without claiming higher family delivery scores before signed-device evidence exists.

## JTBD framing

When a selected app is paused, show the actual rule boundary and only the action that can truthfully resolve it. Keep a deliberate management path for an authorized adult, but do not place a bypass in the impulse moment or expose caregiver controls to a child.

## Design

### The guide explains and redirects; it never overrides

The root-level floating `BottomGuide` preserves the current Kwilt page and lists the active rule or rules. It never presents **Open for 20 minutes**, never applies a temporary override, and never emits temporary-opening analytics or feedback prompts.

The guide derives one of four resolution kinds:

- `actionable` — one resolved active rule has one concrete prerequisite that can resolve the full blocking set;
- `boundary` — the rule is time-, schedule-, or usage-based and has no immediate action;
- `mixed` — multiple or overlapping rules mean one prerequisite cannot restore access;
- `unresolved` — at least one handoff restriction cannot be mapped truthfully.

An actionable guide may offer one rule-derived primary action:

- **Return to Focus** for a single active Focus condition;
- **Do this first** for a single real-step prerequisite;
- **Review Money** for a single Money-backed condition with an exact category destination.

No primary prerequisite action appears when another active or unresolved claim would remain. A schedule, time-of-day, or daily-use rule instead states the boundary and release condition supplied by authoritative handoff details.

### Management is quiet and authority-aware

An authorized self-adult, household owner, or scoped caregiver may see **Manage rules ›** as a Pine text link. It is never styled as the recommended response to a boundary.

- Personal-only and mixed-domain restrictions route to **Settings > Screen Time**.
- One family subject routes to that child's canonical Household Screen Time surface when the loaded household context supplies the household ID and display name.
- Unresolved restrictions route only to the truthful Screen Time overview.
- A child, unscoped caregiver, or ordinary household member sees no management link.

Closing the guide preserves the current page and changes no policy.

### The guide owns its height

Ordinary states shrink to their rendered content under a bounded maximum height. Large text, long content, or overlapping rules use a near-full-height guide with internal scrolling. The shared safe-area footer and close affordance remain clear of content; no fixed compact height creates empty space or clips the rule list.

Use the reviewed [creative direction](../design-explorations/screen-time-exception-authorization/03a-creative-direction.md) and [rendered states](../design-explorations/screen-time-exception-authorization/mockups/guide-states-rendered.png).

### Active-rule changes require fresh authentication

Kwilt uses platform-owned local authentication with device-credential fallback and no custom PIN.

Fresh authentication is required immediately before:

- turning an active personal rule off;
- deleting an existing personal rule;
- saving any edit to an already-active personal rule;
- saving an edit to an active family agreement or deactivating it.

The first release authenticates every save to an active existing rule because compound condition edits cannot be reliably ordered as stronger or weaker. Creating a new rule, turning an inactive rule on, viewing rules, and navigating to management do not require authentication.

Cancellation returns quietly to the editor or inventory and changes nothing. Unavailable or failed authentication uses concrete copy: **Kwilt couldn't confirm this change. The rule is still on.** A successful authentication is not a write receipt; native or backend failure still reports no change and preserves the prior authoritative rule.

Family mutations require both existing caregiver-scoped account authority and fresh device authentication. Device authentication alone never creates family authority.

### Compatibility and reversibility

Existing and new guide projections treat temporary opening as unavailable. Persisted `temporaryOpenAllowed`, `temporaryOpen`, and expiry fields may remain readable compatibility data, but they cannot restore the guide action. Do not delete override tables, RPCs, or historic receipts in this slice.

The accepted Screen Time control-plane documentation and feature manifest must stop describing the contextual guide as a temporary-opening surface. Separately owned caregiver decisions and access-request overrides remain outside this brief.

### Analytics and privacy

Keep guide shown, dismissed, and requirement-opened events. Add a management-opened event and an authentication-outcome event or structured local log. Properties may describe resolution kind, rule-count bucket, domain mix, destination class, mutation class, and success/cancel/failure outcome.

Never capture app names, rule text, Activity or Goal text, Money category names, child names or membership IDs, biometric type, passcode use, or raw destination URLs.

## UI contract

**Job:** When Screen Time interrupts an app open, the person needs to understand the active boundary and the one legitimate next move, so the rule remains trustworthy and recoverable.

**Authority chain:** explicit user decisions → this accepted brief and exploration → Screen Time control-plane ownership → Kwilt `BottomGuide`, drawer, button, typography, spacing, and color tokens → iOS/Android authentication and accessibility conventions.

**Three-second read:** why the app is paused and whether there is anything concrete to do now.

**Primary action:** a rule-derived prerequisite only when it can resolve the full blocking set; otherwise none.

**Primary information:** active rule name and authoritative condition/release detail.

**Secondary information:** **Manage rules ›** for an authorized adult.

**Reveal later:** rule editing, lifecycle actions, delivery receipts, and advanced condition details in canonical management.

**Scan order:** state title → rule condition(s) → truthful prerequisite action → quiet management link.

**Must not add:** temporary open, custom passcode, warning theater, countdown, quick-exception setting, child request, receipt feed, generic **Do this first**, or a second rule editor.

**Reuse map:** `BottomGuide` → floating intervention; `BottomDrawerScrollView` → bounded overflow; `BottomDrawerHeader` → title/close; semantic footer and owned `Button` → optional primary plus link action; Settings routes → rule management; `expo-local-authentication` → fresh platform authentication.

**Nearest precedent:** the existing Screen Time bottom guide, retaining page preservation and rule cards while removing temporary opening and fixed action hierarchy.

**External exemplar ledger:** N/A; project authority and reviewed local mockups are sufficient.

**Behavior sources:** action/authority/migration decisions from this brief and exploration; route ownership from the accepted control plane; component behavior from the existing Kwilt UI layer.

**Unresolved decisions:** none required for the first local learning release.

**Required states:** actionable, boundary, mixed overlap, unresolved, child/unauthorized, adult management, authentication success/cancel/unavailable/failure, write failure after authentication, large text, long rule details, and compact ordinary content.

**Proof path:** focused Jest/type/product checks; iPhone Simulator for presentation fixtures; one entitlement-enabled physical iPhone for actual shield return, native authentication, rule reconciliation, and no-change claims. Android and assistive-technology proof remain separate gates.

## Acceptance criteria

- No actor sees **Open for 20 minutes** in the guide.
- A prerequisite action appears only when it can truthfully resolve the entire active set.
- Time-of-day, daily-use, mixed, and unresolved states do not show generic **Do this first**.
- Authorized adults reach the correct personal overview or child-specific family surface.
- Children and unauthorized members see no management affordance.
- Ordinary guide states hug their content; large text and overlapping rules remain scrollable and dismissible.
- Active-rule edit, disable, delete, and family-agreement edit paths authenticate before mutation.
- Cancellation, authentication failure, stale version, backend failure, and native failure leave the prior rule and unrelated restrictions unchanged.
- The current Kwilt route remains until the person explicitly chooses navigation.
- Analytics contain no rule, app, child, biometric, or raw-route content.
- Documentation and manifest links no longer claim the guide itself offers a temporary opening.

## Success signal

On an entitlement-enabled physical iPhone, every scenario in the [learning evaluation plan](../design-explorations/screen-time-exception-authorization/05-evaluate-learning.md) behaves as specified, no stop condition occurs, and ordinary self-use finds the guide understandable and recoverable without restoring a hot-path exception.

## Spec refinement

- The guide does not add an exception setting; removing its override makes that setting unnecessary.
- Existing temporary-open fields remain compatibility data and are ignored by guide projection.
- Requirement actions are conservative: one resolved active rule, no unresolved restrictions, and one exact supported prerequisite. Ambiguity produces no primary action.
- Management remains a link even when it is the only action; dismissal is the ordinary response to a boundary.
- For family routing, the guide host may use the already loaded household snapshot only to resolve the canonical route. Authority still comes from the actor projection and backend policy.
- Fresh authentication gates all saves to an existing active rule instead of attempting to rank compound edits by restrictiveness.
- Authentication occurs after a destructive confirmation but immediately before the write. Authentication success alone never changes UI state or policy.
- The family management screen currently has learning/simulated delivery boundaries. The link and authentication gate may be implemented there, but no physical child-device or backend-application claim is made without a real receipt.
- Logic projections, authority, routes, and authentication normalization require failing tests first. Presentational composition may be implemented directly after those contracts are green.
- Local verification must be scoped to the task files because the checkout contains unrelated work. The omitted-file report remains part of the proof boundary.

## Open questions

None for the local learning release. TestFlight remains blocked on the physical-device evidence defined in the evaluation plan.
