# Phase 4 — Learning Release

## Learning objective

Prove that Kwilt can ask a brief, contextually correct question after materially different workflow moments without interrupting the work, over-surveying a person, or confusing perception with behavioral success.

This release should answer four questions:

1. Can each selected workflow reach a verified completion state before feedback is requested?
2. Do people understand and answer the question in the context intended?
3. Can Kwilt compare satisfaction across complete workflows while using diagnostic categories such as ease only where they are useful?
4. Does a portfolio-wide attention policy keep the experience sparse enough to feel considerate?

## Pilot portfolio

The four-workflow pilot deliberately covers all three intended invocation kinds. Each prompt is registered, versioned, and attached to a product fact rather than inferred from a generic screen view.

### 1. Authoritative paid outcome: adjust a Money spending plan

- **Prompt ID:** `money_rebalance_satisfaction_v1`
- **Capability:** Money
- **Workflow:** Adjust a spending plan
- **Eligible checkpoint:** A category-plan adjustment has persisted successfully and `MoneyRebalanceSaved` has been captured.
- **Invocation kind:** `authoritative_outcome_experience`
- **Category:** Satisfaction
- **Question:** “Overall, how satisfied are you with how Kwilt helped you adjust your spending plan?”
- **Response:** Five-point satisfaction scale
- **Presentation constraint:** Wait until the settings surface and success receipt have cleared. Never compete with a paywall, recovery state, or another guide.

This is the pilot's authoritative monetized outcome. The response measures the experience of achieving the outcome; the persisted adjustment remains the behavioral Task Success evidence.

### 2. Complete workflow: finalize a meal plan

- **Prompt ID:** `meal_plan_finalized_satisfaction_v1`
- **Capability:** Meals
- **Workflow:** Plan meals
- **Eligible checkpoint:** The meal plan has persisted successfully and `MealPlanFinalized` has been captured.
- **Invocation kind:** `workflow_completion_experience`
- **Category:** Satisfaction
- **Question:** “Overall, how satisfied are you with how Kwilt helped you plan these meals?”
- **Response:** Five-point satisfaction scale
- **Presentation constraint:** The existing reminder offer has priority. Request feedback only after that offer is absent or resolved and the person has reached a stable next-meals state.

This tests whether the same Satisfaction category remains meaningful outside a paid Money outcome and gives the pilot a complete, broadly available workflow.

### 3. UI utility: correct a transaction category

- **Prompt ID:** `money_transaction_correction_ease_v1`
- **Capability:** Money
- **Workflow:** Correct a transaction
- **Eligible checkpoint:** The category correction has persisted and the successful `transaction_category` mutation has been captured.
- **Invocation kind:** `checkpoint_experience`
- **Category:** Ease
- **Question:** “How easy or difficult was it to correct this transaction?”
- **Response:** Five-point ease scale
- **Presentation constraint:** The merchant-rule offer and navigation transition have priority. Request feedback only after those paths resolve into a stable surface.

This is intentionally not rolled into the cross-workflow Satisfaction score. It tests whether the same utility can diagnose a specific interaction without pretending that the answer represents the whole Money experience.

### 4. Screen Time workflow: understand and clear a Kwilt blocker

Screen Time needs two distinct checkpoints because seeing a shield, understanding its reason, and successfully clearing Kwilt's restriction are different facts. The portfolio arbiter may present at most one of these prompts for a blocking episode.

#### 4a. Understand why access is blocked

- **Prompt ID:** `screen_time_block_reason_clarity_v1`
- **Capability:** Screen Time
- **Workflow:** Respond to a blocked app
- **Eligible checkpoint:** A real native shield handoff has been consumed and the in-app unlock guide has rendered the active blocking reasons.
- **Invocation kind:** `checkpoint_experience`
- **Category:** Clarity
- **Question:** “How clear was it why access was blocked?”
- **Response:** Five-point clarity scale
- **Presentation constraint:** Render the question as a bounded inline slot within `ScreenTimeUnlockGuide`, after the blocking explanation and before its final actions. Never stack another guide. The request expires when the handoff closes. Once visibly presented, this question is immutable and consumes the episode's one-question budget.

