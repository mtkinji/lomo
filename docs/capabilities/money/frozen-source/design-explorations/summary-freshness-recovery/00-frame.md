# Frame: summary-freshness-recovery

## What the user said

> I wouldn't put that message it in a card, and I'd center it on the page. Beyond that, what do I do if I get that message? It was just working a minute ago so I don't know why it can't load this month, when it can load prior months.
>
> It gives me some reason to doubt that I know if I'm operating on fresh data. Makes me want to pull to refresh.

## Restated in user voice

When the current-month Summary cannot load connected spend, Maya wants to know what is unavailable, whether any visible data is still fresh, and what she can do next, so she can keep trusting the app before making a spending decision.

## Target audience

`audience-aspirational-family-organizers` - households trying to stay organized without adopting a finance or productivity methodology.

## Representative persona

Maya wants a calm budget-reality check before spending. She is not trying to troubleshoot Plaid, schema state, or sync internals.

- Current situation: the Summary can show prior months while hiding the current month when the live connected snapshot fails.
- What she is trying to do: understand whether she is okay to spend right now.
- Emotional tension: a freshness failure makes the whole budget surface feel less knowable.
- What would feel wrong: a dashboard-style error card that explains internal caution but does not give a next action.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - money surfaces need transparent, recoverable truth.

## Job flow step

`connect-spend-source` and `see-budget-reality`.

The failure starts in the trust foundation step: "Is this budget based on real spend?" It appears during the core value-unit step: "Am I okay to spend right now?"

## Active anchors

- `jtbd-trust-this-app-with-my-life` - the app must be honest about freshness.
- `jtbd-review-budget-reality-before-spending` - the user needs current enough budget reality before acting.
- `jtbd-put-intention-before-impulse` - the pause should support a choice, not create doubt.

## Friction we're addressing

The existing error state correctly avoids showing stale or fake zero spend, but it reads like a dead-end explanation. Prior-month availability makes the current-month failure feel inconsistent, and the user has no explicit recovery path.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: Summary in `app/(tabs)/index.tsx`.
- Existing user flow: signed-in users load the current-month connected snapshot; preview and prior months can use repository snapshots.
- Existing domain/data model: `getConnectedSpendBudgetSnapshot()` assembles Plaid transactions, connections, forecast settings, and match rules.
- Existing technical affordances: navigation focus refresh, native `RefreshControl`, retryable snapshot load, last sync labels.
- Existing UX/copy conventions: plain money language, restrained icons, compact actions, no provider jargon by default.

Constraints to preserve:

- Do not show stale current-month charts as if they are fresh.
- Do not make the user debug backend/provider internals.
- Keep the Summary focused on current budget reality.

Constraints we may challenge:

- Current error copy hides the exact failure and gives no action.
- The error presentation uses a card even though it is a whole-page unavailable state.

Design implication:

The unavailable state should be centered and action-oriented, with refresh as the primary recovery behavior. A fuller freshness contract can come later, but the first release should make the current failure recoverable and less dashboard-like.

## Aspirational design challenge

How might we help Maya recover confidence when current-month spend cannot refresh, while preserving Kwilt Money's honest refusal to show stale or fake current data?

## Out of scope

- Building a complete Plaid repair flow.
- Showing raw Supabase or provider errors to normal users.
- Changing prior-month data sourcing.

## Open question

Should Summary keep and label the last known current-month snapshot after a failed refresh, or continue hiding it until a fresh read succeeds?
