# Origin: post-launch budget invitation, review and explanation

Reference ID: `REF-2026-09-28-origin-post-launch-budget`  
Received/cataloged: 2026-09-28. Actual capture date, app version and device model unknown; screenshots show iOS chrome.  
Source: Andrew's nine supplied attachments in six batches (eight unique images), his identification of the previously captured drawer as an earlier screen, and his firsthand reports of timed section reveals and dragging the budget handle to change savings.  
Levels: flow, page, group. Tags: post-launch, budget, invitation, synthesis, loading, evidence, explanation, payoff.  
Status: captured evidence; Candidate learning extension, not an approved Kwilt feature or implementation.

## Evidence and provenance

The eight supplied JPEGs are copied unchanged into the local Git-ignored `private/` directory. They include personal financial information; do not publish or upload them without separate review/redaction. Local storage is not cloud backup. Production must not import reference screenshots.

| Local asset | Original attachment | Visible state |
| --- | --- | --- |
| [Gathered summary](private/gathered-summary.jpg) | `1-Pasted-Image-1.jpg` | “Here's what we gathered”; six-month review description, income/expense/savings summaries, diagnosis and Continue |
| [Reviewing spending](private/reviewing-spending.jpg) | `2-Photo-2.jpg` | Light outer shell, large rounded dark panel, Origin mark and “Reviewing your spending habits…” |
| [Diagnosis scroll position](private/gathered-diagnosis-scroll.jpg) | Batch 2: `1-Pasted-Image-1.jpg` | Three diagnosis items with supporting paragraphs on the same gathered-summary page |
| [Meaning scroll position](private/gathered-meaning-scroll.jpg) | Batch 2: `2-Pasted-Image-2.jpg` | Lower findings followed by an outlined “What this means” synthesis |
| [Suggested monthly budget](private/suggested-budget.jpg) | Batch 3: `1-Pasted-Image-1.jpg` | Suggested amount and six-month bar chart with dashed target line |
| [Suggested-budget rationale](private/suggested-budget-rationale.jpg) | Batch 3: `2-Pasted-Image-2.jpg` | Chart above an outlined explanation with three supporting bullets |
| [Finalize budget](private/finalize-budget.jpg) | Batch 4: `1-Pasted-Image-1.jpg` | Monthly amount, slider-like range control, potential-savings explanation and “Set budget” action |
| [Ambitious budget state](private/finalize-budget-ambitious.jpg) | Batch 5: `1-Pasted-Image-1.jpg` | Lower amount, amber/olive range and consequence panel, savings described as ambitious |

Original attachment directory: `/tmp/codex-remote-attachments/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/886DE790-C8D1-43BF-985B-36E981A98559/`. Exact byte hashes are retained in the private manifest.

Batch 2 directory: `/tmp/codex-remote-attachments/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/73DB7945-0744-4C52-A87B-74F033D7F8A3/`. Received September 28; actual capture date/version remain unknown. Andrew explicitly identifies these as scrolling down within “Here's what we gathered,” not additional pages.

Related earlier capture: [“Your budget is ready” drawer](../drawer-background-2026-09/source.md), `REF-2026-09-28-origin-drawer-background`. Reused in place, not duplicated. The original study remains the authority for the selected background-obscuring quality.

Batch 3 directory: `/tmp/codex-remote-attachments/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/37BA5CF9-EC9C-4E7B-B676-A2945B086910/`. Received September 28; capture date/version unknown. Andrew calls these the next screens. Their overlapping chart and clipped amount panel support two views of the same suggested-budget page rather than two mandatory steps.

## Relationship to the first-run archive

Andrew explicitly identifies these as screens from actual app launch **after** the [previously documented first-run process](../first-run-2026-09/source.md), with the drawer earlier. Do not append them as known mandatory steps before the original dashboard or silently renumber the original 27 captures.

Known relationship: documented first run → later in-app budget experience, including the earlier drawer and these two states. The supplied attachment order is summary then loading. Loading → summary is a plausible semantic order, but the exact transition order, initiating tap, intervening screens and whether this is mandatory remain unverified. No recording or live interaction was observed.

## What is visible

Batch 4, received September 28: Andrew identifies “Finalize your budget” as the next screen after the suggested-budget page. Original attachment directory: `/tmp/codex-remote-attachments/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/726AF97B-8295-4B44-8502-644F28F02732/`. Capture date/version remain unknown.

### Finalization: recommendation becomes an explicit commitment

Batch 5 adds a second visible state of this same screen (received September 28; capture date/version unknown). Original attachment directory: `/tmp/codex-remote-attachments/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/C246D63D-DA9B-4691-8CE5-9AC4730111EB/`. The selected amount is below the still-displayed recommended range. The range strip and savings panel change from green to amber/olive, the projected savings and spending comparison change, and the copy now describes the goal as ambitious. The same “Set budget” action remains visible; its enabled behavior is not tested.

