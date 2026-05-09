# Converge: kwilt-text-coach-action-agent

## Scoring against served JTBDs

| Alternative | `jtbd-carry-intentions-into-action` | `jtbd-capture-and-find-meaning` | `jtbd-move-the-few-things-that-matter` | `jtbd-trust-this-app-with-my-life` | Persona fit | Design-challenge fit | Notes |
|---|---|---|---|---|---|---|---|
| A — Text Follow-Through Coach | strong | strong | strong | partial/strong | strong | strong | Best balance of WOW, Kwilt-native fit, and scope control. |
| B — Relational Chief Of Staff | strong | strong | partial/strong | partial | strong for relational users | strong but narrower | Highest emotional willingness-to-pay, but risks becoming Kwilt-keep as a separate product. |
| C — Permissioned Activity Agent | strong | partial | strong | strong | medium | strong | Strategically important substrate, but too abstract as the first paid WOW. |
| D — Chapter-to-Action Concierge | partial | weak | partial | strong | medium | partial | Good add-on, not the core concept. |
| E — Household Keep Inside Kwilt | strong | strong | partial | weak/partial | strong for households | partial | Too much new ontology and privacy complexity for the first native move. |

## Chosen: Alternative A — Text Follow-Through Coach

The best first product shape is a **Kwilt Text Coach**: a Pro surface where the user can text Kwilt intentions, commitments, and outcomes; Kwilt captures them, turns low-risk items into Activities or follow-up prompts, helps with drafts/next steps, and closes the loop later. This should be Kwilt-native, not a separate Kwilt-keep product: every saved intention should become or connect to Kwilt Activities, Goals, Arcs, Chapters, and show-up evidence.

Alternative B's relational chief-of-staff wedge should shape the first WOW examples, because relational follow-through is emotionally monetizable: birthdays, check-ins, apology drafts, grief/illness support, kid/partner rituals, and "call Dad" drift. But the product should not start as a household workspace. Start with one-user, private-by-default text coaching; let household/shared memory become a later expansion if the wedge proves paid demand.

## Trade-offs accepted

- Start with SMS/text as the first high-WOW surface instead of a general agent-permission UI.
- Let the first monetizable examples lean relational, while still tying actions back to Kwilt Activities and Arcs.
- Allow standing permission for bounded Activity creation/follow-up, but keep Goal changes as proposed and Arcs never silent.
- Make drafts to other people allowed; autonomous sending to other people explicitly out of scope.
- Treat Kwilt-keep's household/shared model as future evidence, not v1 scope.

## Trade-offs explicitly rejected

- Reject a pure **Permissioned Activity Agent** as the launch framing because it is powerful but not emotionally legible enough to sell.
- Reject **Chapter-to-Action Concierge** as the core because it waits for reflection instead of meeting intentions in the moment.
- Reject **Household Keep Inside Kwilt** for v1 because it introduces People/Memory/Member/shared-private complexity before proving the one-user text coach.
- Reject external auto-send because it crosses the trust boundary too early.

## The bet

We're betting that **text-native follow-through will create more monetizable WOW than in-app planning or extra AI credits** will be true. Specifically: users will pay when Kwilt helps them capture an intention in text, prompts at the right moment, reduces activation energy with a draft or concrete next step, and logs the loop closed with almost no app management. If it turns out not to be true, we'd revisit by narrowing to the highest-signal relational use case from Kwilt-keep rather than broadening into a generic agent platform.

## Success signal (qualitative or quantitative)

Within 30 days of beta, a Pro-intent user should have at least one remembered intention that Kwilt later prompts at the right time, with the user replying "done" or accepting a draft/Activity. Qualitatively, users should describe the feature as "Kwilt helped me actually show up" rather than "Kwilt reminded me."

## Recommended documentation shape

- Add a new JTBD sub-job under `jtbd-move-the-few-things-that-matter`: `jtbd-carry-intentions-into-action`.
- Create a new feature brief: `docs/feature-briefs/kwilt-text-coach.md`.
- Keep the existing Weekly Planning Agent feature brief as a narrower background ritual, but eventually relate it to this broader follow-through agent.
- Later, update growth strategy to make "Text Coach / Follow-through Agent" the sharper Pro pillar than "Weekly Options."
