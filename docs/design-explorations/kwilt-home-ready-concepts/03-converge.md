# Convergence: a connected Home visit

Choose a chronological, mixed Home with **people catch-up, conversational posts, distinct moment bodies, useful source previews, compact contributions, private saves, one editor, and stable navigation**.

## Qualitative comparison and bets

Ratings are design judgments, not research results. H/M/L mean strong/mixed/weak fit. The three dimensions are Maya's job / system fit / richness without repeated work.

| Concept | A | B | C | Accepted trade-off and bet |
|---|---|---|---|---|
| C1 | H/M/H | M/M/M | M/H/M | Add seen-state infrastructure. Bet recognizable people beat a digest for quick catch-up; if the rail distracts, keep catch-up available through People. |
| C2 | H/M/H | M/M/L | M/M/M | Add safe response summaries. Bet one real reply invites participation; remove the inline preview if it feels intrusive, retaining thread access. |
| C3 | H/H/H | M/H/L | M/L/M | Maintain a small body registry. Bet content-specific expression improves comprehension; revise individual bodies if source types become hard to distinguish. |
| C4 | H/M/H | M/H/M | M/L/L | Add authorized action availability where snapshots lack it. Bet one useful action leads to participation; use source detail when the decision is more complex. |
| C5 | H/H/H | M/M/M | M/H/M | Preserve immediate recognition over maximum compression. Bet grouped contributions earn voluntary acknowledgment; adjust viewing controls if volume crowds out moments. |
| C6 | H/M/H | M/L/M | M/L/M | Add private saves/collections, not a second shared audience. Bet people can refind meaningful content; simplify organization if collections go unused. |
| C7 | H/H/H | M/M/M | M/H/L | Multiple entry intentions, one lifecycle. Bet preview-led creation lowers effort without reducing audience comprehension. |
| C8 | H/M/H | L/H/L | M/L/M | More careful local state in return for continuity. Bet reliable recovery matters as much as visual polish; favor correctness whenever optimism cannot be reconciled. |

## Capability delta and activation

| Concept | Before → after | Natural activation | Proof signal |
|---|---|---|---|
| C1 | Scan everything → catch up with a particular person and finish | Home return with actual unseen posts | Finds a person's new moment and understands the finite endpoint |
| C2 | Open an empty-looking action → see appreciation and a conversational opening | Encounter a post with real responses | Voluntary reply connected to original context |
| C3 | Uniform cards → photos, stories and milestones each read well | Encounter different moment types | Correctly explains each without a tutorial |
| C4 | Generic link → understands the source and available next step | Interesting place, goal or real invitation | Completes intended action without authority confusion |
| C5 | Anonymous activity row → recognizes a person's household contribution | Actual chore transition | Distinguishes approval state and can give Thanks |
| C6 | Hunt through feed → save, organize optionally and refind | Bookmark a meaningful moment | Refinds it and distinguishes post save from Explore save |
| C7 | Form-first sharing → selected moment, caption, explicit audience | Create or successful source action | Publishes to intended audience after interruption |
| C8 | Refresh resets context → explore, respond and resume | Every read/action transition | Same position, correct response state, no lost draft |

## Improvement and system fit

Keep all eight concepts. Reduce repeated work and ambiguity: one post identity, one reply thread, one editor, one source-action owner. Retire the generic invitation-count banner as the primary explanation; actual source-backed invitations name the person and object. Keep a summary only when several need attention.

Do not turn the people rail into a second navigation bar. Home owns the mixed stream; People owns relationship browsing; Saved owns private revisiting. A household view filters existing visibility and does not change who the user is or who receives a draft.

Concrete hierarchy for the next visual concept:

```text
Menu   Home / All moments ▾              Create
Alex · 2 new    Maya · 1 new    Grandparents …
Needs you: Alex invited you to support “Garden” → Review
Alex's photo moment
  appreciation · caption · one reply · place preview
Sam's compact household contribution
Maya's text story
Jordan's goal celebration
```

The actual layout may need a tighter rail/invitation row on smaller phones; the first author and a meaningful portion of the first moment must remain visible at default text size. Large text prioritizes legibility over a fixed viewport composition.

## Accepted assumptions

Private saved collections first; chronological recent reply preview; one reaction per person as currently supported; manual photo descriptions; adult Home eligibility unchanged; no social push-notification expansion; no ephemeral Stories lifecycle. These are recommended product defaults for concept readiness, not observed preferences. The first mockup's duplicated Post actions are replaced by one bottom action in the next design.

No product decision is left as an unnamed implementation choice. Source identifiers, existing permission checks and available avatar endpoints still need technical verification during implementation. If an endpoint cannot support the specified experience, surface the gap rather than quietly widening data access.