This pair establishes **value-dependent visual and verbal states**. Follow-up batch 6 resolves one interaction uncertainty through Andrew's firsthand observation: “I was also able to drag the handle to change the savings amount here.” Drag adjustment is therefore user-confirmed, not inferred from stills. The screen labels the primary value Monthly budget and the dependent outcome Potential savings; describe the interaction as adjusting the budget/savings trade-off rather than assuming a separate savings input. Continuous versus release-time recalculation, exact bounds/increments, haptics and track/thumb mechanics remain unknown.

Batch 6 was received September 28 from `/tmp/codex-remote-attachments/01a0a6bf-5ee1-7a72-8dae-a5e31f9bf0d3/65A3350C-0BE1-446B-A130-1547B0B2235A/1-Pasted-Image-1.jpg`. Its SHA-256 exactly matches the preserved ambitious-state capture, so reuse that original and record the additional provenance in the private manifest instead of duplicating the asset.

Candidate lesson: an adjustment should explain its consequences and practical trade-off, not simply reward a larger projected savings number. Couple semantic state color with explicit wording; never rely on hue alone. For Kwilt, use the canonical semantic-color contract and domain-supported calculations. Do not import Origin's thresholds, characterize a user's choice without evidence, or assume the same feedback belongs in every capability.

- A short heading and income-based explanation introduce an outlined group containing the monthly amount, a slider-like control with a marked band, and a recommended range in text.
- A separate filled group explains potential savings and comparison with typical spending. These remain Origin's projections, not guaranteed savings or validated calculations. The screenshot does not show whether the figures update when the control changes.
- The action changes from generic “Continue” to specific “Set budget.” This visibly distinguishes reviewing a suggestion from a commitment action. Back and close remain visible.
- Drag adjustment is confirmed by Andrew's report. Direct amount editing, valid bounds, defaults, confirmation, persistence, error recovery and the destination after setting the budget remain unverified. No saved-result screen has been supplied.

The reported narrative is now: **gathered evidence and interpretation → suggested budget and rationale → finalize and set budget**. Earlier invitation/review captures remain linked, with their exact handoffs still unverified. Scroll positions within the explanation pages do not become additional steps.

Candidate translation: explain the recommendation before asking for commitment; at the decision, show the adjustable proposal and its consequences together, then use an action that names the change. Map this to an existing capability-owned decision, not a new generic editor. Preserve a clear proposed-versus-saved distinction and verify persistence before announcing completion. Do not import Origin's range, savings formula, financial claims or slider merely for visual similarity.

Batch 3 extends the reported sequence: gathered evidence/interpretation → suggested monthly budget with rationale. It does not resolve the earlier loader's exact position or show the destination after this recommendation.

- **Invitation drawer:** “Your budget is ready,” a category-budget preview, a brief reassurance that preparation is done, and “Unwrap it.” A close control remains visible. The underlying app is dimmed and visually obscured. The preview's numbers are not proof of a saved personalized budget.
- **Review state:** a branded, focused waiting surface names the work rather than merely saying “Loading.” Back and close controls are visible outside the panel. The still does not prove animation, duration, cancellation or actual computation.
- **Gathered summary:** the heading describes completed review; a six-month window is stated. Two comparable figures share one row and a third savings figure is emphasized below. A diagnosis section moves from totals to an interpretation about several negative months. Continue sits in a bottom region separated from the body. Batch 2 and Andrew's narration establish scrollable content; the next destination remains unknown.

### Same-page detail revealed by batch 2

The content order is now evidenced: headline/window → average figures → “Our diagnosis” → three findings → “What this means.” This is one scrollable explanatory page, not a forced sequence of five onboarding screens.

- The findings have small leading icons, concise emphasized titles and longer supporting paragraphs: “Three months ended negative,” “Income and spending fluctuate,” and “Flexible spending has room.” The content progresses from observed history to variability, then a possible area to investigate.
- The outlined concluding group summarizes the evidence and points toward a savings target. It is interpretation, not proof that a plan has been created or accepted. The origin of that target is not visible.
- Back, close and Continue remain in consistent visible locations across the supplied scroll positions. This supports a persistent-navigation/action reading, but does not establish the implementation, scroll thresholds or disabled states.
- The lower capture shows body text entering the status/navigation area. Treat top masking/safe-area handling as a potential weakness to inspect, not a visual detail to copy. Native scroll and accessibility behavior remain untested.
- There is a possible consistency issue: the shopping average in the detailed finding differs from the “recurring shopping” amount in the concluding paragraph. Different definitions could explain it, but the screenshot does not clarify them. Do not treat these as verified comparable metrics or repeat private values in public notes.

