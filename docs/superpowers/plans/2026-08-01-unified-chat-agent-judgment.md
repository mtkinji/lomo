# Unified Chat Agent Judgment Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Unified Chat's narrow semantic classification pass with a fast GPT-5.6 Luna judgment layer that states the user's job, desired outcome, constraints that must survive, appropriate tools, and whether an ordered multi-tool plan is required before bounded execution begins.

**Architecture:** One internal `agent_judgment` Responses API call runs before capability context loading and replaces the current `lightweight_helper` semantic route. It receives bounded conversation context, current local time, and a compact tool catalog, then returns a strict `AgentJudgment` artifact. Existing deterministic safety locks, capability-owned tool validation, proposals, receipts, recovery, and native handoffs remain authoritative; the judgment artifact guides tool discovery and execution but never proves that an action occurred.

**Tech Stack:** React Native/Expo, TypeScript, Jest, Supabase Edge Functions, OpenAI Responses API, GPT-5.6 Luna with low reasoning effort, `@kwilt/agent-runtime`, existing Unified Chat tool catalog and run persistence.

---

## Product and execution contract

The first learning release must satisfy these requests:

| Request | Judgment | Expected authoritative outcome |
| --- | --- | --- |
| `Add Call the dentist on August 5.` | One Activity tool, absolute date preserved | Created To-do receipt containing title and `scheduledDate` |
| `Remind me every Tuesday at 8 PM to take out the trash.` | One Activity tool with recurrence and reminder constraints | Reviewed or applied recurring Activity with authoritative fields |
| `What is actually on my Plan tomorrow?` | Plan read, no mutation | Capability-owned Plan answer for the correct local date |
| `Help me make room for the dentist next week and remind me to call first.` | Read Plan, capture call, then propose placement/reminder as dependencies allow | Read result plus proposals; no invented completion |
| `Actually, make that Thursday.` | Continue the pending work referent and edit the exact pending date | Updated pending proposal, not a second To-do |
| `Why do leaves change color?` | Direct answer, no Kwilt tools or private context | Ordinary assistant answer |

The judgment layer may be non-deterministic. These boundaries are not:

- Tool ids must exist in the discovered catalog.
- A later step may depend only on an earlier step.
- Explicit dates, times, recurrence, titles, and named targets identified by the judgment become required constraints for execution.
- Tool output, proposals, mutation receipts, and native acknowledgements remain the only proof of effects.
- High-stakes and unsupported consequential boundaries cannot be weakened by the model.
- Failure of the judgment call falls back to the current bounded routing behavior; it does not fail the user's whole turn.

## File responsibility map

- `src/features/unifiedChat/agentJudgment.ts` — strict artifact types, JSON schema, response parser, and structural validation.
- `src/features/unifiedChat/agentJudgmentPrompt.ts` — bounded prompt built from the current request, local time, recent turns, visible context, pending work, and compact tool metadata.
- `src/features/unifiedChat/requestAgentJudgment.ts` — Responses API adapter and response extraction; returns `null` on recoverable model/transport failure.
- `src/features/unifiedChat/turnPlanningPhase.ts` — deterministic locks plus model judgment resolution and fallback.
- `src/features/unifiedChat/turnExecutionPhase.ts` — judgment-guided tool discovery and execution grounding.
- `src/features/unifiedChat/runUnifiedChatTurn.ts` — dependency injection and durable run metadata plumbing.
- `src/features/unifiedChat/unifiedChatTelemetry.ts` — privacy-bounded judgment, plan, preservation, and fallback measurements.
- `supabase/functions/_shared/aiModelRouting.ts` — server-authoritative `agent_judgment -> gpt-5.6-luna` selection.
- `supabase/functions/_shared/aiRequestValidation.ts` — allowlisted, bounded Responses request contract for judgment calls.
- `supabase/functions/ai-chat/index.ts` — existing proxy path; no new public endpoint.
- `src/features/unifiedChat/agentJudgmentEvalCases.ts` — replayable job-understanding and constraint-preservation corpus.
- `docs/feature-briefs/unified-chat.md` and `src/features/unifiedChat/FEATURE.md` — product contract and current proof boundary.

## Task 1: Define the strict AgentJudgment artifact

