# Frame Correction: Kwilt Chat As The Primary Operating Surface

## Status

This correction follows divergence and the constructed-offer yes-and. It must
shape convergence. It does not authorize implementation.

The latest product decision is explicit: Kwilt should have and expand its
ChatGPT connector, but the connector is not the destination for ongoing money
management. It should demonstrate Kwilt's value, preserve the customer's
intent, and help the customer adopt Kwilt. Kwilt Chat owns the continuing
relationship, proactive follow-through, and capability-governed actions.

## What the user observed

A retired, very low-app-fluency customer spent substantial time using ChatGPT
and loved it. She then tried to use the same conversational surface to manage
her finances. The experience failed in two specific ways:

1. ChatGPT was not connected to her authoritative financial data.
2. It could not durably carry her requests across time and initiate the
   recurring reminders or prompts she wanted.

She did not primarily need a simpler finance dashboard. She wanted the
conversational interface she already understood to become financially grounded
and capable of follow-through.

## Restated in user voice

When conversation is already the easiest way for me to think and ask for help,
I want that same assistant to understand my current finances and remember what
I asked it to do later, so I can manage ordinary money decisions without
learning a separate finance app or remembering to return to it at the right
time.

## Anchor assessment

- `jtbd-get-help-without-retelling-my-life` — the user should not have to leave
  a successful conversation, navigate Money, and reconstruct the same question.
- `jtbd-carry-intentions-into-action` — a request such as `tell me after payday`
  needs durable timing, delivery, and loop closure rather than a one-time answer.
- `jtbd-review-budget-reality-before-spending` — conversational ease is useful
  only if the answer comes from current authoritative Money evidence.
- `jtbd-stay-in-control-of-ai-actions` — Chat may construct an offer, but the
  customer must understand and authorize the actual loop and any later action.
- `jtbd-trust-this-app-with-my-life` — financial connection, proactive delivery,
  cross-channel continuity, and visible limits are high-trust behavior.

```yaml
serves:
  - jtbd-get-help-without-retelling-my-life
  - jtbd-carry-intentions-into-action
  - jtbd-review-budget-reality-before-spending
  - jtbd-stay-in-control-of-ai-actions
  - jtbd-trust-this-app-with-my-life
```

## Persona implication

Maya remains the primary persona, but the evidence reveals a
**conversation-primary mode** that cuts across age and conventional technical
fluency. Someone may be poor at navigating apps and excellent at expressing
needs conversationally.

The retired customer is not well described as a productivity power user, yet
her sustained ChatGPT use is behaviorally AI-native. This is not enough evidence
to create a new audience taxonomy entry. It is enough to reject the assumption
that low app fluency implies low appetite for capable AI.

## What I see in the current surfaces

### The strongest failure mode: structural hierarchy

Chat is technically a standalone capability and already has durable threads,
typed tools, proposals, receipts, and a global menu entry. But its current Money
participation is incomplete:

- request routing recognizes Money;
- a bounded device `money.read` tool and Money evidence adapter exist;
- `UnifiedChatLaunchContext` does not yet include Money;
- the manifest exposes Money read on the device, while most consequential Money
  work remains native-confirmation-only;
- no loop create/change/pause/stop operation exists;
- the external MCP connector does not currently have a server-capable Money
  read provider.

The problem is not primarily Chat button placement. Chat does not yet carry
enough connected truth, future continuity, and capability-backed action to earn
the role of primary UI.

### Secondary failure: missing continuity of initiative

A conversational answer ends when the turn ends. The customer can ask again,
but the system cannot yet say, truthfully, `I will check after your next income
deposit and return here.` Without loops, Chat is reactive assistance rather than
an ongoing operating relationship.

## Corrected ownership model

The earlier phrase `capability-constructed offer` assigned too much experience
ownership to Money. The corrected model separates four responsibilities:

