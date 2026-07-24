# Job Coverage Audit: Family Screen Time

Audit date: July 23, 2026.

## Classification

This is a feature-direction and learning-release delivery review. It asks whether the emerging concept improves a specific family job, whether both parent and child journeys are covered, and whether offline behavior is part of the job rather than a technical afterthought.

## Is one path emerging?

Yes. The architecture and product model are converging on one coherent path:

1. One Kwilt app with independent caregiver identities and a dependent child profile.
2. A Kwilt Household relationship separate from Apple child-device authorization.
3. One readable Family Access Rule combining selected screen activity, time window, Activity completion, and optional foreground-usage cap.
4. Activities should remain the canonical responsibility truth, but current Activities are personal and unassignable. Screen Time can reference their occurrences only after an explicit household-participation model exists.
5. The cloud publishes versioned desired policy; the child device reconciles and enforces locally through Family Controls, Managed Settings, and Device Activity.
6. Push accelerates reconciliation; device receipts and full snapshots establish delivery truth.
7. The child sees the currently relevant reason/next action; caregivers see the full rule and only genuine exceptions.

The remaining uncertainty is no longer primarily “which product model?” It is whether this narrow rule is understandable, maintainable, trustworthy, and valuable enough in a real household to justify the control-plane investment.

## Existing job-flow assessment

### Target audience and persona

- Audience: `audience-aspirational-family-organizers`
- Persona: Maya
- Hero JTBD: `jtbd-move-the-few-things-that-matter`
- Existing flow: `job-flow-maya-move-family-life-forward`

### Existing steps this concept materially targets

| Maya job step | Current score | Concept contribution | Coverage read |
| --- | ---: | --- | --- |
| See what matters, what can wait, and what is blocked | 2 | Names the current failed Screen Time criterion and next transition | Strong inside Screen Time; does not solve global family prioritization |
| Know the next doable action | 2 | Child sees the specific Activity or time transition that changes access | Strong for the governed rule |
| Schedule or hand off work | 2 | Proposed caregivers set time windows and assign required household Activities | Gap; household assignment does not exist today and is a prerequisite capability |
| Let family members participate without turning life into admin | 2 | Independent caregivers, child participation, deterministic rules, few notifications | Primary job-step target |
| Keep using the system because it feels helpful, not fussy | 3 | Routine decisions resolve automatically; setup remains one sentence | High-risk hypothesis, not yet evidenced |

The concept should not claim to improve Maya's entire job flow. It does not materially improve initial capture, crowded-list re-entry, or general family prioritization. It is a focused contribution to steps 3–7, especially participation and trusted follow-through.

No delivery score changes are justified before a real family learning release.

## Anchor assessment

### Restated in user voice

When our child reaches for entertainment, we want the device to follow the agreement our family already made—recognizing the time, the responsibilities that are complete, and the access already used—so our child knows what happens next and neither parent has to reconstruct the decision every time.

### Strong matches

- `jtbd-carry-intentions-into-action` — Carries an agreed responsibility/access relationship across time without a caregiver managing each transition.
- `jtbd-put-intention-before-impulse` — Places a meaningful Activity and family window before a selected distracting activity without surveillance or shame.
- `jtbd-invite-the-right-people-in` — Gives both caregivers scoped authority and the child legible participation without opening unrelated Kwilt data.
- `jtbd-trust-this-app-with-my-life` — Device enforcement, offline behavior, exceptions, and cleanup must be transparent and recoverable.

```yaml
serves: [jtbd-carry-intentions-into-action, jtbd-put-intention-before-impulse, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
```

The hero job remains `jtbd-move-the-few-things-that-matter`; these four are the narrower demand and quality anchors.

## Coverage gap: the child is a co-user, not an endpoint

The current taxonomy has a named family-organizer persona and family job flow, but no named child/teen persona or child Screen Time job flow. The exploration has designed child-facing screens and protections, yet it has not formally assessed the child's demand sequence.

Before roadmap commitment or a permanent feature brief, add a child participant persona/job flow. Do not infer that Maya's job fully represents the child.

### Provisional child job statement

> When my device says I cannot use something, help me understand the family rule, what I can do now, and whether the device recognized it, so access feels predictable instead of arbitrary and I do not have to argue or repeatedly ask.

### Provisional child job flow

1. Know the rule before it surprises me.
2. See what is available now and why.
3. Know the next action or time transition.
4. Complete the responsibility without needing a parent beside me.
5. Trust that Kwilt recognized completion and changed access when it should.
6. Use eligible screen activity without the allowance draining unfairly.
7. Know what remains and what happens at the limit.
8. Ask for a real exception or report a problem.
9. Keep the same understandable behavior when the internet is unavailable.
10. Gain more independence as family policy changes, without gaining bypass authority.

### Current concept coverage of the provisional child flow