**Files:**
- Create: `src/features/unifiedChat/agentJudgment.ts`
- Create: `src/features/unifiedChat/agentJudgment.test.ts`

- [ ] **Step 1: Write failing parser tests for a direct answer, a single tool, and a multi-tool plan**

Create fixtures with this public type shape:

```ts
export type AgentJudgmentExecutionMode =
  | 'direct_answer'
  | 'single_tool'
  | 'multi_tool'
  | 'clarify'
  | 'boundary';

export type AgentJudgmentConstraint = {
  kind: 'title' | 'date' | 'time' | 'timezone' | 'recurrence' | 'person' | 'amount' | 'other';
  sourceText: string;
  normalizedValue: string;
};

export type AgentJudgmentStep = {
  sequence: number;
  objective: string;
  toolId: string | null;
  dependsOn: number | null;
};

export type AgentJudgment = {
  schemaVersion: 1;
  userJob: string;
  desiredOutcome: string;
  requestClass: UnifiedChatRequestClass;
  participatingCapabilities: UnifiedChatCapabilityId[];
  usePrivateContext: boolean;
  informationNeed: 'stable' | 'current';
  executionMode: AgentJudgmentExecutionMode;
  constraints: AgentJudgmentConstraint[];
  steps: AgentJudgmentStep[];
  clarificationQuestion: string | null;
  confidence: number;
  reason: string;
};
```

The direct-answer fixture has no capabilities, constraints, steps, or clarification. The single-tool fixture uses `activities.capture`. The multi-tool fixture uses `plan.read_day_context`, `activities.capture`, and `plan.schedule_activity` with sequential dependencies.

- [ ] **Step 2: Run the parser suite and confirm the module is absent**

Run:

```bash
npm test -- --runInBand src/features/unifiedChat/agentJudgment.test.ts
```

Expected: FAIL because `agentJudgment.ts` does not exist.

- [ ] **Step 3: Add rejection cases for unsafe or incoherent artifacts**

Test all of these cases explicitly:

```ts
test.each([
  'unknown request class',
  'unknown capability',
  'confidence outside zero to one',
  'duplicate capability',
  'duplicate step sequence',
  'step dependency pointing forward',
  'single_tool with zero or multiple steps',
  'multi_tool with fewer than two steps',
  'direct_answer with tools or private context',
  'clarify without a question',
  'boundary with a tool step',
  'unknown response field',
  'reason longer than 240 characters',
])('rejects %s', (scenario) => {
  expect(parseAgentJudgment(invalidFixture(scenario), LIVE_TOOL_IDS)).toBeNull();
});
```

- [ ] **Step 4: Implement the strict schema and parser**

Export:

```ts
export const AGENT_JUDGMENT_RESPONSE_FORMAT = {
  type: 'json_schema',
  name: 'kwilt_agent_judgment',
  strict: true,
  schema: AGENT_JUDGMENT_SCHEMA,
} as const;

export function parseAgentJudgment(
  raw: unknown,
  allowedToolIds: ReadonlySet<string>,
): AgentJudgment | null;
```

Keep the parser defensive even though the API uses strict structured output. Trim text, cap `userJob` and `desiredOutcome` at 500 characters, cap `objective` at 300, cap constraints at 16, cap steps at 8, and reject tool ids absent from `allowedToolIds`.

