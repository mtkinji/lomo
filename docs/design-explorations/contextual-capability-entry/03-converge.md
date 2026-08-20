# Converge: Contextual Capability Entry

## Decision

Choose **Alternative A — One Outcome, One Door**, with a fixed promotion budget and a final
unobscured handoff into the real Kwilt shell.

Each promoted outcome receives one full-screen illustrated value story, one short explanation, and
one direct action. The person can:

- tap **Try it now** to start that capability's FTUX;
- swipe left or right from anywhere to see another door; or
- choose **Explore Kwilt** to enter the real shell immediately.

The existing card chooser is retired. Capability-group pages, multiple door buttons on one story,
a bottom guide over the menu, and repeated Chat copy on every page are not part of the chosen
model.

## Why this wins for Maya

Maya does not need the shortest possible onboarding at any cost. She needs the shortest path from
recognition to useful action. One spacious outcome at a time gives the illustration and copy enough
room to make the value understandable, then lets her act immediately without another choice.

The longer sequence is optional rather than procedural. A person who recognizes the first promise
may leave after one value page. A person who is curious can keep swiping. A person who wants the
app can enter it at any point.

This serves:

- `jtbd-move-the-few-things-that-matter` by turning recognition directly into a native start;
- `jtbd-put-intention-before-impulse` and `jtbd-review-budget-reality-before-spending` by giving
  Money's budget-linked app controls a prominent first-install story;
- `jtbd-trust-this-app-with-my-life` by making every visible promise readiness-qualified and
  skippable;
- `jtbd-get-help-without-retelling-my-life` by giving Chat a truthful cross-capability moment; and
- `jtbd-stay-in-control-of-ai-actions` by showing Chat as a route to bounded native actions rather
  than unlimited autonomous control.

## Qualitative scoring

| Alternative | Maya fit | Outcome clarity | Retention learning | System alignment | Blast radius | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| A. One Outcome, One Door | High | Highest | High, with position controls | Strong extension of current pager/contracts | Medium | Choose |
| B. Value Families | Medium | Medium | Harder to attribute family versus door | Adds a second grouping layer | Medium-high | Reject |
| C. Hero + Atlas | Medium-high | High for hero, low for remainder | Strong hero test | Recreates temporary chooser UI | Medium | Revisit if reel underperforms |
| D. Real Menu Index | Medium-low today | Low until selection | Weak automatic story exposure | Reuses shell but bends menu behavior | High UX risk | Reject for first install |

## Capability delta

### Today, the user cannot

- understand one concrete Kwilt value promise in an energetic full-screen moment and begin it
  directly;
- swipe through multiple first-start outcomes without parsing a card chooser;
- enter the real shell from any point in the value sequence;
- understand Chat's cross-capability role without crowding capability-specific messaging; or
- learn the breadth of Kwilt through a sequence whose order is explicitly connected to downstream
  first value and retention.

### After this concept ships, the user can

- recognize one outcome at a time;
- start the displayed capability FTUX immediately;
- keep swiping from anywhere when that outcome is not relevant;
- leave for the real app without completing or dismissing a setup funnel; and
- encounter a dedicated Chat story that explains supported cross-capability help.

### Still intentionally not supported

- a door for every capability, destination, object, or feature;
- disabled or coming-soon onboarding promises;
- private or opaque personalization of door order;
- multiple competing actions on one value story;
- treating a page view, CTA tap, or shell arrival as capability first value;
- claiming that Chat can perform unsupported actions; or
- forcing a person to view every page before using Kwilt.

## Reductive design decisions

### Keep

- One parchment Welcome with the balanced illustration and bottom-positioned copy.
- Full-screen illustrated value moments using the same visual grammar.
- Full-surface left/right swipe with vertical-gesture arbitration and accessible equivalent actions.
- Page indicators, without instructional copy such as “Swipe to choose.”
- One direct primary action per value page.
- A quiet, consistently placed **Explore Kwilt** action.
- Capability-owned FTUX, authoritative first value, recovery, and native landing.

