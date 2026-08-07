# Household Food Hero Experience

**Status:** Chosen experience contract
**Audience:** Aspirational family organizers
**Representative persona:** Maya
**Job flow:** [`Maya: feed the household with less work`](../../job-flows/maya-feed-household-with-less-work.md)
**Feature brief:** [`Household Food Loop`](../../feature-briefs/household-food-loop.md)
**Last updated:** August 5, 2026

## The promise

Kwilt turns “we need food for the next few days” into one calm household loop:

> Keep what we love. Choose together. Buy with confidence. Cook without losing
> our place. Let the next time be easier.

For a thrift-oriented household, the economic promise is equally direct:

> Spend less without making thrift a hobby. Start with what you have, what you
> can spend, or what is genuinely worth buying; let the rest of dinner catch up.

This is not three adjacent utilities. Recipes, Meal Planning, and Groceries are
separate capability owners, but the user experiences one continuing story. The
visual system must make each transition feel earned and obvious while the data
model preserves provenance, authority, and reversibility.

## The hero scenario

It is Thursday evening. Maya expects to shop Saturday morning and wants four
dinners, not a seven-day calendar. She has a handwritten enchilada recipe from
her mother, several saved Kwilt recipes, and children who will eat the meals but
do not want another planning app.

By Friday night:

- the paper recipe is a clean private Recipe with “From Mom” attribution;
- Maya has started **Next 4 dinners** from recipes she recognizes;
- two selected family members have made small, private choices from their own
  devices;
- Maya has finalized four meals and their servings;
- Kwilt has produced one reviewed grocery list with provenance and Already-have
  removed;
- a few worthwhile price changes are explained without coupon theater;
- the list is ready for a truthful retailer handoff or plain in-store use.

On Tuesday, Maya opens the enchiladas. Recipe Home gives her confidence, the
readiness sheet catches a preheat and a missing pan, and Cook Mode guides her one
cue at a time. With dirty hands she says “What’s next?”, “How much cumin?”, and
“Start a ten-minute timer.” Kwilt waits between cues and remembers her place if
she leaves. At the end she records only “double the sauce next time.” The next
cycle starts with that truth available, not with another setup ritual.

### The hero scenario has four valid openings

The walkthrough below begins recipe-first for narrative clarity. The product
must also support these openings without sending the user through a mode picker:

- **Budget-first:** “Plan four dinners and keep this shop near $65.” Kwilt shows
  the authorized Money category remainder separately from the Food trip target.
- **Pantry-first:** “What can we make from the freezer and pantry?” Kwilt asks
  for a quick confirmation of only the stock that changes the answer.
- **Sale-first:** “Chicken thighs are $1.49 a pound.” Kwilt evaluates comparable
  price, likely use, budget, storage, and the smallest plan/list change.
- **Meal-first:** “We want enchiladas.” Kwilt follows the original path, then
  uses budget, stock, and prices to improve the plan before purchase.

All four openings converge on one versioned Meal Plan and one reviewed Grocery
List. They are contextual starting truths, not durable household identities.

## Experience architecture

```text
Food
├── Recipes
│   ├── Library / discovery
│   ├── Import review
│   └── Recipe Home
│       ├── Add to Next meals
│       ├── Ingredients + method
│       ├── Source, notes, sharing
│       └── Before you begin → Cook Mode
├── Next meals
│   ├── Horizon + candidate set
│   ├── Household choice round
│   ├── Calm aggregate
│   └── Final plan version
└── Groceries
    ├── Compiled list + provenance
    ├── Already have + household additions
    ├── Savings review
    └── Retailer handoff / plain list

Activities and Chat can open the right point in this structure. They do not own
food records. Cook Mode is a Recipe-owned execution mode, not an AI chat.
```

## Walkthrough

### Scene 1: Food opens on progress, not modules

Maya opens **Food**. The first card says **Plan the next shop** because no active
cycle exists. Beneath it are two visually distinct, quiet shelves:

- **Recently cooked** — large, appetizing recipe cards she already trusts.
- **Your recipes** — family, imported, and saved recipes with compact provenance.