- [ ] **Step 5: Run the focused test and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/agentJudgment.test.ts
git add src/features/unifiedChat/agentJudgment.ts src/features/unifiedChat/agentJudgment.test.ts
git commit -m "feat: define unified chat agent judgment"
```

Expected: PASS with no snapshots and no chain-of-thought fields in the schema.

## Task 2: Build the bounded judgment prompt

**Files:**
- Create: `src/features/unifiedChat/agentJudgmentPrompt.ts`
- Create: `src/features/unifiedChat/agentJudgmentPrompt.test.ts`
- Reuse: `src/features/unifiedChat/toolCatalog.ts`
- Reuse: `src/features/unifiedChat/conversationReferent.ts`

- [ ] **Step 1: Write a failing prompt-boundary test**

Construct an input containing a private object id, long prior messages, current time `2026-08-01T16:30:00.000Z`, timezone `America/Denver`, one visible Activity label, and the live tool catalog. Assert:

```ts
expect(prompt).toContain('Current local date: 2026-08-01');
expect(prompt).toContain('Time zone: America/Denver');
expect(prompt).toContain('Call the dentist');
expect(prompt).toContain('activities.capture');
expect(prompt).not.toContain('private-activity-id');
expect(prompt.length).toBeLessThanOrEqual(12_000);
```

- [ ] **Step 2: Write job and constraint instruction tests**

Require the prompt to state these rules once:

```text
Infer the practical job the user is trying to complete.
Choose the smallest tool set that can achieve the desired outcome.
Use direct_answer when no Kwilt data or action is needed.
Use multi_tool only when multiple dependent operations materially help.
Preserve every explicit date, time, recurrence, amount, title, and named target as a constraint.
Ask one question only when a missing answer blocks safe progress.
Do not claim or perform an action.
```

- [ ] **Step 3: Run the focused suite and confirm failure**

```bash
npm test -- --runInBand src/features/unifiedChat/agentJudgmentPrompt.test.ts
```

Expected: FAIL because the prompt builder is absent.

- [ ] **Step 4: Implement `buildAgentJudgmentPrompt`**

Use this signature:

```ts
export function buildAgentJudgmentPrompt(input: {
  prompt: string;
  now: Date;
  timeZone: string;
  visibleContext: readonly SemanticRouterVisibleContext[];
  recentTurns: readonly CoachChatTurn[];
  pendingWorkSummary: string | null;
  tools: readonly AgentToolDefinition[];
}): string;
```

Include at most six recent turns, eight visible context labels, and the tools' id, capability, purpose, effect, consequence, confirmation, and provider list. Omit tool input/output schemas from this first call. Normalize the timezone through `normalizeIanaTimeZone`; use the device timezone when valid and UTC only as a defensive fallback.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/agentJudgmentPrompt.test.ts
git add src/features/unifiedChat/agentJudgmentPrompt.ts src/features/unifiedChat/agentJudgmentPrompt.test.ts
git commit -m "feat: prompt agent judgment from bounded context"
```

## Task 3: Add the server-authoritative Luna model job

**Files:**
- Modify: `supabase/functions/_shared/aiModelRouting.ts`
- Modify: `supabase/functions/_shared/__tests__/aiModelRouting.test.ts`
- Modify: `supabase/functions/_shared/aiRequestValidation.ts`
- Modify: `supabase/functions/_shared/__tests__/aiRequestValidation.test.ts`

- [ ] **Step 1: Write the failing routing assertion**

Add:

```ts
expect(resolveKwiltAiModel({
  route: '/v1/responses',
  job: 'agent_judgment',
})).toBe('gpt-5.6-luna');
```

Also assert `normalizeKwiltAiJob('agent_judgment')` returns the new job instead of `default_chat`.

- [ ] **Step 2: Write bounded Responses request validation tests**

Use a valid request shaped like:

```ts
const validAgentJudgmentRequest = {
  model: 'gpt-5.6-luna',
  store: false,
  reasoning: { effort: 'low' },
  max_output_tokens: 800,
  input: [{ role: 'user', content: 'Bounded agent judgment prompt' }],
  text: { format: AGENT_JUDGMENT_RESPONSE_FORMAT },
};
```

Assert rejection of `store: true`, `background: true`, any tools, more than two input messages, prompt content over 12,000 characters, reasoning effort other than `low`, output budget over 800, a format name other than `kwilt_agent_judgment`, or a non-strict schema.

- [ ] **Step 3: Run the Deno-focused tests and confirm failure**

```bash
deno test supabase/functions/_shared/__tests__/aiModelRouting.test.ts supabase/functions/_shared/__tests__/aiRequestValidation.test.ts
```

Expected: FAIL because `agent_judgment` is unknown and Responses validation rejects it.

- [ ] **Step 4: Implement the new job and allowlist**

Add `agent_judgment` to `KwiltAiJob`, route it to `gpt-5.6-luna`, and permit only the bounded shape above on `/v1/responses`. Do not change `lightweight_helper`; conversation titles, summaries, and other ambient helpers remain on their current model until separately evaluated.

