# Yes-And: Contextual Capability Entry

## Original idea

After one illustrated Welcome, let a new person swipe through a short, skippable set of
capability-group value moments, understand the breadth of Kwilt and the role of AI Chat, then enter
the real app and choose where to begin.

## Frame correction from review

Do not place a `BottomGuide` over the open capability menu during first install. It would obscure
lower navigation destinations and the menu footer. Contextual education remains a strong principle,
but this particular overlay makes the real UI harder to see.

The expanded opportunity is a **value-led entry sequence that becomes the choice mechanism**, then
hands off to the real shell. It should not become a passive product tour that users must finish
before making a useful choice.

## 1. Let every value moment be an optional door

**Yes, and what if each group-level moment could immediately start the relevant capability journey,
instead of asking the person to finish the tour and choose again?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Discovery becomes action at the moment the person recognizes the help they came
  for.
- New value: A Meals page can offer **Make meals easier**; a Goals & Plans page can offer **Set
  goals and make a plan**. The person may start there, keep swiping, or enter Kwilt without making a
  selection. The walkthrough and chooser become one surface.
- Cost delta vs. original: medium
- Anti-pattern check: pass if each page has one clear, readiness-qualified start action and
  swiping remains optional. It fails if every capability on a page competes for attention or if the
  user must complete the reel before acting.

## 2. Tell group stories as coherent outcomes, not product inventories

**Yes, and what if each page explained the kind of life moment a capability group helps with,
rather than enumerating all of its screens and objects?**

- Serves: `jtbd-move-the-few-things-that-matter`, `jtbd-help-us-enjoy-being-together`
- Job elevation: The person recognizes their need before they are asked to understand Kwilt's
  architecture.
- New value: Food can tell the meal loop across Recipes, planning, Groceries, and cooking; Goals &
  Plans can show direction becoming a next action; Fun can show easy shared play. One illustration
  can communicate a connected outcome that would take several navigation rows to explain.
- Cost delta vs. original: medium
- Anti-pattern check: pass if copy is concrete and the depicted loop exists. It fails if pages use
  broad lifestyle promises, vague category language, or imply that unfinished capabilities are
  already seamless.

## 3. Use group-level compression without forcing the current menu taxonomy

**Yes, and what if onboarding used the smallest set of understandable value families, while the
real menu retained the more precise destinations needed for repeat use?**

- Serves: `jtbd-trust-this-app-with-my-life`, `jtbd-move-the-few-things-that-matter`
- Job elevation: Kwilt can explain breadth without making first-time understanding depend on a
  long catalog.
- New value: Chores and Screen Time need not be omitted merely because they are not currently
  represented as peer groups in the capability menu. Conversely, Money does not need separate
  onboarding moments for Budgets, Transactions, and Accounts. The sequence can compress related
  value while still landing in truthful native destinations.
- Cost delta vs. original: medium
- Anti-pattern check: pass if every value family maps cleanly to stable native destinations and the
  labels do not create a second permanent taxonomy. It fails if onboarding teaches categories that
  bear no relationship to what the user sees after entry.

## 4. Make the sequence self-shortening

**Yes, and what if the sequence became shorter the moment the person recognized enough value to
act?**