The native handoff is evidence that the blocker was encountered. The answer measures whether Kwilt's explanation was understandable; it does not prove the person agreed with the rule or later regained access.

#### 4b. Clear the Kwilt restriction

- **Prompt ID:** `screen_time_block_clear_ease_v1`
- **Capability:** Screen Time
- **Workflow:** Respond to a blocked app
- **Eligible checkpoint:** `ScreenTimeTemporaryOpenApplied` has been captured with an `opened` result backed by successful personal native clears or an applied family-device receipt. An `applying`, denied, or failed result is ineligible.
- **Invocation kind:** `authoritative_outcome_experience`
- **Category:** Ease
- **Question:** “How easy or difficult was it to clear this Kwilt block?”
- **Response:** Five-point ease scale
- **Presentation constraint:** After the unlock guide reaches its stable success state, request the clearing Ease question for the same inline slot. It may appear only when no feedback question was visibly presented earlier in this episode—for example, when Clarity was ineligible because of its same-prompt cooldown. Never replace a visible question or open a second guide.

The receipt proves that Kwilt cleared the restrictions it owns. It does not claim that the target app reopened successfully when Apple, another Screen Time rule, or another restriction system may still control access.

For a low or mixed Clarity response, the bounded reason choices are: `reason_too_vague` (“The reason was too vague”), `reason_too_much_information` (“There was too much to take in”), `reason_unexpected_rule` (“It didn't match the rule I expected”), and `reason_next_step_unclear` (“I wasn't sure what to do next”).