```text
Chat experience and orchestration
- understands the customer's words and current conversation
- retrieves the minimum authorized context
- composes and ranks a useful offer
- phrases the proposal in the customer's language
- carries conversational referents across correction and delivery
                         |
                         v
Capability truth and policy (Money, Goals, Activities, etc.)
- supplies authoritative evidence
- declares supported questions, trigger primitives, and outcome operations
- constrains claims and provider availability
- validates the composed proposal
- owns financial calculation, preview, correction, mutation, and receipt
                         |
                         v
Loop runtime
- persists trigger, evaluation, authority, lifecycle, and causal run
- handles time, event, condition, deduplication, retry, pause, and stop
                         |
                         v
Delivery channel
- in-app Chat timeline, push, Phone Agent SMS, or authorized external doorway
- owns channel consent, disclosure, delivery status, and opt-out behavior
```

Chat may decide that a `$65 remaining` notification is likely to help because
the customer has been discussing overspending and Money exposes a supportable
typical-spend candidate. Chat may phrase and present that offer. It cannot
invent the `$65`, redefine qualifying spending, assert unsupported forecast
confidence, or activate a loop that Money validation rejects.

This is analogous to a skilled human advisor using a trustworthy ledger: the
advisor constructs the suggestion; the ledger and financial rules determine
whether its factual basis is sound.

## Cross-capability value

Chat ownership matters most when the useful loop spans capabilities. A single
capability cannot always construct the whole customer intent:

- `After I get paid, ask whether I still want to increase my Travel Goal.`
  Money supplies the supported deposit event; Goals supplies the target and
  proposal policy; Chat holds the combined intent; the loop runtime coordinates
  the future turn.
- `If Shopping runs hot, remind me why I wanted to keep room for Charlie's
  birthday.` Money supplies the condition; the customer's explicit conversation
  supplies the reason; Chat returns both without turning relationship context
  into a financial category.
- `Every Sunday, tell me what Money needs attention and prepare two options for
  the coming week.` Money supplies bounded exceptions; Goals/Activities supply
  planning candidates; Chat synthesizes without a universal score.

Cross-capability loops require explicit scope and owner-specific authority for
each evidence read or action. One trigger never grants universal standing
permission.

## References worth knowing

### ChatGPT conversation — observed user reference

- What it does well: accepts the customer's natural mental model without
  requiring knowledge of an app taxonomy; the retired customer voluntarily
  spent substantial time there.
- What translates: conversational entry, ordinary follow-ups, flexible phrasing,
  and continuity as the dominant interaction.
- What not to copy: financially ungrounded analysis, confident answers without
  connected evidence, or promises of future initiation that the channel cannot
  actually perform.

### Kwilt Unified Chat — current native surface

- What it does well: durable causal timeline, bounded private context, typed
  capability tools, proposals, receipts, exact return, and channel-independent
  architecture.
- What translates: it can become a real operating surface without building a
  second conversation backend.
- What not to preserve: incomplete Money context, read-only shallowness, and an
  experience where Chat is available but not consequential enough to become a
  habit.

### Kwilt external ChatGPT/Claude connector — current planned doorway

- What it does well: respects the user's existing conversational home and
  projects server-capable Kwilt tools through OAuth and MCP.
- What translates: the customer can discover the value of connected Kwilt help
  in a surface they already understand, then carry the exact need into Kwilt
  without starting over.
- What not to assume: external chat is pull-based; it cannot be treated as the
  proactive delivery channel or the primary place to manage durable loops, and
  current server tool inventory does not expose Money read.

### Kwilt Phone Agent — future proactive conversational channel

- What it does well in the target architecture: owns verified phone identity,
  SMS consent, quiet hours, caps, right-time prompts, deterministic commands,
  and conversational loop closure.
- What translates: proactive results can arrive in a familiar thread and
  continue with `Why?`, `Pause`, or `Change it`.
- What not to assume: source inventory is not deployed provider proof; unfinished
  Phone Agent surfaces remain hidden.

## Three experience sketches

### Sketch A: A much more capable Chat destination

Kwilt keeps the current shell. Chat remains a normal global destination, but
Money becomes a full participant: contextual launch, current answer components,
loop offers, typed loop receipts, proactive timeline entries, and exact native
return. Customers who repeatedly use Chat naturally return to the same durable
thread; no explicit `Chat mode` setting is required.

