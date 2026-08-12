---
id: job-flow-maya-feed-household-with-less-work
audience: audience-aspirational-family-organizers
persona: Maya
hero_jtbd: jtbd-move-the-few-things-that-matter
last_updated: 2026-08-05
---

# Maya: Feed the Household With Less Work

## Audience / Persona

Audience: `audience-aspirational-family-organizers`
Persona: Maya

Maya is not trying to become a meal-planning expert, couponer, pantry clerk, or
household project manager. She wants to preserve the food her family loves, give
everyone an appropriate voice, make one realistic decision about the next few
meals, and carry that decision through shopping and cooking without rebuilding
the work in four different apps. Depending on the week, she may begin with meals,
the money left, food already at home, or an unusually good price at the store.

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Help me make real progress in the few
areas I most want to grow.

In this situation, progress means that the household gets fed with less mental
load. The unit of value is a completed food cycle, not a saved recipe, a full
calendar, a coupon count, or an exported shopping list.

## Trigger and desired progress

The job becomes active when the next shopping or cooking horizon is close enough
that Maya can feel the unanswered questions: What will we eat? Will anyone want
it? Do we have the ingredients? What will it cost? Who is cooking? The horizon
may be a week, two weeks, three dinners, or simply the next trip to the store.

Maya wants to move from that uncertainty to a small set of meals her household
will plausibly eat and can reasonably afford, one reviewed list, an honest
purchase handoff, and a calm cooking experience. The next cycle should begin
with more remembered knowledge, less wasted food, and less repeated work.

## Job stories

### Preserve food knowledge

When I find a recipe worth keeping or remember one that lives on paper, help me
turn it into a clean, trustworthy family recipe with almost no transcription, so
I can find and cook it without ads or losing where it came from.

### Choose what is realistic

When another shopping cycle is approaching, help me choose a manageable number
of meals for the actual cadence and constraints we have, so planning does not
become a rigid weekly-calendar chore.

### Give the household a voice

When other people will eat the food, let each invited person weigh in quickly
and privately, so they feel heard without making me chase responses or surrender
the final decision to a vote.

### Plan to the money that is really available

When food spending needs a boundary, help me understand the current Food budget,
choose a realistic target for this shop, and see the quality of the basket
estimate, so I can make a tradeoff without confusing monthly plan room with cash
safe until payday.

### Use what we already have

When food is already in the pantry, fridge, or freezer, help me confirm only the
stock that matters and turn it into meals, so I can avoid duplicates and waste
without maintaining a perfect inventory.

### Make an opportunistic buy useful

When I find something genuinely cheap at the store, help me see whether it fits
our budget, storage, preferences, and likely meals, then offer the smallest plan
change that would give it a real use.

### Buy with confidence

When a direction is settled, turn the meals, food on hand, spending target, and
current price evidence into one understandable list and at most a few worthwhile
changes, so I can spend well without learning coupon strategy.

### Finish the retailer handoff

When I am ready to buy, move as much reviewed work as the retailer allows into
pickup, delivery, or an in-store list, so I do not have to reconstruct the cart
while still understanding what remains for me to verify.

### Cook without juggling the phone

When my hands and attention are occupied, keep my exact place, tell me one useful
thing at a time, operate timers, and wait for me, so cooking feels guided rather
than like reading a long chat response.

### Make the household wiser over time

When we finish a meal, remember the small truths that matter—who liked it, what
we changed, how much we needed—so the next plan starts better without creating a
tracking ritual.

## End-to-end job flow

The delivery scores below describe the current Food branch and its known proof
boundary on August 11, 2026. Source and unit-test presence are not treated as
signed-device proof. The collaborative Plan schema, RPCs, and grocery compiler
are live-backend and iPhone Simulator proven; multi-account collaboration,
signed-device haptics, and actual Kroger fulfillment results remain separate gates.