### Remove or refuse

- The standalone card chooser.
- A `BottomGuide` over the open capability menu.
- Capability-family pages with two or three competing doors.
- A hero-plus-atlas screen that recreates the rejected chooser in another style.
- Eyebrows, feature lists, badges, progress bars, status language, and page-specific navigation
  instructions.
- Repeated **You can also ask Kwilt** copy on every page.
- A permanent onboarding taxonomy users must learn.

### Door budget

The value sequence may promote at most **six doors after Welcome**, including Chat. This is a
product budget, not a layout target. Fewer is better when fewer paths pass the quality and retention
bar.

If a seventh eligible promise emerges, Kwilt must either:

1. replace a lower-value door;
2. demonstrate that two promises can truthfully become one outcome without adding actions to the
   page; or
3. leave the capability discoverable in the real menu without promoting it during first install.

Onboarding must not grow automatically with the registry.

## Provisional retention-first order

When all candidate paths are genuinely release-ready, the current product hypothesis is:

1. **Put spending apps behind your budget** — budgeting and Screen Time are both established paid
   app categories, and their combination connects current budget reality to the moment spending
   happens, including pausing apps such as Amazon at a threshold the person chooses.
2. **Make meals easier** — recurring weekly demand, several connected return moments, and natural
   household participation.
3. **Set goals and make a plan** — Kwilt's accepted core journey and a recurring planning loop.
4. **Ask Kwilt for help across the app** — the connective model makes more sense after several
   concrete capability examples and remains early enough to receive meaningful exposure.
5. **Set up household chores** — recurring household coordination with strong shared-return
   potential.
6. **Start a game together** — repeatable connection value, but likely narrower initial demand.

Generic **Set up Screen Time controls** is not promoted as a separate door in this initial order.
Its most differentiated first-install value is carried by the Money door: a real budget condition
can control whether a spending app waits. Other Screen Time jobs remain available in the real
product and may earn a future door, but they should not dilute this specific Kwilt-only story.

This order is not a claim about current analytics. It is an editorial hypothesis based on expected
frequency, native first-value potential, repeat use, and household participation. Production
promotion still filters it: an unready path is omitted, and the remaining eligible doors move up.
With current promotion states, **Set goals and make a plan** remains the only production-qualified
door.

The order is stable within a release. It does not silently change per person. Verified intent from
a live link, invitation, or resume target may bypass it.

### Market correction

The budget-linked app-control mechanism is not unique to Kwilt. A current market check found at
least two direct examples:

- [Hinder](https://www.gethinder.app/) connects through Plaid, lets people set category or app
  budgets, and locks selected apps such as Amazon and DoorDash when the limit is reached. Its
  [App Store listing](https://apps.apple.com/us/app/hinder-budget-stop-spending/id6753843173)
  showed version 1.0.6, nine ratings, and a $12.99 monthly premium option during the check.
- [Smartr](https://www.3numbers.io/) presents app blocking as one part of a broader Plaid-connected
  budgeting product and explicitly names blocking Amazon, DoorDash, and Uber when over budget.

An adjacent product, [Rulio](https://www.overrule.com/), describes itself as an app blocker for
spending and savings but appears to block the purchase or money movement rather than using Screen
Time to block the spending app. This supports the broader demand for rules that carry a budget into
the moment of temptation.

The defensible claim is therefore not **Kwilt invented budget-triggered app blocking** or **no one
else brings these categories together**. The current evidence supports a narrower conclusion:

- this is an emerging, monetizable wedge rather than an empty category;
- the direct competitors found are still narrow and early enough that the category does not look
  settled; and
- Kwilt can differentiate through the surrounding household system, trustworthy budget evidence,
  multiple user-chosen conditions, temporary-open versus leave-blocked control, transparent
  recovery, family authority, and connections to Goals, Meals, Chores, and Chat.

This market evidence strengthens the case for first position as an acquisition and monetization
hypothesis. It does not prove that the door will retain Kwilt users. Native first value, seven-day
return, and repeated real spending-moment use still need to establish that.

## Money and Screen Time's combined door

Budget-linked Screen Time is not supporting copy for a generic budget page. It is the core value
story of the first door and a coordinated first-value path owned by Money and the Screen Time
control plane.

Provisional message:

**Put spending apps behind your budget**

See what's left, and have Kwilt pause apps like Amazon when a spending category reaches the
threshold you choose.

Primary action: **Try it now**

The illustration should make the relationship legible without becoming a diagram: a recognizable
Shopping budget approaches its chosen threshold, Amazon waits, and the person sees the budget
reality before choosing **Open for now** or **Leave blocked**.

The door is eligible for production only when its FTUX can truthfully coordinate:

1. minimum Money setup or honest resumption;
2. a durable budget category with current evidence;
3. Screen Time authorization;
4. opaque native selection of a spending app or category;
5. a user-chosen condition such as **At 95% used**, **When over**, or **When this category is hot**;
6. an applied, inspectable, reversible policy; and
7. a native landing where the person can review the category, change the threshold, open
   temporarily, or leave the app blocked.

Creating a budget alone does not fulfill this onboarding promise. Opening the Money summary alone
does not fulfill it either. The first-value proof is an active budget-linked app-control policy with
authoritative Money evidence and Screen Time delivery state.

Current source and automated contracts support category-specific policies, threshold evaluation,
shield handoff, and temporary-open versus leave-blocked review outcomes. Signed physical-device
Screen Time enforcement, installed TestFlight behavior, and live financial connection remain
separate unproven gates. Until those pass, this door can appear only on the development rehearsal
surface—not production first install.

## Chat's dedicated moment

Chat receives its own full value page rather than a subordinate sentence on every capability
story.

Provisional message:

**Ask Kwilt for help across the app**

Tell Kwilt what you want to do. Chat can use supported capabilities to help you make the change,
with confirmation when it matters.

Primary action: **Open Chat**

The illustration should show a short request becoming an understandable native result. It should
not depict an anthropomorphic assistant, imply that conversation replaces the app, or promise that
every capability operation is available.

This copy follows Kwilt's truth-first hierarchy: supported scope first, useful action second, warm
confidence third. It avoids the unqualified promise that users can “do anything” from Chat.

## Experience and transition contract

```text
Welcome
  -- swipe left anywhere --> ranked value door

value door
  -- Try it now ----------> capability-owned FTUX -> native first value
  -- swipe left ----------> next ranked eligible door
  -- swipe right ---------> previous door / Welcome
  -- Explore Kwilt -------> real shell with capability menu open

last value door
  -- swipe left ----------> real shell with capability menu open
```

When the real shell appears:

- onboarding page indicators disappear;
- no bottom guide or scrim covers the navigation;
- ordinary capability-menu behavior takes over;
- swiping right no longer returns to Welcome; and
- universal onboarding records `explored`, while no capability records first value.

The shell uses its ordinary initial destination behind the open menu rather than introducing an
onboarding-only canvas. The visible navigation is the persistent map the user can reopen later.

If the person selects **Try it now**, the pager ends and the capability owns the rest of the
journey. The universal Welcome does not replay after an interruption.

## Accessible interaction contract

- Horizontal swipe is available across the page but is never the only way forward.
- Each page exposes accessibility actions for previous and next.
- **Try it now** and **Explore Kwilt** remain ordinary labeled controls.
- VoiceOver announces the current value story and its position without relying on visible dots.
- Vertical scrolling wins when large text makes content taller than the viewport.
- Reduce Motion replaces the horizontal page travel with an immediate state change or restrained
  crossfade while preserving the same order.

## Accepted trade-offs

- Later doors will receive less exposure than earlier doors.
- The optional reel may contain more pages than a conventional onboarding flow.
- Kwilt must make and periodically revisit an explicit retention-order bet.
- A capability can be production-ready yet remain absent from first-install promotion.
- Chat gets a dedicated page at the cost of one door-budget position.

These costs are accepted because they protect one clear idea and one action per page.

## Rejected trade-offs

- Do not reduce page count by adding multiple capability actions to each page.
- Do not give every capability equal exposure at the cost of clarity.
- Do not make the real menu behave differently by intercepting normal destinations during
  onboarding.
- Do not personalize the lead door from sensitive user data.
- Do not optimize for onboarding completion instead of native first value and voluntary return.

## System implications

- Replace `CapabilityPathChooserScreen` with a value-door pager driven by the existing onboarding
  contracts.
- Extend the contract with story content, illustration identity, promotion eligibility, and
  editorial ranking; capability first-value ownership remains unchanged.
- Add a coordinated Money-and-Screen-Time onboarding contract whose terminal proof requires an
  active budget-linked app-control policy rather than budget creation alone.
- Keep the sequence derived only from readiness-qualified paths and the fixed Chat door.
- Move universal onboarding from a two-state `welcome | chooser` model to a resumable page/door
  state plus `chosen | explored` terminal states.
- Let the host dismiss into the real shell and open the existing capability menu without a new
  overlay.
- Add position-aware exposure events and join them only to bounded capability lifecycle events.
- Preserve current production behavior until enough paths and illustrations pass the release gate
  for the sequence to make sense as a broader first-install experience.

## Activation and later discovery

### Activation moment

Show the sequence only for a normal first install with unknown intent. A verified invitation, live
object link, authoritative resume target, or interrupted capability FTUX bypasses irrelevant value
doors.

### Helpful education

The value story is useful because it lets the person act. It should not contain feature bullets,
permission details, or setup explanations that belong inside capability FTUX.

### Later discovery

A person who chose **Explore Kwilt** or wants to revisit the breadth later may voluntarily reopen
the same sequence from the capability menu under a plain entry such as **What Kwilt can help
with**. Do not add badges, reminders, or completion state to that entry.

### Natural adoption

Natural adoption means the person selects a door, reaches its authoritative native first value,
and later returns voluntarily to the created or configured capability state. Swiping through all
pages or completing onboarding is not adoption.

## Stated bet

> We're betting that one spacious, actionable outcome per page will help more new users recognize
> a relevant reason to use Kwilt and reach native first value than a compact chooser, even though
> later pages receive less exposure. We are also betting that the combined Money-and-Screen-Time
> promise deserves the lead position because it joins two established paid categories in a highly
> actionable loop. If either claim is not true, we will revisit with Alternative C: one ranked hero
> followed by a compact value atlas, and rerank the lead door from native first-value and return
> evidence.

## Success signal

The leading signal is the share of ordinary first installs that reach authoritative capability
first value and return voluntarily within seven days, segmented by door and exposure position.

Supporting evidence:

- people can explain what the shown door offers without reading feature lists;
- direct starts outnumber exits caused by confusion;
- **Explore Kwilt** users are not stranded and later reopen the capability menu;
- Chat users understand that supported actions land in native capabilities; and
- people understand the Money differentiator as “the budget can make Amazon wait,” and a signed
  device proves that the selected threshold actually governs the selected app;
- the sequence feels energetic and optional rather than long or promotional in Simulator and
  dogfood use.

Disconfirming signals:

- users swipe rapidly without understanding or acting;
- position explains most selection and retention differences;
- six doors make the sequence feel daunting despite skip access;
- the dedicated Chat page is misunderstood as a separate assistant product; or
- the real menu handoff feels like another unexplained transition.

## Next decision

Before implementation, the learning-release phase should specify the smallest local build that can
prove the pager, door hierarchy, Chat moment, ranking behavior, FTUX handoff, and unobscured shell
transition without pretending every candidate capability is production-ready.