- Serves: `jtbd-carry-intentions-into-action`, `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt respects urgency and curiosity equally instead of making everyone consume
  the same tour.
- New value: The user can swipe from anywhere, tap a direct start action, or choose a persistent
  **Explore Kwilt** exit. Page indicators establish length without instructional copy such as
  “Swipe to choose.” Known-intent links can bypass irrelevant pages entirely.
- Cost delta vs. original: low
- Anti-pattern check: pass if skipping is always visible, consequence-free, and does not weaken
  later discovery. It fails if skip language sounds like abandoning setup, or if essential
  permissions and truth boundaries are buried in optional marketing pages.

## 5. Treat AI Chat as connective tissue, not another capability silo

**Yes, and what if the value sequence made clear that the same outcomes can also begin in Chat,
without presenting Chat as a magical replacement for the capabilities that own the work?**

- Serves: `jtbd-get-help-without-retelling-my-life`, `jtbd-stay-in-control-of-ai-actions`
- Job elevation: A person who knows what they want to say but not where it lives can still begin
  naturally.
- New value: Each group moment can show a quiet **You can also ask Kwilt** example, or a single
  connective Chat moment can demonstrate that a request is interpreted, confirmed when needed,
  and completed through the same native capability. Chat becomes another door into real work, not
  a disconnected chatbot.
- Cost delta vs. original: medium
- Anti-pattern check: pass if examples name bounded actions, authority, confirmation, and the
  native result. It fails if the copy says users can “do anything,” implies unsupported capability
  parity, anthropomorphizes AI, or hides consequential actions behind conversation.

## 6. Let the visual sequence teach the eventual navigation map

**Yes, and what if the order, iconography, naming, and illustration accents in the value moments
created a visual bridge into the real capability menu?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The person leaves onboarding with bearings they can use again, not memories of a
  temporary marketing surface.
- New value: The last transition can reveal the real shell with the corresponding menu group or
  destination in the same visual position or accent family. No guide needs to cover the menu; the
  continuity itself teaches where the value lives.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the shared cues support recognition and the production menu remains
  the authority. It fails if color alone conveys meaning or if the onboarding taxonomy diverges so
  far that the bridge becomes decorative rather than instructive.

## 7. Keep breadth truthful through readiness-qualified storytelling

**Yes, and what if a capability could appear in the value story only at the level Kwilt can
currently fulfill, while direct start actions remained subject to the stricter FTUX readiness
gate?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can understand Kwilt's breadth without being routed into a promise the
  current build cannot honor.
- New value: A group illustration may truthfully show that household organization includes Chores,
  while **Set up household chores** appears as a direct first-start action only when its onboarding
  and native result are release-ready. This distinguishes truthful product context from promoted
  first-install success paths.
- Cost delta vs. original: medium
- Anti-pattern check: pass only when the depicted value exists now and the difference between
  learnable breadth and actionable start is obvious without “coming soon” promotion. It fails if
  aspirational illustrations quietly advertise unavailable behavior.

## 8. Make the value story available after first install

**Yes, and what if the same concise value moments remained available later as an optional “What
Kwilt can help with” story, rather than becoming disposable onboarding UI?**

- Serves: `jtbd-get-help-without-retelling-my-life`, `jtbd-trust-this-app-with-my-life`
- Job elevation: A person can discover a newly relevant form of help when life changes, without
  replaying setup or searching a feature catalog.
- New value: Existing users and users who initially skipped can revisit the story from the real
  menu. As capabilities become ready, their value families can evolve without changing the
  first-install architecture.
- Cost delta vs. original: low
- Anti-pattern check: pass if this remains voluntary, compact, and state-aware. It fails if Kwilt
  repeatedly resurfaces promotional tours, adds unread badges, or treats lack of exploration as a
  deficit.

## What the expansion reveals

The proposed group-level sequence solves the length problem only if it stops behaving like a tour.
Its durable structure should be:

```text
Welcome
  -> value family 1  ─┐
  -> value family 2   ├─ start this path now
  -> value family 3   │  or keep swiping
  -> connective Chat ─┘  or Explore Kwilt at any time
  -> real shell
```

This creates three useful layers:

1. **Universal welcome** — one balanced brand and expectation-setting moment.
2. **Skippable value discovery** — a small number of illustrated, outcome-led families that each
   double as an entry door.
3. **Persistent product map** — the real capability navigation, learned through visual continuity
   rather than an overlay that hides it.

The number of pages should be governed by distinct user value, not the number of capabilities or
registry groups. A practical design budget is **three or four value-family moments total**, with
Chat either woven through them or used as one final connective moment. Welcome plus one page per
capability would be too long and would make future capability growth structurally worsen first
install.

The phrase “users can do anything in any capability from AI Chat” should be treated as a product
ambition, not onboarding copy. The truthful promise is narrower: **Ask Kwilt for help, and Chat can
use supported capabilities to carry out bounded actions with the same confirmation and control as
the app.**

## Anchor coverage

No new JTBD node is required for onboarding or capability discovery. The expansion is covered by:

- `jtbd-move-the-few-things-that-matter` for recognizing and entering useful help;
- `jtbd-help-us-enjoy-being-together` for the Games value family;
- `jtbd-get-help-without-retelling-my-life` for Chat as a cross-capability entry;
- `jtbd-stay-in-control-of-ai-actions` for action authority and confirmation; and
- `jtbd-trust-this-app-with-my-life` for truthful breadth, brevity, and stable navigation learning.

Meals, Chores, Screen Time, and household coordination may eventually justify more specific demand
anchors, but this onboarding exploration should not invent them merely to describe product
capabilities.

## Frame recommendation

**Run the design-thinking loop with an expanded frame.**

The real design problem is no longer “chooser page versus open navigation.” It is:

> How might Kwilt give Maya a short, skippable understanding of the kinds of help available, let
> her begin the moment one feels relevant, and then reveal the real product map without making
> first install grow with every capability?

The divergence phase should compare materially different ways to combine value storytelling,
choice, Chat, and the handoff into the real shell. It should not compare different visual styles of
the same carousel.

## Review question

Should divergence hold **three or four value-family moments** as the target length and require each
moment to double as a direct start door, while comparing whether Chat is woven through those pages
or receives one final connective moment?