For a low or mixed clearing Ease response, the bounded reason choices are: `reason_action_hard_to_find` (“The clearing action was hard to find”), `reason_too_many_steps` (“It took too many steps”), `reason_result_unclear` (“I couldn't tell whether it cleared”), and `reason_still_seemed_blocked` (“Access still seemed blocked”). The last choice is especially useful as a discrepancy signal, but it must not rewrite the native receipt as a failure.

Neither Screen Time prompt may enter production until a fresh signed, entitlement-enabled physical-device run proves the shield-to-Kwilt handoff and native clearing receipt on the release build. Source tests, Simulator compilation, Metro reload, and TestFlight availability are not enforcement proof.

## Why these four

Together, the pilots cover:

- an authoritative monetized outcome;
- a complete non-Money workflow;
- a focused UI checkpoint;
- a native-system workflow where blocker comprehension and clearing success must remain separate;
- two comparable Satisfaction prompts, with Ease and Clarity kept as separate diagnostic categories;
- Screen Time comprehension and clearing signals without treating either as proof that the target app reopened;
- real success boundaries that already have analytics anchors.

Unified Chat is excluded because its existing message-level feedback could duplicate or confound this pilot.

## Buildable slice

### Shared feedback utility

- A typed prompt registry. Callers provide only a registered `prompt_id`; the registry owns category, question version, copy, response scale, capability, workflow, checkpoint, invocation kind, reason codes, and minimum encounter count.
- A pure eligibility and suppression policy implementing the portfolio attention rules.
- An account-scoped or anonymous-install-scoped local repository for suppression metadata and timestamps. Ratings are not stored locally.
- A single host/provider that receives ephemeral prompt requests and presents the eligible request through the canonical `BottomGuide`.
- One-question response UI with an optional one-tap diagnostic-reason step after low or mixed responses.
- A PostHog-backed feature flag, `workflow-experience-pulse-v1`, that makes all registered requests inert when disabled.

### Portfolio attention rules

- The product context must still be valid when the guide is presented.
- Do not present over receipts, errors, recovery, paywalls, keyboards, modals, drawers, or another guide.
- Default minimum encounter count is two. A prompt may explicitly opt into first-use research, but none of these pilots do.
- At most one feedback guide per session.
- Fourteen-day global cooldown after submission.
- Sixty-day cooldown for the same prompt and version after submission.
- Thirty-day global cooldown after dismissal.
- Seven-day global cooldown after a shown guide has no terminal response because the app or session was interrupted.
- Expire a request when its originating context becomes invalid; do not surprise the person with it later.
- The first request to become visibly presented wins the episode and is immutable. A later, higher-authority outcome may claim the inline slot only when the earlier candidate was suppressed or cancelled before it became visible.
- Do not add random prompt sampling in V1. Sparsity comes from eligibility, encounter thresholds, and global cooldowns.

### PostHog events

- `workflow_feedback_shown`
- `workflow_feedback_dismissed`
- `workflow_feedback_submitted`
- `workflow_feedback_followup_submitted`

Only bounded, registered properties are emitted:

- `feedback_instance_id`, an opaque random identifier for one visible presentation and never a domain object ID
- `prompt_id`
- `question_category`
- `question_version`
- `capability_id`
- `workflow_id`
- `checkpoint_id`
- `invocation_kind`
- `response_value`
- `response_band`
- `reason_code`
- `sampling_policy_version`
- `outcome_class`, only when the outcome is already known

These properties must be added explicitly to the analytics property schemas and event registry so the existing privacy sanitizer does not silently remove them.

## Deliberately thin in V1

- Suppression does not synchronize across devices.
- Questions cannot be remotely rewritten; changing meaning requires a registry change and a new version.
- PostHog is the response event store. There is no first-party response table or database migration.
- There is no open-text response, support-ticket routing, NPS, app-review request, or general survey builder.
- No arbitrary screen may supply dynamic question copy or unbounded analytics properties.
- Dashboard automation is optional for the first learning release; trustworthy event ingestion and a reproducible query are required.

## Release channel

1. **Local and automated proof:** Verify registry validation, eligibility, cooldowns, request expiry, Screen Time first-visible-wins arbitration, and analytics-property sanitation with focused tests. Exercise all five prompt attachment paths in the development runtime where possible.
2. **TestFlight proof:** Enable the feature flag for founder/test accounts in a non-production reporting cohort. Confirm the exact question, guide priority, dismissal behavior, optional reason step, and all PostHog event properties. Screen Time additionally requires a fresh signed physical-iPhone run proving the shield handoff and successful native clearing path. Test responses must be excluded from product reporting.
3. **Production-small:** Enable the flag for eligible production users at only the five registered checkpoints. Because the attention policy is already sparse and Kwilt's population is still learning-sized, do not add percentage sampling initially. Screen Time remains individually disabled until its signed-device prerequisite passes. The flag remains an immediate portfolio-wide kill switch.
4. **Review before expansion:** Do not add prompts or relax cooldowns until Phase 5's HEART readout shows that responses are interpretable and the guide is not causing excessive dismissal or workflow disruption.

Feature-flag rollout controls who receives the learning release; it does not change the prompt's eligibility and suppression contract.

## Brand and interaction guardrails

- Ask one direct question about the moment that just occurred.
- Do not use guilt copy such as “Help us improve,” a survey title, progress indicator, or mandatory explanation.
- Keep the guide scrimless, accessible, and dismissible by close control or swipe.
- A positive response acknowledges and closes. A low or mixed response may offer bounded reason chips, always skippable.
- Never open the keyboard in V1.
- A negative answer must not alter service, trigger a public review request, or cause an immediate re-prompt.

## Reversibility

- Disable `workflow-experience-pulse-v1`; every caller request becomes inert.
- Remove or disable any prompt registration independently without changing the shared utility.
- Local suppression metadata can remain harmlessly on-device or be removed in a later cleanup.
- Historical PostHog events remain valid evidence under their recorded question and policy versions.
- No database rollback is required.

## Learning-release completion boundary

The slice is ready for Phase 5 measurement design when:

- each pilot is anchored to the verified product fact its question claims;
- each Screen Time prompt is anchored to its narrower native fact, with physical-device proof recorded for the release build;
- guide-priority conflicts have explicit resolution behavior;
- suppression and request-expiry logic have focused automated coverage;
- TestFlight proves the intended UI and event-property contract;
- production reporting can exclude founder/test responses and keep Satisfaction, Ease, and Clarity separate.

The exact decision thresholds, HEART scorecard, reporting cadence, and graduation rules belong in Phase 5.