Three secondary actions remain available: **Add a recipe**, **All recipes**, and
**Groceries**. The screen does not begin with equal-sized tiles for system
architecture. It leads with the next household outcome.

If an active cycle exists, the lead card changes in place:

- “2 people have weighed in” → **Review choices**
- “4 dinners are ready” → **Build grocery list**
- “18 items left” → **Continue shopping**
- “Enchiladas tonight” → **Open recipe**

This is a projection of canonical capability state. It is never a parallel
food-dashboard record.

### Scene 2: A paper recipe becomes family knowledge

Maya taps **Add a recipe**. The capture sheet prefers the source she already has:

```text
Add a recipe

[ Take a photo ]
[ Paste a link ]

Type or paste          Dictate           Enter by hand
```

She photographs the recipe-book page. The photo remains visible at the top of
**Check this recipe** while Kwilt extracts the title, yield, ingredients,
directions, time, notes, and source. Every uncertain field has a warm “Check”
marker, and tapping it reveals the exact image crop or source text that informed
the value. Kwilt says “I could not tell whether this is 1 or 7 teaspoons” instead
of quietly guessing.

Maya corrects one ingredient, chooses **Family recipe**, and adds “From Mom.”
**Save recipe** creates the private Recipe and immutable first version. The
source image and its retention choice remain inspectable. Saving never implies
that Maya has rights to publish the imported text or image.

### Scene 3: Recipe Home earns the decision to cook

The new Recipe opens into **Recipe Home**, not directly into an editor or a wall
of ingredients. The surface combines Goal-like calm hierarchy with the appetite,
confidence, and practical conventions that strong recipe products have refined.

```text
┌─────────────────────────────────────┐
│ ‹                           •••      │
│                                     │
│         [ warm hero media ]         │
│                                     │
├─────────────────────────────────────┤
│ MOM'S GREEN CHILE ENCHILADAS        │
│ Cozy, cheesy, and good for a crowd. │
│                                     │
│ 15 min prep   35 min cook   Serves 6│
│ From Mom · Family recipe             │
│                                     │
│ [ Add to Next meals ] [ Start cooking ]
│                                     │
│ Ingredients            −  6  +      │
│ □ 2 cups shredded chicken           │
│ □ 12 corn tortillas                 │
│ ...                                 │
│                                     │
│ Directions                          │
│ 1  Heat the oven…                   │
│ ...                                 │
│ Notes · Source · Shared with         │
└─────────────────────────────────────┘
```

The image may be a user-owned photo, rights-approved catalog image, or restrained
typographic treatment. Imported media that lacks public rights remains private.
Video is playable when present but never auto-plays with sound.

The primary actions answer two different intentions:

- **Add to Next meals** moves the immutable Recipe version and selected servings
  into the current planning horizon, or starts one with a short sheet.
- **Start cooking** opens **Before you begin**, then creates or resumes a Cook
  Session.

The servings control changes every displayed structured quantity consistently.
The original sentence never sits beside a contradictory scaled number. If a
line cannot be scaled safely, it keeps the original wording and says “Check
amount” only when action is required.

### Scene 4: Maya starts “Next 4 dinners”

Maya taps **Add to Next meals**. Since there is no current plan, a bottom sheet
asks one real question:

```text
What are you planning for?

[ Next shop ]   [ Number of meals ]
[ Date range ]  [ Just collecting ideas ]
```

She chooses **Number of meals**, then **4 dinners**. Kwilt creates the horizon
and adds the enchiladas. It offers a prepared set of six more candidates with a
short, inspectable reason under each:

- **Sheet-pan chicken** — “Uses the broccoli already on your grocery list.”
- **Black bean tacos** — “Fast, and everyone chose it last month.”
- **Tomato soup + grilled cheese** — “One lower-cost pantry dinner.”

AI does not silently fill or finalize the plan. Maya can add saved recipes,
leftovers, eat out, undecided, or a plain meal note. She removes two suggestions
and keeps five candidates for four slots.

Above the candidates, one optional reality strip keeps economic context visible
without becoming a dashboard:

```text
$65 trip target · $92 left in Food this month
8 likely ingredients on hand · confirm 4 that matter
Smith's prices checked 18 minutes ago
```