| # | Job step and user question | Desired outcome | Current Kwilt offering | Score | Main gap / next evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | **Collect what is worth keeping.** “Can I get this paper recipe, URL, voice memory, or idea into one place?” | A fast import starts from the source already in hand. | Recipe library, manual entry, and import-review foundations exist; contracts cover photo, scan, URL, text, voice, email, copy, and catalog provenance. | 2 | Complete real extraction paths, evidence display, and a 50-source quality corpus; prove photo capture on a signed device. |
| 2 | **Make the recipe trustworthy.** “Did Kwilt understand this correctly, and can I fix it?” | Uncertain fields are obvious; approval produces a durable private recipe with attribution. | Evidence-backed import-draft and immutable Recipe-version contracts exist, with review UI. | 2 | Prove storage/RLS, field-to-evidence review, retries, full deletion, and private media retention behavior against the intended backend. |
| 3 | **Recognize whether it fits tonight.** “Does this look good, how long will it take, and can I make enough?” | A visually compelling Recipe Home answers appetite, time, yield, source, and readiness before showing dense detail. | Current cooking screen exposes title, yield scaling, ingredients, directions, notes, source, edit, and export. | 1 | Separate Recipe Home from Cook Mode; add hero media, human time, readiness, non-conflicting scaling, planning action, and visual hierarchy. |
| 4 | **Keep a useful shortlist.** “What might we want to make next?” | Maya keeps one living household Plan without manufacturing calendar precision or maintaining planning periods. | Recipes owns one persistent household Plan with active count, reversible participation, and no required cadence. Live backend and Simulator persistence are proven. | 3 | Prove weeks-long use across one-person and multi-person households, including offline recovery. |
| 5 | **Bring in the spending boundary.** “What can this shop reasonably use?” | Maya sees authorized Food-category reality from Money, its period/freshness, and chooses a distinct trip target; manual target remains available without Money setup. | Money can expose category plan/spend/remaining truth, while Food proposals can reference authorized Money evidence. No Food-specific projection or trip-target contract exists. | 1 | Add a purpose-limited `FoodBudgetEnvelope`, trip-target ownership, remaining-shop assumptions, and copy/tests distinguishing category room, target, estimate, paid total, and cash-safe evidence. |
| 6 | **Confirm the food that matters.** “What can we make with what is already here?” | A quick review distinguishes confirmed, likely, and check-first stock; recipes show Make now, Almost there, and Use soon when evidence supports it. | Already-have is an ephemeral list review; no durable confidence-aware stock observation or stock-to-recipe query exists. | 1 | Add progressive photo/voice/receipt/manual observations, cautious confidence decay, correction/depletion, quantity ranges, safety boundaries, and proof that upkeep removes more work than it adds. |
| 7 | **Prepare a plausible short list.** “What should we actually consider?” | AI prepares explained candidates from authorized recipes, family preferences, budget target, confirmed/likely stock, recent meals, time, and current price opportunities; Maya edits freely. | Meal-plan editor, lifecycle contracts, and AI-operation design exist. | 2 | Add constraint snapshots, price coverage/freshness, pantry-first and budget-first retrieval, two or three scenario comparisons, and proposal receipts. |
| 8 | **Gather household input.** “What will everyone actually eat?” | Household members nominate and support recipes in seconds without turning dinner into a formal vote or shaming non-response. | The shared Plan gives each recipe one compact, reversible support reaction plus tappable participant avatars; adds imply initial support. Optimistic stability is live-Simulator proven. | 3 | Prove simultaneous Realtime behavior, role boundaries, avatar disclosure, and comprehension with two household accounts and a child account on signed devices. |
| 9 | **Make the final call.** “What are we really committing to?” | Maya can commit any useful subset to shopping while the rest stay available as ideas. | Contextual multi-select sends only chosen Ideas to Groceries; Sent and Ready groups communicate stronger intent without locking or finalizing the Plan. | 3 | Prove conflict recovery and adult/child authority with simultaneous household actors. |
| 10 | **Compile one correct list.** “What do these recipes require?” | Ingredients merge conservatively with recipe provenance; uncertain matches remain separate; removing a recipe unwinds only its unpurchased contribution. | The live Plan compiler retains candidate-scoped quantities and source identity, merges requirements, derives readiness from actual item completion, and reconciles sent-recipe removal. The complete flow is Simulator proven. | 3 | Add signed-device and multi-recipe shared-ingredient observation, offline recovery, and actual retailer fulfillment-result proof. |
| 11 | **Account for the household.** “What do we already have, and what else do we need?” | Already-have is an ephemeral review; staples and household requests join the durable list without corrupting recipe provenance. | Already-have and item-edit screens exist. | 2 | Add fast pantry review, household additions, list collaboration, aisle/store organization, and conflict receipts. |
| 12 | **Improve the plan and basket together.** “Is there a meaningful way to spend less or use more of what we have?” | At most a few scenarios compare changed meals, grocery gaps, basket range, price coverage, stock use, and household trade-offs. | Savings Autopilot, price-evidence vocabulary, Kroger adapter, and optimizer are planned, but savings currently begins after the meal plan. | 1 | Add deterministic scenario diffs and a preserved baseline; rank net household usefulness rather than coupon count or lowest nominal price. |
| 13 | **Adapt to a useful store opportunity.** “This is on sale—should I buy it, and what would change?” | Maya captures a price tag/barcode/voice observation, sees comparable price, budget/storage/meal fit, and reviews the smallest plan/list change. | No `StoreOpportunity` capture or cross-capability replanning contract exists. | 1 | Add temporary evidence, confidence/expiry, package and likely-waste constraints, plan/list diffs, explicit acceptance, already-bought reconciliation, and low-connectivity store behavior. |
| 14 | **Reach a buying surface.** “Can I get this into pickup, delivery, or a usable store list?” | A reviewed list becomes a retailer handoff where supported, with plain export always available and remaining retailer review stated plainly. | Smith's store selection, explicit product-match review, protected Kroger OAuth/cart-add, ambiguous-write recovery, and plain export are source-proven; production schema/functions are deployed but remotely disabled pending Kroger credentials. | 2 | Register the production callback, set Kroger credentials, prove Saratoga Springs product coverage and a disposable Smith's cart on a signed device, and never claim ordered without order evidence. |
| 15 | **Prepare before cooking.** “Do I have what I need, and what should happen first?” | A brief readiness view covers equipment, preheating, prep, and missing ingredients before the guided session begins. | Ingredients and directions are available on one scrolling screen. | 1 | Add derived readiness cues, ingredient check state, serving lock, and a deliberate Start cooking transition. |
| 16 | **Cook one cue at a time.** “What do I do now?” | The current cue dominates; quantities appear in context; next/back/repeat, timers, and screen-awake behavior are dependable. | Clean scrolling recipe view and screen-awake support exist. | 1 | Add deterministic cook-session state, cue derivation, persistence/resume, timers, one-cue UI, inline ingredient references, and physical-device proof. |
| 17 | **Stay hands-free.** “What’s next?” | Foreground voice advances, repeats, goes back, answers recipe-grounded questions, and pauses while making listening/thinking/speaking states obvious. | Kwilt has native push-to-record voice infrastructure in Chat, but no continuous cooking-session transport. | 1 | Complete a physical-device feasibility spike; implement command-first voice, interruption, TTS, privacy controls, and graceful touch fallback. Do not promise a background custom wake word. |
| 18 | **Keep what was learned.** “What should we remember next time?” | A reviewed receipt and two-tap cook finish can retain actual spend, price, purchased-stock observations, private note, serving correction, and household signal without collapsing Money, Grocery, and Recipe authority. | Recipe notes and receipt/savings contracts exist; stock reconciliation, cook records, and multi-capability receipt review do not. | 1 | Add inspectable line mapping, capability-specific receipts, correction/deletion boundaries, cook records, and next-cycle use. |
| 19 | **Begin again with less work.** “Can Kwilt prepare the next cycle without making me manage it?” | A recurring Activity or contextual card invites contributions at the right cadence, resumes prior preferences and useful stock/price learnings, and presents an editable prepared plan. | Activity action-card platform and recurrence concepts exist. | 2 | Add food-owned recurrence semantics, skip/snooze/change-cadence controls, evidence decay/freshness, proposal receipts, and longitudinal household proof. |