```text
Maya: Am I likely to overspend this month?

Kwilt: Current pace is above your monthly plan, but the forecast is not yet
strong enough to call an overspend likely. You have $343 flexible now.

Would a private heads-up when less than $100 remains help?
[ Yes ]  [ Change amount ]  [ No ]
```

- Anchor check: strong on connected evidence, ordinary language, and control.
- Reference grounding: Kwilt Unified Chat plus ChatGPT's conversational ease.
- Best when: the customer is willing to use the Kwilt app but prefers
  conversation over capability navigation.
- Fails when: customers must still open Money for ordinary explanation, Chat
  output is generic prose, or proactive updates do not return to the thread.

### Sketch B: ChatGPT as an adoption bridge

The customer encounters Kwilt while asking an ordinary life or money question
in ChatGPT. The connector helps within its truthful, privacy-bounded limits. If
the question needs connected financial truth, durable follow-through, or a
proactive loop, it explains why Kwilt is the right place to continue and offers
a secure handoff that preserves the bounded request. Kwilt Chat resumes the job,
guides any required native connection or confirmation, and becomes the home for
future answers, offers, receipts, and follow-up.

```text
User in ChatGPT: Tell me after Social Security arrives whether I am still
within my 70% living limit.

ChatGPT using Kwilt: Kwilt can answer that from your connected accounts and
follow up after the deposit arrives. Continue this request privately in Kwilt.

[ Continue in Kwilt ]
```

- Anchor check: strong `get help without retelling` and activation fit, provided
  the handoff resumes the request rather than opening a generic home screen.
- Reference grounding: the actual ChatGPT habit plus Kwilt's MCP/OAuth boundary.
- Best when: ChatGPT reveals a need that becomes materially better with Kwilt's
  connected truth, continuity, and proactive delivery.
- Fails when: the connector withholds an answer merely to force an install,
  repeats promotional prompts, transfers excessive conversation context, or
  lands the customer somewhere that makes them reconstruct the request.

### Sketch C: A channel-independent runtime with a Kwilt-owned experience

Kwilt uses one capability-governed runtime beneath in-app Chat, the external
connector, notifications, and Phone Agent. The architecture is channel
independent, but the product hierarchy is not: Kwilt Chat is the durable home.
The customer may discover Kwilt in ChatGPT, continue the preserved request in
Kwilt Chat, receive a notification later, and open native Money only for deeper
evidence or consequential control. The system preserves one loop, one scope,
one receipt, and channel-appropriate disclosure without pretending every
channel is the same thread UI.

```text
Ask anywhere
    ↓
Kwilt agent run + capability evidence
    ↓
typed loop and authority
    ↓
return through the authorized channel
    ↓
native capability only when deeper truth or control is needed
```

- Anchor check: strongest long-term system fit across continuity, action
  control, financial truth, and Kwilt adoption.
- Reference grounding: Unified Chat architecture, external connector boundary,
  and Phone Agent follow-through model.
- Best when: customers can enter from familiar channels while Kwilt earns the
  ongoing relationship through connected and proactive value.
- Fails when: `one system` becomes an excuse for one giant transcript, channel
  consent is flattened, external providers become the de facto product home,
  or native capabilities become hidden black boxes.

## The adoption journey

The connector-to-Kwilt transition should feel like continuation, not
acquisition machinery:

1. The customer asks a real money question in ChatGPT.
2. The connector recognizes that the useful answer needs private connected data
   or that the request asks Kwilt to carry an intention across time.
3. It provides whatever bounded help it can, then explains the specific added
   value: Kwilt can connect current accounts, answer from authoritative Money
   truth, and follow up proactively.
4. A secure OAuth or universal-link handoff opens Kwilt Chat with a minimal,
   explicit intent envelope. Raw transcript history is not transferred by
   default.
5. Kwilt Chat restates the request in plain language and asks for any necessary
   native authorization. Plaid remains Plaid; Kwilt does not imitate or replace
   its connection flow.
