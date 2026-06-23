# Diverge: To-Do Action Contexts

Axis of variation: user-defined vs. inferred context, in-app list vs. ambient surface, manual tags/views vs. passive signals, field-filtered views vs. first-class action context model, comprehensive list vs. single next action.

## Option A: Context Smart Views

Add a small set of opinionated system or template views: `Away`, `Calls/messages`, and maybe `At home`, with `At computer` handled primarily by Kwilt Desktop. Each view filters Activities using existing signals first: tags, type, location metadata, schedule availability, and simple text cues. The user can still apply the grouping control inside the context view. For example, the desktop app can show computer-ready tasks grouped by Goal or Status.

- Audience/persona fit: Strong for Maya because it matches her language without asking her to design filters from scratch.
- Design-challenge answer: Helps when the user chooses an in-app list, but still assumes opening Kwilt is acceptable.
- System-fit note: Reuses ActivityView, filters, tags, location metadata, the desktop app entry point, and the branch's grouping implementation. May need curated templates and better default tags.
- Best when: Context can be approximated well enough from existing tags/type/location and user-created views.
- Fails when: Users do not tag or describe tasks in ways the filters can use, causing sparse or wrong views, or when the moment should be served without opening the app.
- Object model: Activity-first. Goals remain optional context. No new planning object.
- Capture-first stance: Pass. Activities can be captured without context and later appear in `None` or general views.
- Primer anti-pattern check: Pass. No dashboard, score, streak, forced setup, or auto-anchoring.

## Option B: Context Grouping

Add `Context` as a new grouping option beside Goal, Schedule, and Status. A grouped list would section Activities into `Away`, `At computer`, `Calls/messages`, `At home`, and `None`. This gives the customer exactly what she said: see computer work together, errands together, and uncategorized work separately.

- Audience/persona fit: Medium. It sounds close to the quote, but may overload grouping with semantic inference.
- Design-challenge answer: Helps scan by action context, but does not decide whether the current list should be scoped to a context.
- System-fit note: Extends `ActivityGroupingField` and `activityGrouping.ts`, but requires deciding how an Activity gets a context group.
- Best when: Most users want one list sectioned by context rather than entering a specific mode.
- Fails when: One Activity belongs to multiple contexts, or the user wants only the tasks for the current context.
- Object model: Activity-first, but risks turning grouping into an Activity classification model.
- Capture-first stance: Pass only if `None` remains neutral and common.
- Primer anti-pattern check: Mostly pass, but risk of productivity-app taxonomy if labels multiply.

## Option C: Contextual Recommended Strip

Keep the main list and grouping as-is, but make Recommended context-aware. When Kwilt detects or the user selects a mode like `Away` or `At computer`, the top module shows a few "doable here" Activities. The rest of the list remains available below. Grouping can still be used after the user chooses to reshape the full list.

- Audience/persona fit: Strong later. It removes scanning effort and speaks to the "what should I do here?" moment.
- Design-challenge answer: Makes context a recommendation input rather than a view-builder burden, but still lives primarily inside the app.
- System-fit note: Builds on the existing Recommended surface and priority model. Requires stronger explanation and candidate-set rules.
- Best when: Recommended already has user trust and enough signals to avoid bizarre suggestions.
- Fails when: Context detection is weak or users want comprehensive lists, not a small suggestion set.
- Object model: Activity-first; Goals inform importance, context informs actionability.
- Capture-first stance: Pass.
- Primer anti-pattern check: Pass if copy is humble and explanations are concrete; risky if AI feels like hidden authority.

## Option D: Action Context Field

Introduce a first-class Activity context model, such as `actionContexts: ['away', 'computer', 'home', 'calls']`, separate from tags and location triggers. Quick Add, Activity detail, mobile surfaces, and desktop surfaces can infer or edit contexts. Views, grouping, Smart order, and Recommended can all consume the same field.

- Audience/persona fit: Strong if the model is invisible enough, weak if it asks Maya to classify every task.
- Design-challenge answer: Creates the cleanest long-term substrate for "doable in this mode."
- System-fit note: Extends the domain model, store persistence, filters, AI enrichment, Activity detail editing, and tests.
- Best when: Context becomes a recurring product primitive across mobile, desktop, widgets, and agents.
- Fails when: V1 needs fast learning and the field becomes setup work before value is proven.
- Object model: Activity-first with an additional Activity availability property.
- Capture-first stance: Pass only if context is optional and inferred suggestions are reversible.
- Primer anti-pattern check: Pass if the UI avoids taxonomy-management language.

## Option E: Transition Prompts

Offer lightweight entry points at natural moments: "Leaving home?", "At your computer?", "Running errands?" The user taps one, and Kwilt opens a context-scoped Activity list. These prompts could live as chips on Activities, widgets, shortcuts, or eventually notifications. They do not require automatic detection in V1.