Money owns the monthly category evidence. The trip target is a distinct,
user-owned constraint on this Food cycle. If Money is unavailable or not set up,
Maya may enter a target directly or plan without one.

### Scene 5: The household weighs in without becoming a committee

Maya taps **Ask the family**. A capability-owned invitation sheet makes scope and
authority explicit:

```text
Ask about Next 4 dinners

Choose people
✓ Sam        ✓ Riley        ○ Jordan

Each person can pick up to 3 and suggest 1.
You will make the final plan.

[ Send ]
```

Each selected person receives an Activity/Shared Home projection that opens the
same frozen choice round. The response surface is deliberately small and visual:

```text
Pick up to 3 dinners
Maya will use everyone's ideas to make the final plan.

[photo] Enchiladas         ♡ Pick
[photo] Sheet-pan chicken  ✓ Picked
[photo] Black bean tacos   ✓ Picked
[photo] Tomato soup        Pass

[ Suggest something ]            [ Done ]
```

Responses are private to the organizer unless a future round explicitly says
otherwise. Children do not see who rejected whose suggestion. A reminder is a
food-owned action card with **Choose meals**, **Not this time**, and **Remind me
tomorrow**; it is not a generic to-do body trying to render arbitrary logic.

### Scene 6: The organizer finalizes one realistic plan

Maya returns to a calm aggregate, not a leaderboard:

```text
Ready to choose
2 of 2 people responded

Loved by everyone
  Black bean tacos

Also wanted
  Enchiladas · Sheet-pan chicken

One new idea
  Breakfast for dinner
```

She picks four, adjusts enchiladas to eight servings, and places only the meals
whose day matters. Others remain unordered. Kwilt points out one practical
constraint: “Two meals use the oven; Tuesday is marked busy.” The observation is
explained and dismissible. **Finalize 4 dinners** creates an immutable plan
version and closes the round. Late responses never mutate it silently.

### Scene 7: Groceries preserve the path back to every decision

Kwilt compiles the finalized plan deterministically. The review says **32 items
from 4 dinners** and groups by a useful shopping mode, not by recipe. Tapping an
item reveals its provenance:

```text
Chicken breast · 3 lb
  2 lb — Enchiladas × 8
  1 lb — Sheet-pan chicken × 4
```

Ambiguous ingredients remain separate until Maya merges them. AI may explain or
propose a correction; only the Grocery capability applies it.

**Already have** opens a rapid, temporary checklist. Checked items leave the
active list but can be restored. Household staples and a child’s “apples” request
appear as additions with their own source, never as invented recipe ingredients.

When useful, the review can promote a small number of items into
**Confirmed today**, **Likely on hand**, or **Check first** observations. It never
requires exact pantry counts. Recipe search can then show **Make now**, **Almost
there**, or **Use soon**, with the stock evidence that supports each label.

### Scene 8: Savings is a tiny review, not a hobby

Before or after plan finalization, Kwilt may compare a few meaningful scenarios:
**Use more of what we have**, **Stay near $65**, or **Keep everyone’s top
choices**. Each shows changed meals, grocery gaps, basket estimate range, price
coverage, and the household trade-off. These remain proposals against one plan.

After product matches and current-store evidence are available, a quiet card
says **3 worthwhile ways to spend about $8 less**. Opening it shows at most three
ranked changes:

```text
Save about $3.20
Choose the 32 oz store-brand cheese
Same planned amount · Smith's member price · ends Saturday

[ Keep current ]  [ Use this ]
```

Each card distinguishes regular price, public promotion, member price, coupon
that requires activation, rebate, fees, estimate time, and evidence source. If
Kwilt cannot activate an offer, the action says **Open coupon** or **Activate in
retailer app**, never **Applied**. Realized savings appears only after itemized
order or receipt evidence.

### Scene 8A: A good aisle find can change the plan

At Smith’s, Maya sees chicken thighs for $1.49 per pound. She scans the price tag
or says the observation. Kwilt creates temporary evidence and responds:

```text
Good current price

Swap Thursday's salmon bowls for sheet-pan chicken?
The basket estimate drops about $7 and remains inside your $65 target.

4 lb package
• 2 lb for Thursday
• about 2 lb extra; freeze for a later meal

[ Keep the plan ]   [ Review the swap ]
```