6. After connection, the customer returns to the same Kwilt Chat context and
   receives the current Money answer.
7. Chat may construct one relevant, Money-validated loop offer from the
   conversation—for example, a heads-up near the living limit.
8. Acceptance creates a typed loop with a plain receipt and private
   notification delivery. Later, Phone Agent may be an additional authorized
   channel.
9. The notification returns to the same Kwilt Chat thread, where the customer
   can ask why, change it, pause it, stop it, or open the authoritative Money
   evidence.

### Adoption guardrails

- The connector remains useful within its real capabilities; it does not refuse
  a safe answer solely to manufacture an app open.
- Invite once at the moment connected or proactive value is genuinely relevant;
  do not turn ordinary connector use into repeated promotion.
- Say why Kwilt is required: private financial connection, durable execution,
  proactive delivery, or native authorization—not vague claims of a better app.
- Transfer the minimum structured intent and disclosed source context. Do not
  copy an external transcript into Kwilt without explicit consent.
- Never imply that a connection, notification, loop, purchase decision, or
  financial change succeeded until the owning Kwilt capability can prove it.
- A returning connected customer may still get bounded connector value, but
  initial loop creation and ongoing management should lead to Kwilt Chat.
- The handoff must land in the continued job, never a generic download,
  onboarding, dashboard, or settings screen.

## Recommendation

Choose **Sketch A as the product direction**, supported by **Sketch C as the
architecture**, with **Sketch B as an acquisition and adoption bridge**.

This is a deliberate product hierarchy:

1. Kwilt Chat owns the ongoing customer relationship and becomes behaviorally
   primary through useful answers, durable threads, notification returns, and
   contextual capability cards—not a new shell mode or navigation pattern.
2. Money and other capabilities remain authoritative evidence and governance
   surfaces behind the conversation.
3. A shared runtime keeps scope, validation, loops, receipts, and delivery
   truthful across channels.
4. The ChatGPT connector helps customers discover Kwilt through a real need and
   hands that need into Kwilt without retelling.
5. Push provides the first proactive return path; Phone Agent may add SMS after
   its identity, consent, provider, and delivery proof exists.

### The bet

We are betting that ChatGPT demonstrates demand for conversation, but Kwilt can
earn adoption by doing what a general conversational surface cannot reliably do:
answer from connected private truth, preserve the customer's intention, act
within capability-owned authority, and return proactively over time. If Kwilt
Chat does those jobs simply, customers who dislike finance-app interfaces will
choose it as their ongoing operating surface.

If this does not improve repeated use, comprehension, and trust, the next move
is not to make Chat more visually prominent. It is to test whether the connected
answers and proactive loops are insufficiently valuable or insufficiently
trustworthy.

### What to test first

- One current Money question in Kwilt Chat using authoritative device evidence.
- One Chat-constructed, Money-validated fixed-threshold loop offer.
- One private notification returning to the same Chat context.
- One plain receipt with `Change`, `Pause`, and `Stop`.
- Exact native return to Budget evidence.

### What remains deferred

- Broad external ChatGPT Money access until a server-capable privacy-bounded
  provider and OAuth scope exist. A minimal intent-preserving adoption handoff
  can be evaluated separately without exposing Money data externally.
- Phone Agent delivery until verified linking, provider, consent, scheduler, and
  cross-channel proof exist.
- Forecast-based offers until claim calibration is earned.
- Cross-capability loop execution until owner-specific authority composition is
  specified.
- Any new app-shell navigation mode or universal automation dashboard.

### Success signal

A customer who normally avoids capability navigation can ask the Money question,
understand the connected answer, accept or decline one relevant loop offer,
receive the promised private follow-up, and change or stop it conversationally
without needing help or opening a generic settings builder.

For the connector path, success is not repeated external tool use by itself. It
is that a customer can begin with a genuine need in ChatGPT, understand why
Kwilt adds value, continue that exact need in Kwilt Chat, and complete a first
connected answer or useful loop without feeling redirected or starting over.