## Critical path

```text
Capture or find recipe
        ↓
Trust Recipe Home and choose servings
        ↓
Start from meals, budget, food on hand, or a store opportunity
        ↓
Keep one living Plan + optional trip target + confirm relevant stock
        ↓
Add ideas ←──────── household support reactions
        ↓
Send a chosen subset to Groceries
        ↓
Compile + review groceries ── compare evidence-backed scenarios
        ↓                              ↑
Capture a store opportunity ── review the smallest plan/list change
        ↓
Retailer handoff or plain list
        ↓
Ready to cook → Made → optional learning
        ↓
Prepare the next cycle with less repeated work
```

The plan is allowed to branch, pause, or omit participation and retailer
integration. It must not strand the user. Manual recipe entry, organizer-only
planning, plain grocery export, and touch cooking remain complete fallback paths.

## Job-flow principles

- **Plan around the next shop, not a calendar convention.** A week is an option,
  never the product model.
- **Starting point is context, not identity.** Meal-first, budget-first,
  pantry-first, and sale-first are ways into one adaptive plan, not user modes.
- **Money owns the budget; Food owns the trip target.** Monthly category room,
  trip target, basket estimate, paid total, and cash-safe evidence stay distinct.
- **Stock is observed, not magically known.** Confirmed, likely, check-first, and
  depleted states preserve usefulness without a pantry spreadsheet or false
  precision.