**Review the swap** shows the exact meal and GroceryList diff before acceptance.
If the deal has no likely use, poor unit economics, insufficient evidence, or
would exceed the target, Kwilt says so. A sale never becomes an instruction to
buy merely because the nominal discount is large.

### Scene 9: The handoff tells the truth

The handoff review shows matched, unmatched, and user-review counts before Maya
leaves Kwilt:

```text
Ready for Instacart
24 matched · 5 need retailer review · 3 kept as notes

Instacart will ask you to choose products and a store,
then review price, availability, fees, and checkout.

[ Continue to Instacart ]
[ Copy plain list ]
```

Where Kroger-family cart-add is available, the same review precedes an idempotent
add. An ambiguous provider response becomes **Check retailer cart** rather than a
retry that may duplicate items. “Ordered” is impossible without order evidence.

A basket estimate always names store, range, current-price coverage, and
freshness. **$92 left this month**, **aim for $65**, **about $54–$66**, **$58.42
paid**, and **$7.10 less than the accepted baseline** are distinct truths.

### Scene 10: Before you begin prevents avoidable interruption

On cooking day, Recipe Home now says **Tonight** and **Start cooking**. The
readiness sheet contains only information that changes the next few minutes:

- Serves 8; change before starting.
- Preheat oven to 375°F.
- Get a 9×13-inch pan.
- Prep: shred chicken and grate cheese.
- One ingredient was marked Already have; tap to inspect.

Maya checks the pan and taps **I’m ready**. Kwilt creates a `RecipeCookSession`
against the exact immutable Recipe version and serving scale. If an unfinished
session exists, the action is **Resume step 4 of 11**.

### Scene 11: Cook Mode has one center of gravity

Cook Mode removes navigation and editing chrome. The current instruction—not
the assistant—is the hero.

```text
┌─────────────────────────────────────┐
│ Step 4 of 11          Listening ●   │
│ ━━━━━━━━━━━━━━━━                    │
│                                     │
│  Spread half the green chile sauce │
│  in the bottom of the pan.          │
│                                     │
│  1½ cups green chile sauce          │
│                                     │
│          [ Start 10:00 timer ]      │
│                                     │
│ [‹ Back]    [ Repeat ]    [Next ›]  │
│                                     │
│ “What’s next?” · “How much cumin?” │
└─────────────────────────────────────┘
```

The state machine owns step position, timers, pause, and completion. AI does not
infer progress from chat history. Deterministic commands—next, back, repeat,
current position, ingredient lookup, timer, pause, resume, finish—take the fast
path. Recipe-grounded questions such as “Can I substitute Greek yogurt?” may use
the conversational path and are labeled as guidance, not recipe mutation.

Voice is explicitly foreground and session-bound. The status is always one of
**Listening**, **Thinking**, **Speaking**, **Paused**, or **Voice off**. Maya can
interrupt speech, mute, use touch at any time, and leave without losing position.
Raw kitchen audio is not retained by default. Initial release does not claim a
background custom wake word.

Timers survive screen changes and use system notifications where allowed. The
screen stays awake during an active session. If connectivity disappears,
step navigation, saved ingredients, local timers, and touch controls continue;
only open-ended AI questions become unavailable.

### Scene 12: Finishing teaches without demanding a review

After the final cue, Maya sees:

```text
Dinner is ready

[ We’d make this again ]
[ Add a note ]
[ Done ]
```

She says “Double the sauce next time.” Kwilt shows the transcription and asks
whether it is a private cooking note or a proposed recipe edit. She chooses
**Cooking note**. The cook record stores the exact version, servings, completion,
and note. It does not rewrite Mom’s recipe or create a public rating.

The next time Kwilt proposes enchiladas, it can say: “You made this for eight and
wanted more sauce.” Maya can inspect and delete that memory.

A reviewed receipt may separately confirm the Money transaction, paid product
prices, likely purchased-stock observations, and realized savings. Each
capability retains its own receipt and correction boundary. Buying food does not
prove it was consumed, and correcting a Money category does not rewrite Grocery
history.