- [ ] **Step 5: Run tests and commit**

```bash
deno test supabase/functions/_shared/__tests__/aiModelRouting.test.ts supabase/functions/_shared/__tests__/aiRequestValidation.test.ts
git add supabase/functions/_shared/aiModelRouting.ts supabase/functions/_shared/aiRequestValidation.ts supabase/functions/_shared/__tests__/aiModelRouting.test.ts supabase/functions/_shared/__tests__/aiRequestValidation.test.ts
git commit -m "feat: route agent judgment to gpt 5.6 luna"
```

## Task 4: Add the Responses API judgment adapter

**Files:**
- Create: `src/features/unifiedChat/requestAgentJudgment.ts`
- Create: `src/features/unifiedChat/requestAgentJudgment.test.ts`
- Modify: `src/services/ai.ts`
- Modify: `src/services/coachChatCreditPolicy.ts`
- Modify: `src/services/coachChatCreditPolicy.test.ts`

- [ ] **Step 1: Write response extraction tests**

Test a valid Responses payload containing one `output_text` item whose text is the strict judgment JSON. Test missing output, refused output, invalid JSON, invalid tool id, HTTP 429, HTTP 500, timeout, and abort.

The public adapter contract is:

```ts
export async function requestAgentJudgment(
  input: RequestAgentJudgmentInput,
  dependencies?: RequestAgentJudgmentDependencies,
): Promise<AgentJudgment | null>;
```

Recoverable provider, timeout, and malformed-response failures return `null`. An explicit abort rethrows the abort so Stop and steer behavior remain intact.

- [ ] **Step 2: Write the request-shape assertion**

Assert the outgoing body contains:

```ts
expect(body).toMatchObject({
  model: 'gpt-5.6-luna',
  store: false,
  reasoning: { effort: 'low' },
  max_output_tokens: 800,
  text: { format: AGENT_JUDGMENT_RESPONSE_FORMAT },
});
expect(headers['x-kwilt-ai-job']).toBe('agent_judgment');
```

- [ ] **Step 3: Write the internal-credit assertion**

Extend the credit policy so both `lightweight_helper` and `agent_judgment` are valid only with `creditPolicy: 'internal_helper'`. Assert neither consumes the user's visible generative attempt, while `default_chat` still does.

- [ ] **Step 4: Run focused tests and confirm failure**

```bash
npm test -- --runInBand src/features/unifiedChat/requestAgentJudgment.test.ts src/services/coachChatCreditPolicy.test.ts
```

Expected: FAIL because the adapter and new internal job do not exist.

- [ ] **Step 5: Implement the adapter using the existing proxy URL and timeout helper**

Export a small `requestUnifiedChatAgentJudgment` service function from `src/services/ai.ts`, parallel to `inspectUnifiedChatAttachments`. Keep API-key resolution, proxy authorization, timeout, quota parsing, and abort semantics in the service layer. Keep prompt construction and artifact parsing in the new feature files.