### Candidate lesson: layered explanation without extra gates

Preserve a quick summary for scanning, then evidence and interpretation in the same page, with a reachable continuation. This is depth through scrolling, not hidden-on-demand disclosure. Translate through domain-owned evidence and canonical typography/action-dock behavior. Short finding titles should carry the scan; longer text should add distinct reasoning rather than repeat the summary.

Do not copy the paragraph density, low-contrast decorative icons, unexplained target or apparent metric inconsistency. For Kwilt, each conclusion must trace to the same evidence definitions, and uncertain classification must remain uncertain rather than becoming confident advice. This does not authorize a new diagnosis feature or impose this amount of analysis on every capability.

The review-window statement does not establish account coverage, classification accuracy, treatment of transfers or the precise averaging method. The diagnosis is Origin's claim, not a verified assessment by Kwilt. Avoid reproducing private amounts in public documentation.

## Learning added to the existing analysis

### Suggested budget and reported soft section reveal

The recommendation page leads with one proposed amount, then a six-month chart with a dashed reference line, followed by an explanation. The visible rationale compares the target with historical spending, describes the projected savings implication and discusses variation across months. These are Origin's recommendations, not verified financial conclusions or a Kwilt calculation contract. The chart's exact data definitions and the action performed by Continue are not established; it does not prove acceptance or persistence.

Andrew explicitly reports: “they animate in each of the informational sections gradually on a time delay, kind of like you would on a marketing website,” and identifies the “gradual, soft reveal” as an important part of the impression. Record this as **user-observed temporal behavior**, not an inference from JPEGs. Exact delays, easing, opacity/translation technique, offscreen behavior and replay/accessibility rules remain unknown.

Candidate translation: treat section reveal as a deliberate part of reading order—one meaningful content group at a time—rather than only animating the page transition. The static layout and the temporal presentation should tell the same story. See [staged informational reveal](../first-run-2026-09/pattern-extraction.md#candidate-staged-informational-reveal) for scope and safeguards. This captures the selected quality without approving an arbitrary duration or adding artificial processing time.

The experience does not stop at a welcome funnel. Origin also packages a capability inside the app as **an invitation to receive something prepared**, then makes the work and reasoning legible. That is a useful extension of the promise-led pattern beyond first launch.

The explanatory result is stronger than a naked statistic: it gives scope, a compact summary and an interpretation. These are distinct roles and should not be mislabeled as actions already taken.

There is also a tension worth preserving: “ready” on the drawer followed by a possible review stage may mean prepared data, a preview, or further work on entry. The captures do not settle it. Kwilt should say precisely what is ready rather than copy this wording while still needing setup or computation.

## Preserve / Translate / Reject

| Preserve | Translate into Kwilt | Reject |
| --- | --- | --- |
| Inviting entry into a specific prepared benefit | Contextual invitation naming what actually exists and where the CTA goes | Claiming “ready” before the result exists or forcing another launch gate |
| Named work during a wait | Capability-owned truthful phase with canonical `KwiltLoader` | Artificial delay, fake analysis or a new branded spinner |
| Scope → compact evidence → interpretation | Actual supported result, its coverage/limitations, then one relevant continuation | Invented calculations, universal six-month requirement or unsupported diagnosis |
| Deliberate grouping of comparable values | Semantic typography and domain-owned facts on Kwilt surfaces | Copying black styling, serif typography, exact pixels or finance metrics into every capability |
| Dismissible contextual surface | Existing shared drawer and established return behavior | Assuming visible close/back controls prove cancellation or persistence |

## Candidate mapping and proof still needed

Extend [PAT-onboarding-promise-led](../first-run-2026-09/pattern-extraction.md) to optional first-use invitations within an already usable app. It must not require replaying authentication, purchase or the brand introduction.

Potential owners to inspect: capability entry/presentation host; `src/ui/BottomDrawer.tsx` for an appropriate modal invitation; `src/ui/KwiltLoader.tsx` for progress; canonical action docks for continuation; capability-owned analysis/result logic (Money's `MoneySetupScreen.tsx` is a starting point, not a claimed implementation match).

Before specifying or applying a Kwilt variant, verify the actual entry trigger, readiness state, persisted result, back/close and retry semantics, access/entitlement state, and destination. Review partial/missing evidence, errors, real loading, small screens, enlarged text, contrast, focus and Reduce Motion. No app code, product behavior, rule maturity or runtime acceptance changes in this capture.

Refresh when the next Origin screen/recording arrives or before translating this into a concrete Kwilt storyboard.
