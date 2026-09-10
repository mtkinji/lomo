# Evaluate: does each concept improve the visit?

## Method

Start with Andrew's populated prototype review, then five participants across at least two households, including an organizer and a less frequent poster. Do not recruit or message anyone automatically; participant outreach is a separate authorized action. This is formative research, not a statistically powered experiment.

For each participant, observe uncoached tasks, then ask how the experience felt. Follow with one week of invited use to reveal interrupted drafts, real content mix, and revisiting. Make the expansion decision after that round, with explicit notes about limited sample and any untested scenarios.

| Concept | Task and question | Supports the bet | Disconfirms it / response |
|---|---|---|---|
| C1 | Find what Alex shared since you last looked, then finish. | Understands new state, reads and reaches endpoint. | Rail feels like a chore list or duplicates content confusingly → revise grouping/labels or move catch-up entry into People. |
| C2 | Notice a response and join its conversation. | Uses a real reply as an opening and understands who sees their reply. | Preview feels intrusive or audience unclear → revise preview/labels before broader release. |
| C3 | Explain a photo, a text story, a goal and a contribution. | Understands all, including plain text without decorative media. | Calls everything a task/update or misses the story → revise body hierarchy. |
| C4 | Save the place, then review an actual Goal invitation. | Distinguishes source actions from social response and reaches a working destination. | Assumes post access means Goal access → stop rollout of the misleading preview. |
| C5 | Explain a mixed pending/approved group; acknowledge if desired. | Notices the person and state; Thanks is understood as social. | Thanks mistaken for approval, or chores dominate Home → fix wording/hierarchy and test volume controls. |
| C6 | Save, organize, refind; then remove a collection. | Refinds post and knows removing a collection doesn't delete it. | Can't distinguish Saved from Explore or expects permanent access → clarify destinations and lifecycle. |
| C7 | Begin a photo post, interrupt, resume and choose audience. | Recovers draft and publishes exactly once to intended viewers. | Any accidental publication, loss or audience misunderstanding → block release and fix the causal path. |
| C8 | Scroll, inspect media, reply, open source and return; inject failure. | Position/state remain correct and recovery is understandable. | Jump, stale-account flash or incorrect success → block release until regression-tested. |

## Evidence and decision rules

Proposed comprehension target: at least four of five participants complete each ordinary task without coaching; every participant correctly identifies the final posting audience and pending chore state. Small sample results are directional. Any unintended disclosure, duplicate publication, lost durable draft or stale-account display blocks release regardless of completion percentages.

Proceed with a concept when its tasks pass, its authority/lifecycle scenarios pass, and participants describe a concrete benefit. Revise if two participants independently encounter the same friction. Revisit the framing if people can operate the feature but do not find it useful after the invited-use week. A low count of voluntary Thanks does not by itself disprove contribution visibility; ask whether it helped them notice someone.

## Instrumentation

Use an internal event ledger before adding analytics: `home_catchup_opened`, `home_catchup_finished`, `home_conversation_opened`, `home_source_action_result`, `home_save_result`, `home_draft_restored`, `home_publish_result`, `home_return_restored`. Include concept/bundle, coarse entry type, content type, outcome, recoverable error class and latency bucket. Use ephemeral correlation IDs where needed; do not send captions, names, precise coordinates, image URLs, collection names or raw private source IDs to general analytics.

Private seen records are product state, not author-facing read receipts or a behavioral marketing feed. Anonymous event totals cannot establish connection; pair them with direct feedback. Do not add public counters, engagement rankings, default push campaigns or automatic household-member comparisons.

## Next action after learning

Record concept-by-concept proceed/revise decisions in a future reflection artifact with actual evidence dates and build provenance. Update the feature brief's status and job-flow evidence only when implementation/use supports it. No reflection or shipping score is fabricated as part of this planning turn.