| Child step | Coverage | Gap to test |
| --- | --- | --- |
| Know the rule in advance | Planned | Does the child actually look before a shield appears? |
| Understand current state | Strong concept | Copy must survive overlapping Apple restrictions and stale device state |
| Know next action | Strong concept | Must name only an action the child can really take now |
| Complete independently | Partial | Offline/local Activity occurrence and simple completion must be real |
| Trust recognition | Planned | Needs immediate local result plus eventual cloud receipt |
| Consume usage fairly | Planned | Requires physical Device Activity threshold proof |
| Know remaining/end state | Planned | Exact child-visible remaining use needs device implementation validation |
| Ask/report problem | Partial | Remote decisions cannot appear immediate while the device is offline |
| Work offline | Newly specified | Requires a full offline journey, not just cached shields |
| Grow independence | Deferred | Per-criterion review/trust progression is outside the first release |

## End-to-end parent lifecycle coverage

| Parent moment | Learning release coverage | Later gap |
| --- | --- | --- |
| Create household and invite co-caregiver | Included | Ownership transfer and limited caregivers |
| Add child and enroll device | Included | Multiple children/devices and replacement |
| Set one rule | Included | Multiple/overlapping rules and templates |
| Let a normal day run | Included | Holidays, travel, school calendars, daylight-saving edge cases |
| Handle a true exception | Included, bounded | Rich reasons and delegated helpers |
| Understand delivery failure | Included | Support tooling across many households |
| Edit rule mid-day | Thin | Define active-session transition semantics before permanent release |
| Release device safely | Included | Child aging out, household transfer, lost device |

## Offline use is part of the primary job

Family Screen Time becomes untrustworthy if the rule only works while the child device and cloud are continuously connected. Offline operation must cover the full normal-day loop.

### Offline truth table

| Situation | Required behavior | User-facing truth |
| --- | --- | --- |
| Child device offline with a valid cached policy | Local schedule, trusted Activity completion, usage threshold, and shield transitions continue | Normal child explanation; subtle offline state only when relevant |
| Child completes an auto-approved required Activity offline | Complete the local occurrence, re-evaluate immediately, open access if all other criteria pass, enqueue completion/receipt for sync | **Done. Games are available for 30 minutes.** |
| Activity requires caregiver approval while child is offline | Record submission locally but do not invent approval or access | **Submitted. Connect to get caregiver approval.** |
| Caregiver approves while child device is offline | Server records bounded exception; caregiver sees pending until device fetches and applies it | **Approved — waiting for Riley's iPad** |
| Caregiver phone is offline | Existing child policy continues; caregiver may draft but cannot claim a remote mutation is authoritative/applied | **We'll send this when you're back online** |
| Kwilt cloud is unavailable | Child device follows last valid bounded policy; no new remote exception is promised | **Current family rule is still active** |
| Push is missed | Foreground/background/periodic reconciliation fetches the current version later | No false error if policy remains current |
| Device reconnects | Upload idempotent outbox, send full snapshot, fetch newer policy, apply monotonic version, resolve pending caregiver state | **Up to date** only after reconciliation |
| Device reboots | Restore persisted policy/monitor state conservatively and reconcile at the first available system opportunity | Never show access that the device has not applied |
| Child changes device time to bypass a window | Family mode should require automatic date/time while managed, with this restriction disclosed during enrollment | Rule remains tied to trustworthy device time |
| Device is released while offline | Keep release pending; cached enforcement remains until cleanup executes | **Release pending on Riley's iPad** |

Apple's Device Activity monitor can execute schedule/threshold code without the main app running, and Managed Settings can require automatic date and time. Both require signed physical-device proof for the actual offline/reboot behavior.

### Offline policy requirements

- Persist a signed/versioned last-valid device policy and reject rollback to older versions.
- Preload or locally derive the required Activity occurrences for the offline horizon. The seven-day learning release can preload its seven daily occurrences; the permanent system needs recurrence semantics that work locally.
- Maintain a durable idempotent outbox for Activity completion and device receipts.
- Evaluate trusted completion locally. Do not make an auto-approved chore depend on a cloud round trip.
- Never create an unbounded offline grant. Every local opening remains bounded by schedule and/or usage cap.
- Treat server-side deletion or rule edits as effective on the offline device only after it receives the newer version; the previous bounded policy remains authoritative locally until then.
- Reconcile conflicts by policy version and immutable Activity occurrence ID, not client clock order alone.
- Do not claim remote exception or release completion before the child device acknowledges it.

## Material risks still unproven

1. **Demand risk:** The rule may be logically clear but still feel like more setup than the family wants to maintain.
2. **Child-trust risk:** The child may experience chore-gated access as arbitrary or transactional even with clear copy.
3. **Activity-model dependency:** Household assignment, privacy, completion authority, and offline recurrence are a separate Activities capability—not a nullable field or hidden Screen Time implementation detail.
4. **Platform risk:** Apple callbacks, extension lifecycle, authorization, and offline/reboot behavior may not be reliable enough for the promise without additional recovery design.
5. **Exception risk:** Real family life may generate enough special cases that one rule still produces frequent caregiver work.
6. **Scope risk:** Building Household, multi-caregiver authority, device identity, policy reconciliation, and Activity participation for one rule is a large platform investment.

These are the correct learning questions. They do not imply that the product path is ambiguous; they determine whether the path earns permanent investment.

## Recommended next design challenge

> How might we prove that one family rule remains understandable and dependable for both caregiver and child across an ordinary connected day, a fully offline day, and one real exception—without building multiple-rule administration or a general chores system?