## Visual system

### Visual character

Food should feel warmer and more sensory than an ordinary Kwilt list while
remaining recognizably Kwilt: calm spacing, editorial typography, restrained
chrome, rounded cards used for decisions rather than decoration, and one obvious
action per state.

- **Recipe Home:** edge-to-edge media, generous title treatment, compact factual
  metadata, ingredients as readable editorial content, and a persistent primary
  action that never obscures the last lines.
- **Planning:** a horizontal horizon story and image-led candidates; selection
  feels like arranging dinner possibilities, not scheduling tasks.
- **Groceries:** denser, faster, highly legible rows; provenance and savings
  reveal on demand rather than competing with checking items off.
- **Cook Mode:** high contrast, very large type, maximum touch targets, minimal
  navigation, and clear voice/timer state visible from arm’s length.

### Motion

- Recipe added to a plan uses a short, direct shared-element or card-settle
  transition; no confetti.
- Finalization visually gathers chosen meals into one stable stack before the
  grocery compilation begins.
- Cook step transitions slide in the direction of progress and respect Reduce
  Motion with a crossfade.
- Listening uses a subtle status pulse, not an ambient waveform that suggests
  recording when voice is off.
- Timers animate only on state changes; a running timer is numerically calm.

### Accessibility and physical context

- Dynamic Type must retain the current cue and controls without horizontal
  clipping; Cook Mode may paginate rather than shrink type.
- All information carried by media has text equivalents and meaningful alt text.
- Voice is an enhancement, never the only route. Every command has a reachable
  touch action.
- Color never carries selection, uncertainty, savings evidence, or listening
  state alone.
- Cook Mode targets at least 48×48 points and is operable with VoiceOver/Switch
  Control; physical assistive-tech proof is distinct from component tests.
- Portrait phone is primary. Landscape phone provides a two-pane cue/ingredients
  layout. Tablet uses the same hierarchy with a constrained reading column.

## AI behavior across the loop

AI may do what Maya can do through registered capability operations when the
operation is within declared authority and capability validation succeeds.

| Moment | AI may prepare or execute | Boundary |
| --- | --- | --- |
| Import | Extract fields, align evidence, flag uncertainty, retry a field | Cannot approve a Recipe or attest rights |
| Recipe Home | Summarize readiness, explain a technique, prepare scaling | Structured scaling remains deterministic; no silent content edit |
| Budget | Read an authorized Food envelope and prepare a trip target | Money owns budget truth; cannot mutate the plan or call monthly room cash safe |
| Stock | Extract and rank observations, ask for material confirmation | Cannot assert physical presence, quantity, consumption, or food safety |
| Planning | Propose candidates and scenarios, explain fit, prepare horizon edits | Cannot invite, accept a scenario, or finalize without explicit authority |
| Household choice | Draft reminder, summarize aggregate | Cannot impersonate a participant or expose private responses |
| Groceries | Explain ambiguity, propose mappings, prepare corrections | Compiler and canonical mutations remain deterministic and validated |
| Savings | Prepare evidence-backed alternatives | Cannot say coupon applied or savings realized without evidence |
| Store opportunity | Parse temporary price evidence and prepare a plan/list diff | Capture cannot mutate a plan, list, stock, or Money record |
| Handoff | Prepare provider payload and explain unmatched items | Cannot claim checkout or order completion without provider evidence |
| Cook Mode | Resolve commands, answer recipe-grounded questions, transcribe notes | State machine owns progress/timers; no autonomous recipe mutation |
| Next cycle | Prepare a proposal from authorized memories | Must expose why, freshness, correction, and deletion |

## Failure and recovery are part of the hero experience

- **Import fails:** keep the source, offer another photo/paste/manual path, and
  never discard entered corrections.
- **Backend is unavailable:** show cached Recipes and active Cook Session; queue
  only idempotent safe writes and state what has not synced.
- **Nobody responds:** Maya can finalize at any time; non-response is neutral.
- **Plan changes after compilation:** ask whether to refresh the GroceryList and
  preserve manual grocery changes as reviewable deltas.