- [ ] **Step 6: Run tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/requestAgentJudgment.test.ts src/services/coachChatCreditPolicy.test.ts
git add src/features/unifiedChat/requestAgentJudgment.ts src/features/unifiedChat/requestAgentJudgment.test.ts src/services/ai.ts src/services/coachChatCreditPolicy.ts src/services/coachChatCreditPolicy.test.ts
git commit -m "feat: request bounded agent judgment"
```

## Task 5: Replace semantic routing with judgment-led turn planning

**Files:**
- Modify: `src/features/unifiedChat/turnPlanningPhase.ts`
- Create: `src/features/unifiedChat/turnPlanningPhase.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts`
- Retain: `src/features/unifiedChat/semanticRequestRouter.ts`
- Retain: `src/features/unifiedChat/routeUnifiedChatRequest.ts`

- [ ] **Step 1: Write a failing successful-judgment planning test**

Inject a judgment for `Add Call the dentist on August 5.` and assert:

```ts
expect(result.requestPolicy).toMatchObject({
  requestClass: 'capability_action',
  participatingCapabilities: ['todos'],
});
expect(result.agentJudgment).toMatchObject({
  userJob: 'Remember to call the dentist on the requested date',
  executionMode: 'single_tool',
  constraints: [expect.objectContaining({ kind: 'date', normalizedValue: '2026-08-05' })],
});
```

- [ ] **Step 2: Write deterministic-lock and fallback tests**

Prove:

- A high-stakes deterministic boundary stays `better_served_elsewhere` even if the model requests tools.
- Native Screen Time authorization cannot be weakened into an ordinary low-risk tool call.
- `null` judgment falls back to `classifyUnifiedChatRequest` plus the existing semantic router result when available.
- A valid judgment supersedes the old semantic route for ordinary requests, so production makes one planning-model call rather than two.
- A short follow-up can reuse the pending conversation referent while still receiving fresh judgment.

- [ ] **Step 3: Run the focused planning tests and confirm failure**

```bash
npm test -- --runInBand src/features/unifiedChat/turnPlanningPhase.test.ts src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts
```

- [ ] **Step 4: Extend the planned-turn type**

Return:

```ts
export type PlannedUnifiedChatTurn = {
  requestPolicy: UnifiedChatRequestPolicy;
  agentJudgment: AgentJudgment | null;
  judgmentSource: 'model' | 'semantic_fallback' | 'deterministic_fallback';
  requiresWebSearch: boolean;
  planConversationReferent: PlanPlacementConversationReferent | null;
  activityClarification: string | null;
};
```

Add `requestJudgment` to `RunUnifiedChatTurnDependencies` for deterministic tests. In production, call the Luna adapter once. Preserve the older semantic router only as a recoverable fallback during the learning release.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/turnPlanningPhase.test.ts src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts
git add src/features/unifiedChat/turnPlanningPhase.ts src/features/unifiedChat/turnPlanningPhase.test.ts src/features/unifiedChat/runUnifiedChatTurn.ts src/features/unifiedChat/runUnifiedChatTurn.phases.test.ts
git commit -m "feat: plan chat turns from agent judgment"
```

## Task 6: Guide bounded tool execution with the judgment plan

**Files:**
- Modify: `src/features/unifiedChat/turnExecutionPhase.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.appControl.test.ts`
- Modify: `src/features/unifiedChat/directAppControl.test.ts`

- [ ] **Step 1: Write the explicit-date regression first**

For `Add Call the dentist on August 5.`, inject a judgment whose one step selects `activities.capture` and whose constraints contain title and date. Assert the executed tool call is:

```ts
expect(executeRuntimeTool).toHaveBeenCalledWith(
  expect.objectContaining({
    toolId: 'activities.capture',
    arguments: expect.objectContaining({
      title: 'Call the dentist',
      scheduledDate: '2026-08-05',
    }),
  }),
  expect.anything(),
);
```

Assert the authoritative proposal or resulting Activity contains the same date and that `on August 5` is not retained in the title.

- [ ] **Step 2: Write the multi-tool grounding test**

For the dentist-planning request, assert the execution model receives:

```text
User job: Make room for a dentist appointment and remember the prerequisite call.
Desired outcome: A call To-do exists and the appointment can be placed next week.
Required constraints: next week; call first.
Planned steps:
1. Read next week's Plan.
2. Capture the prerequisite call.
3. Propose placement after the read result.
```

Assert only the judgment-selected tool ids are discovered unless a tool result returns `needs_input` or exposes a required provider handoff.

- [ ] **Step 3: Write safety and completion tests**

Prove that:

- Unknown judgment tool ids never reach the runtime.
- A plan cannot bypass explicit confirmation or native review.
- A tool proposal stops at review rather than allowing the model to claim application.
- A tool result may cause the bounded loop to ask one clarification or revise later calls.
- A successful tool mutation followed by missing prose still renders the capability-owned proposal or receipt rather than a total turn failure.

- [ ] **Step 4: Run focused execution tests and confirm failure**

```bash
npm test -- --runInBand src/features/unifiedChat/runUnifiedChatTurn.test.ts src/features/unifiedChat/runUnifiedChatTurn.appControl.test.ts src/features/unifiedChat/directAppControl.test.ts
```

- [ ] **Step 5: Add judgment grounding and remove the direct-title tool-loop bypass**