- **Household membership is eligibility, not content access.** Every invitation
  names the exact plan round and participants.
- **Participation informs; the organizer decides.** Responses are private and
  bounded. Majority vote does not silently finalize dinner.
- **AI prepares and operates; capabilities own state.** The same typed operation,
  authority rule, validation, and receipt applies whether work begins in a screen,
  Activity card, voice session, or Chat.
- **Evidence before economic claims.** “Coupon available,” “activated,”
  “estimated savings,” and “saved” are different states.
- **A sale is an opportunity, not a command.** Rank likely household use, budget,
  storage, and waste alongside price; it is valid to recommend not buying it.
- **Recompute, never silently rewrite.** Accepted price or stock evidence creates
  a reviewable plan/list diff with capability-owned receipts.
- **One cue while cooking.** Cook Mode remembers position and waits. It does not
  behave like a chat transcript with an answer dump.
- **Every integration has a dignified fallback.** A provider outage or missing
  partnership must not erase the value of planning and the reviewed list.

## Success evidence

The job flow moves from promising to delivered only after:

1. Three households complete at least three cycles on their natural cadences.
2. Each cycle includes at least one real imported or family recipe and reaches a
   reviewed list without test fixtures or direct database intervention.
3. At least one cycle proves selected-member participation on separate signed
   accounts and physical devices.
4. At least one supported retailer handoff reaches a real reviewable cart or
   list; the UI accurately describes all remaining user work.
5. At least three cooks complete and resume a Cook Session on a physical device,
   including touch fallback, timers, and foreground voice where enabled.
6. Maya can explain what Kwilt did, why a suggestion or saving appeared, and how
   to correct or remove the underlying data.
7. The household reports less coordination and re-entry—not merely more stored
   recipes, more suggestions, or more coupon impressions.
8. At least one cycle begins budget-first or pantry-first, and one real or
   faithfully staged store opportunity is accepted or rejected with a correct
   plan/list diff.
9. The user can distinguish Money category room, Food trip target, basket
   estimate range and coverage, paid total, and receipt-proven savings.
10. Stock confirmation prevents at least one duplicate purchase or unlocks a
    meal while remaining faster than maintaining a detailed pantry inventory.

## Aspirational design challenge

How might Kwilt make feeding a household feel like one calm, adaptive loop that
can begin with meals, money, food on hand, or a worthwhile sale—and gets easier
each time—while preserving organizer authority, financial and retailer truth,
private family participation, and the pleasure of cooking?