- **Ingredient merge is uncertain:** keep lines separate and show their origins.
- **Money is stale or unavailable:** label or omit the projection; preserve manual
  trip target and planning. Never reuse stale evidence as current.
- **Stock is uncertain:** keep the ingredient in the grocery gap and offer a
  quick check. Never convert likely to confirmed silently.
- **Store evidence is weak:** preserve the observation for review but do not call
  it a good deal or change the plan.
- **Scenario application is interrupted:** show which capability receipts
  succeeded and provide deterministic complete-or-revert recovery.
- **Provider is unavailable:** plain list remains fully useful.
- **Voice misunderstands:** show the interpreted command, avoid advancing on low
  confidence, and keep touch controls ready.
- **Timer creation is ambiguous:** display local timer state and do not silently
  create another.
- **Recipe changes mid-session:** the active session stays pinned to its version;
  the user may explicitly restart on the new version.

## What makes this great rather than merely complete

1. The first screen always knows the household’s next food decision.
2. Recipe capture begins with the artifact already in the user’s hand.
3. Recipe Home creates appetite and confidence before asking for commitment.
4. The planning horizon matches real shopping cadence.
5. Family participation is meaningful but tiny.
6. Every grocery quantity can explain where it came from.
7. Savings requires less expertise than scanning the shelf.
8. Pantry knowledge removes more work than it creates and never pretends to be
   exact when it is not.
9. A genuinely useful in-store opportunity can update the plan without making
   Maya rebuild it.
10. Retailer limitations are expressed as remaining work, not buried in terms.
11. Cook Mode waits, remembers, and works with dirty hands.
12. The loop learns one useful truth at a time and remains correctable.

## Acceptance walkthrough

Before release, record one uncut or clearly time-stamped playthrough that proves:

1. a real paper recipe is photographed, corrected against evidence, and saved;
2. Recipe Home is visually accepted in populated, missing-media, long-title,
   Dynamic Type, and scaled-serving states;
3. a four-meal horizon is created from a budget-first or pantry-first opening;
4. Money category room, Food trip target, basket estimate range/coverage, and
   cash-safe evidence are represented as distinct truths;
5. confirmed/likely/check-first stock changes candidate ranking or prevents one
   duplicate without requiring a full pantry catalog;
6. two separate household accounts respond from separate signed devices;
7. the organizer reviews and finalizes without hidden fixture state;
8. groceries compile from the exact plan version and survive one correction;
9. one real or faithfully staged StoreOpportunity produces a reviewable plan/list
   diff that is accepted or rejected without a silent mutation;
10. Already-have, a household addition, provenance, and stock confidence are visible;
11. a savings claim shows its evidence state, or truthfully says none is available;
12. a provider or plain-list handoff works without claiming an order;
13. Cook Mode starts, advances by touch and voice, repeats, goes back, looks up an
    ingredient, runs a timer, survives background/relaunch, and completes;
14. a post-cook note and reviewed receipt create separate, inspectable learnings
    without collapsing capability authority;
15. analytics, logs, screenshots, and database evidence agree on the result.

Passing source tests alone does not pass this walkthrough. Simulator proof does
not substitute for separate signed accounts, physical-device voice, system timer
notifications, assistive technology, retailer authorization, or TestFlight.

## Competitive inspiration, translated into Kwilt

- **Tasty:** appetite-first media, human-readable time, save/share confidence,
  serving adjustment, and meal-to-shopping continuity.
- **Pestle:** explicit Start Cooking, one instruction at a time, progress,
  ingredient quantities in context, hands-free controls, imports, and household
  planning.
- **Kitchen Stories:** per-step visual support and technique confidence.
- **SideChef:** step media, voice commands, timers, and shopping continuity.
- **Paprika:** dependable scaling, crossed-off ingredients, detected timers,
  screen awake, and persistent cooking utility.
- **Mealime:** reductive Plan → Shop → Cook progression.
- **Samsung Food and AnyList:** servings flowing into groceries, collaborative
  list behavior, and recipe provenance.

Kwilt should not import their public engagement feeds, commerce clutter, generic
assistant chat, or incentives to publish private family life. Its advantage is a
trusted household loop with capability ownership, transparent AI, and continuity
across the jobs those apps usually separate.