Pass `agentJudgment` into `executeUnifiedChatTurnPhase`. Build runtime tools from the validated judgment step ids when present. Remove `&& !directCreateTitle` from the `usesRuntimeToolLoop` decision so a direct Activity request containing structured constraints cannot fall back to title-only capture behavior. Keep deterministic recurring-reminder and compound-capture helpers as fallback inputs when judgment is unavailable.

Do not execute arbitrary JSON arguments emitted by the judgment call. The bounded execution model receives the plan plus actual tool schemas and produces validated tool calls; this preserves adaptive read-then-act behavior and capability-owned validation.

- [ ] **Step 6: Preserve a local authoritative response when prose generation fails**

When at least one proposal, pending client action, or receipt exists, materialize its existing deterministic presentation even if the execution model returns empty or malformed final prose. Only a turn with no authoritative artifact should become `visible_response_invalid`.

- [ ] **Step 7: Run tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/runUnifiedChatTurn.test.ts src/features/unifiedChat/runUnifiedChatTurn.appControl.test.ts src/features/unifiedChat/directAppControl.test.ts
git add src/features/unifiedChat/turnExecutionPhase.ts src/features/unifiedChat/runUnifiedChatTurn.test.ts src/features/unifiedChat/runUnifiedChatTurn.appControl.test.ts src/features/unifiedChat/directAppControl.test.ts
git commit -m "feat: execute unified chat from job level plans"
```

## Task 7: Add judgment quality and constraint-preservation telemetry

**Files:**
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.ts`
- Modify: `src/features/unifiedChat/unifiedChatTelemetry.test.ts`
- Modify: `src/features/unifiedChat/runUnifiedChatTurn.ts`
- Modify: `src/services/analytics/events.ts`

- [ ] **Step 1: Write privacy-bounded telemetry tests**

Add events for:

```ts
UnifiedChatAgentJudgmentSelected
UnifiedChatAgentJudgmentFallback
UnifiedChatAgentPlanOutcome
```

Assert properties contain only:

```ts
{
  judgment_source,
  request_class,
  execution_mode,
  capability_ids,
  tool_ids,
  step_count,
  constraint_kinds,
  confidence_bucket,
  outcome,
  failure_code,
}
```

Do not record user text, normalized constraint values, titles, names, record ids, raw model reasons, or tool arguments.

- [ ] **Step 2: Run the focused telemetry suite and confirm failure**

```bash
npm test -- --runInBand src/features/unifiedChat/unifiedChatTelemetry.test.ts
```

- [ ] **Step 3: Implement event builders and capture points**