- Audience/persona fit: Strong because it mirrors real life transitions while staying explicit.
- Design-challenge answer: Lets the user declare the mode in one tap and get a next action or relevant list, depending on the surface.
- System-fit note: Reuses views and filter logic, but adds a new entry surface. Can start as chips above the list.
- Best when: The app cannot reliably infer context but wants to lower the cost of switching into a mode.
- Fails when: The chips feel like clutter or duplicate saved views.
- Object model: Activity-first; context selection is session state or view choice.
- Capture-first stance: Pass.
- Primer anti-pattern check: Pass if prompts stay calm and do not become nagging notifications.

## Option F: Contextual Next Action Surface

Instead of starting with views, treat context as an input to a single next-action decision. Kwilt uses known signals when available, such as location metadata, tags, schedule, Activity type, device/platform, and recent behavior, then asks for one lightweight context hint only when needed. The output can be a Recommended card in-app, a widget action, a shortcut result, a notification, or the default surface when the user opens Kwilt Desktop. A full context list remains available as a fallback for users who want to scan.

- Audience/persona fit: Strong. It honors the customer's desire to avoid friction when she is already out, at a store, or sitting down to work.
- Design-challenge answer: Directly answers "what should I do next here?" without assuming the user wants to open and scan a list.
- System-fit note: Builds on Recommended, Activity priority/actionability, existing location metadata, tags, and future desktop/widget surfaces. Requires clearer candidate-set and explanation rules.
- Best when: The product can confidently choose one or a few actions and explain the context signal.
- Fails when: Context is unknown and the prompt becomes annoying or overconfident.
- Object model: Activity-first; context is an actionability input, not a new planning object.
- Capture-first stance: Pass. Capture remains available; context improves retrieval and action.
- Primer anti-pattern check: Pass if suggestions stay humble, concrete, and reversible; fail if they become nagging productivity prompts.

## Option G: Tag-First Organization

Let users organize contextual tasks by tags such as `errands`, `computer`, `calls`, and `home`, then create saved views filtered by those tags. This is flexible and already fits the existing Activity model. It also matches one straightforward interpretation of the customer's request: "computer work" and "away from home" can be represented as tags.

- Audience/persona fit: Weak for Maya as a default. It can work for a motivated power user, but the customer is actively busy and likely wants Kwilt to reduce friction rather than ask her to maintain metadata.
- Design-challenge answer: Partially answers context organization, but does not answer least-friction next action because the user must tag, remember the tag, create or switch views, and scan.
- System-fit note: Strong technically because tags and saved views already exist; weak behaviorally because it shifts the work onto the user.
- Best when: A user already has tag hygiene, a small stable vocabulary, and a reason to maintain views.
- Fails when: Most captured Activities are untagged, tags are inconsistent, or the user is in motion and needs a next action immediately.
- Object model: Activity-first; tags remain lightweight metadata.
- Capture-first stance: Risky if the feature depends on tags being present at capture time.
- Primer anti-pattern check: Pass only if tags are optional signals. Fails if Kwilt turns context into setup work or a productivity-app taxonomy.

## Option H: Evidence-Based Saved Places

When the user repeatedly completes, opens, or receives recommendations for similar tasks at a location, Kwilt can infer a candidate place context and ask for confirmation. For example, if grocery or shopping-tagged Activities repeatedly happen at the same store, Kwilt can suggest "Remember this as a grocery place?" The saved place then becomes a stronger signal for future `Away/Errands` recommendations.

- Audience/persona fit: Strong if the ask appears after clear value. Maya does not have to create a place taxonomy up front; Kwilt notices a useful pattern and asks.
- Design-challenge answer: Helps mobile context become place-aware without requiring constant view switching or silent background profiling.
- System-fit note: Builds on Activity location metadata, tags/type/title cues, and location-trigger preferences. Requires a saved-place model or a lightweight equivalent later.
- Best when: There is repeated task-place evidence, such as grocery/shopping tasks recurring at the same location.
- Fails when: Kwilt asks too early, guesses from a single visit, or queries unknown addresses without user-visible value.
- Object model: Activity-first; saved places are contextual evidence for Activities, not a new planning object.
- Capture-first stance: Pass if place saving is optional and never required to create or complete a task.
- Primer anti-pattern check: Pass if phrased as a practical suggestion and confirmed by the user; fail if it feels like surveillance.

## Recommended direction

The options should compose as a **layered contextual action system**, not compete as mutually exclusive features:

- Option G, tags, is an optional evidence source.
- Option H, saved places, turns repeated task-location patterns into user-confirmed place context.
- Option D, action context, is the eventual shared context contract if usage proves the need.
- Option F, contextual next action, is the primary user outcome.
- Option C, contextual Recommended, is the first in-app expression of that outcome.
- Option E, transition prompts, is how the user can supply context when Kwilt does not know it.
- Option A, context smart views, is the inspect-more fallback.
- Option B, context grouping, is a later scan lens only if users want one master list sectioned by context.

The frame should be contextual next action, not context views. Start by helping Maya identify one or a few low-friction next actions from the current context; when the user wants to inspect more, open the matching context view and let grouping organize that visible subset. Tags can contribute evidence, but Option G should not be the core UX because it assumes power-user upkeep. Defer Option D until usage proves context deserves a first-class field. Do not add `Context` as a generic grouping option in V1, because that makes grouping responsible for a semantic job it was not designed to own.
