---
id: brief-summary-freshness-recovery
title: Summary Freshness Recovery
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-put-intention-before-impulse]
related_briefs: [brief-plaid-transaction-backed-meter, brief-prediction-trust-contract]
owner: andrew
last_updated: 2026-07-06
---

# Summary Freshness Recovery

## Context

When the current-month connected snapshot fails, Summary currently protects the user from stale or fake spend by hiding the charts. That safety rule is right, but the presentation should feel recoverable and centered on the page rather than like a carded dashboard error.

The product problem is freshness trust: if current month fails while prior months can still show data, the user needs to know what is fresh enough to act on and what to do next.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `see-budget-reality`
- Current score: 4
- Expected delivery change: 4 -> 4 if the state becomes more recoverable; score should not increase until live snapshot reliability and app-gate freshness are proven.
- Evidence required: Summary current-month success -> failed retry keeps charts visible with stale footer; no-snapshot failure still shows centered retry state.
- Map update trigger: after simulator or TestFlight verification proves the recovery path.

## Product Decision

Summary should treat current-month snapshot failure as a stale-while-refreshing freshness state:

- pull-to-refresh should reread the latest available Kwilt DB snapshot
- while Summary is open, relevant DB changes should automatically refresh the snapshot
- preserve the last successful current-month snapshot when a later refresh fails
- label retained charts as not newly refreshed
- center the unavailable state in the page body
- remove the card frame
- explain that current month waits for a fresh account snapshot
- note that prior months may still show saved history
- provide pull-to-refresh and a compact retry button

## User Story

As Maya, when current-month spending cannot refresh, I want the app to keep showing the last trustworthy view when it has one and tell me it could not refresh yet, so I do not lose confidence or act on fake freshness.

As Maya, when a new transaction appears in Kwilt's data while I already have Summary open, I want Summary to update without making me leave and come back.

## Acceptance Criteria

- Current-month snapshot failure does not render category charts when no prior current-month snapshot exists.
- If a current-month snapshot has already loaded, a later refresh failure preserves those charts.
- Preserved charts show a footer freshness label that says refresh did not complete.
- The unavailable state is centered and not framed as a card.
- The state includes a retry action.
- Pull-to-refresh reruns the same connected snapshot load.
- Relevant transaction, connection, forecast-setting, and match-rule DB changes trigger a Summary refresh while the screen is open.
- Live DB refreshes are debounced so a multi-row sync only causes a compact UI refresh.
- Prior-month copy distinguishes saved history from current-month freshness.
- Preview and prior-month behavior remain unchanged.

## Spec Refinement

Resolved product question: show last-known current-month data after a failed refresh, but label it as not newly refreshed. Hide current-month charts only when there is no prior trustworthy current-month snapshot.

Implementation should stay inside Summary and the shared page shell. Do not add account repair routing until errors can be classified as account-specific.