Capture judgment selection after validation, fallback when the adapter returns `null`, and plan outcome after authoritative materialization. Bucket confidence as `low`, `medium`, or `high`; do not emit the raw floating-point value.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/unifiedChatTelemetry.test.ts
git add src/features/unifiedChat/unifiedChatTelemetry.ts src/features/unifiedChat/unifiedChatTelemetry.test.ts src/features/unifiedChat/runUnifiedChatTurn.ts src/services/analytics/events.ts
git commit -m "feat: measure agent judgment outcomes"
```

## Task 8: Establish the replayable judgment evaluation gate

**Files:**
- Create: `src/features/unifiedChat/agentJudgmentEvalCases.ts`
- Create: `src/features/unifiedChat/agentJudgmentEvalCases.test.ts`
- Modify: `src/features/unifiedChat/requestRoutingEvalCases.test.ts`
- Modify: `src/features/unifiedChat/agentCapabilityEvalCases.ts`

- [ ] **Step 1: Encode the first 60 evaluation cases**

Create six groups with ten cases each:

1. Explicit Activity dates: absolute dates, weekdays, today, tomorrow, and end-of-month.
2. Reminders and recurrence: exact time, vague daypart, weekly, weekdays, and monthly.
3. Plan questions and mutations: read, recommend, schedule, reschedule, remove, and follow-up references.
4. Multi-tool jobs: create Goal plus follow-through Activity, read Plan then place, create To-do then add reminder, and relationship read-before-correct.
5. No-tool requests: stable knowledge, writing, reflection without private context, and ordinary conversation.
6. Boundaries and ambiguity: unsupported consequential effects, high stakes, missing required target, conflicting dates, and unavailable providers.

Use this fixture shape:

```ts
export type AgentJudgmentEvalCase = {
  id: string;
  prompt: string;
  expectedExecutionMode: AgentJudgmentExecutionMode;
  expectedCapabilities: UnifiedChatCapabilityId[];
  expectedToolIds: string[];
  expectedConstraintKinds: AgentJudgmentConstraint['kind'][];
  expectedClarification: boolean;
};
```

- [ ] **Step 2: Write deterministic fixture conformance tests**

Assert every tool exists, every capability is registered, every expected tool belongs to an expected capability, ids are unique, and every operation in the standing conversational MVP has at least one judgment case.

- [ ] **Step 3: Add opt-in live-model evaluation output**

Add an opt-in runner guarded by `KWILT_RUN_LIVE_AGENT_JUDGMENT_EVALS=1`. It must print aggregate counts only by default and write no prompts or private context. A local developer may enable a verbose redacted report explicitly with `KWILT_AGENT_JUDGMENT_EVAL_REPORT=redacted`.

The release thresholds are:

```text
Explicit date constraint retention: 100%
Expected capability inclusion: >= 98%
Expected tool inclusion: >= 95%
Unsafe boundary violations: 0
Unnecessary clarification: <= 5%
Valid strict artifact rate: >= 99.5%
```

- [ ] **Step 4: Run fixture tests and commit**

```bash
npm test -- --runInBand src/features/unifiedChat/agentJudgmentEvalCases.test.ts src/features/unifiedChat/requestRoutingEvalCases.test.ts
git add src/features/unifiedChat/agentJudgmentEvalCases.ts src/features/unifiedChat/agentJudgmentEvalCases.test.ts src/features/unifiedChat/requestRoutingEvalCases.test.ts src/features/unifiedChat/agentCapabilityEvalCases.ts
git commit -m "test: gate unified chat agent judgment quality"
```

## Task 9: Update the product contract and proof boundary

**Files:**
- Modify: `docs/feature-briefs/unified-chat.md`
- Modify: `src/features/unifiedChat/FEATURE.md`
- Modify: `docs/job-flows/nina-trust-ai-with-my-life-system.md`
- Modify: `docs/delivery-evidence/unified-chat.yml`
- Create: `docs/delivery-evidence/unified-chat/2026-08-01-agent-judgment-learning-release.md`

- [ ] **Step 1: Document the interpretation-to-execution contract**

Add this sequence to the feature brief and feature manifest:

```text
interpret the user's job
→ name the desired outcome and required constraints
→ choose the smallest relevant tool set
→ decide direct answer, one tool, multi-tool plan, clarification, or boundary
→ execute through capability-owned tools
→ verify the authoritative outcome against the desired outcome
```

State that judgment is probabilistic while validation, permissions, mutations, and receipts are capability-owned.

- [ ] **Step 2: Correct the job-flow evidence language**

Do not retain a delivery score of 4 merely because the previous name-only simulator matrix passed. Record the explicit-date dogfood failure and generation unreliability as current contradictory evidence. Keep any score change evidence-based and state the next gate: the standing date and multi-tool matrix on a signed build.

- [ ] **Step 3: Add the learning-release evidence template**

Record commit SHA, model id, reasoning effort, proxy deployment state, eval totals, simulator build provenance, physical-device/TestFlight state, exact scenarios exercised, failures, and open gates. Do not claim current production behavior until the Edge Function and signed client using it are both deployed and verified.

- [ ] **Step 4: Run product checks and commit**

```bash
npm run product:lint
npm run architecture:lint
git add docs/feature-briefs/unified-chat.md src/features/unifiedChat/FEATURE.md docs/job-flows/nina-trust-ai-with-my-life-system.md docs/delivery-evidence/unified-chat.yml docs/delivery-evidence/unified-chat/2026-08-01-agent-judgment-learning-release.md
git commit -m "docs: define unified chat agent judgment release"
```

## Task 10: Verify locally, deploy deliberately, and prove the signed runtime

**Files:**
- Modify only when verification reveals an in-scope defect.
- Update: `docs/delivery-evidence/unified-chat/2026-08-01-agent-judgment-learning-release.md`

- [ ] **Step 1: Run focused app and Edge Function suites**

```bash
npm test -- --runInBand \
  src/features/unifiedChat/agentJudgment.test.ts \
  src/features/unifiedChat/agentJudgmentPrompt.test.ts \
  src/features/unifiedChat/requestAgentJudgment.test.ts \
  src/features/unifiedChat/turnPlanningPhase.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.test.ts \
  src/features/unifiedChat/runUnifiedChatTurn.appControl.test.ts \
  src/features/unifiedChat/unifiedChatTelemetry.test.ts \
  src/features/unifiedChat/agentJudgmentEvalCases.test.ts

deno test \
  supabase/functions/_shared/__tests__/aiModelRouting.test.ts \
  supabase/functions/_shared/__tests__/aiRequestValidation.test.ts
```

Expected: all focused suites pass without new React `act(...)` warnings.

- [ ] **Step 2: Run Kwilt's completion ritual**

```bash
npm run verify:changed -- --run
```

Expected: diff-derived typechecks, test typecheck, related Jest, product lint, architecture lint, Supabase function lint, and diff checks pass. Report broader unrelated failures separately.

- [ ] **Step 3: Run the live redacted Luna evaluation**

```bash
KWILT_RUN_LIVE_AGENT_JUDGMENT_EVALS=1 npm test -- --runInBand src/features/unifiedChat/agentJudgmentEvalCases.test.ts
```

Expected: all release thresholds in Task 8 pass. If they do not, revise the prompt or Luna reasoning effort based on clustered failures; do not silently route routine judgment to a more expensive model.

- [ ] **Step 4: Deploy only the authorized backend slice**

Deploy the changed `ai-chat` Edge Function using the repository's established Supabase project and release procedure after explicit release authorization. Record the deployed function version and model route. Do not deploy unrelated pending migrations or functions.

- [ ] **Step 5: Prove the six product-contract scenarios in a signed simulator build**

Verify the six requests at the top of this plan from fresh threads and relevant follow-ups. For every mutation, open the native owning surface and confirm the exact title, date, recurrence, reminder, or Plan placement. Reload the app and confirm durable thread, proposal, and receipt state.

- [ ] **Step 6: Repeat the date, retry, and multi-tool cases on a physical iPhone**

Exercise text, voice, background/foreground, provider timeout, Retry, and exact native return. Keep signed simulator, physical-device, TestFlight processing, and installed TestFlight proof as separate evidence lines.

- [ ] **Step 7: Finalize evidence and commit**

```bash
git add docs/delivery-evidence/unified-chat/2026-08-01-agent-judgment-learning-release.md docs/delivery-evidence/unified-chat.yml
git commit -m "docs: record agent judgment runtime proof"
```

## Deferred until the learning release proves the need

- Automatic escalation from Luna to Terra based only on low confidence.
- Persisting raw judgment prompts, tool arguments, or model reasoning.
- A user-visible plan editor inside Chat.
- Programmatic Tool Calling for ordinary adaptive tool use.
- Multi-agent orchestration.
- Replacing capability-owned proposal, approval, receipt, or undo behavior.
- Removing the semantic-router fallback before the signed learning release is stable.

## Self-review

- **Spec coverage:** The plan covers job interpretation, desired outcome, tool selection, single-versus-multi-step planning, Luna model routing, bounded execution, date preservation, failure fallback, telemetry, evaluation, documentation, and signed runtime proof.
- **Scope:** This is one Unified Chat orchestration subsystem. It does not redesign capability tools, add new product capabilities, or change the user's selected visible response model.
- **Type consistency:** `AgentJudgment`, `AgentJudgmentStep`, `PlannedUnifiedChatTurn`, `AgentToolDefinition`, and existing Unified Chat request/capability ids keep one named contract throughout the plan.
- **TDD posture:** Prompt builders, parsers, routing, tool orchestration, Edge Function validation, telemetry transforms, and regression fixes are all test-first under Kwilt's required posture.
- **Privacy:** No raw prompt, private record id, normalized constraint value, tool argument, or model reason enters analytics.
- **Release honesty:** Local tests, live-model evals, signed simulator, physical device, deployed Edge Function, TestFlight processing, and installed TestFlight behavior remain distinct gates.
