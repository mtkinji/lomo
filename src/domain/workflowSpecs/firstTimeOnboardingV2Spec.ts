// High-level, business-friendly spec for the first-time onboarding v2 workflow.
//
// IMPORTANT: This file is the **source of truth** for the v2 onboarding flow.
// - Product / business folks should primarily edit THIS file:
//   - Add / remove / reorder steps in the `steps` array.
//   - Tighten the per-step `prompt` text to control what the agent says.
//   - Adjust simple UI details for form steps (field labels, placeholders).
// - The runtime never reads this directly. Instead, `src/domain/workflows.ts`
//   compiles this spec into a `WorkflowDefinition` that AgentWorkspace +
//   OnboardingGuidedFlow consume.
//
// When creating a NEW workflow in the future:
// 1. Create a new file next to this one, e.g.
//      `workflowSpecs/myNewWorkflowSpec.ts`
//    exporting a `WorkflowSpec` with an `id`, `outcomeSchema`, and `steps`.
// 2. In `src/domain/workflows.ts`, import your spec and add a small compiler
//    (similar to `compileFirstTimeOnboardingV2Spec`) that maps StepSpec → WorkflowStep.
// 3. Register the compiled `WorkflowDefinition` in `WORKFLOW_DEFINITIONS`.
// 4. Point the relevant host UI (e.g. AgentWorkspace caller) at your workflow ID.

export type StepKind =
  | 'assistant_copy_only' // pure coaching copy, no form
  | 'form' // card with inputs, host collects fields
  | 'agent_generate' // model drafts something for the host to render
  | 'confirm'; // lightweight confirmation / recap

export type FormFieldType = 'text' | 'number' | 'textarea';

export type FormFieldSpec = {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
};

export type StepSpec = {
  id: string;
  kind: StepKind;
  label: string;
  /**
   * Very short instruction for what the assistant should say for this step.
   * Keep this to 1–2 sentences wherever possible.
   */
  prompt: string;
  /**
   * Optional rendering mode. When omitted or set to 'llm', the runtime will
   * call the coach LLM with this step’s prompt. When set to 'static', the
   * runtime will render `staticCopy` directly as the assistant message and
   * skip the LLM entirely.
   */
  renderMode?: 'llm' | 'static';
  /**
   * Exact assistant copy to display when `renderMode` is 'static'. This is
   * useful for fixed welcome lines, short confirmations, or legal copy where
   * you want full control over the wording.
   */
  staticCopy?: string;
  /**
   * Optional hint for how long the assistant’s visible reply should be.
   * This is compiled into the underlying prompt so you don’t have to repeat
   * “one short sentence” / “1–2 sentences” everywhere in `prompt`.
   */
  copyLength?: 'one_sentence' | 'two_sentences' | 'short_paragraph';
  /**
   * IDs of fields this step is responsible for collecting or populating.
   * These map to keys in the outcome schema.
   */
  collects?: string[];
  /**
   * Optional validation hint for this step. This is folded into prompts but
   * does not directly run code.
   */
  validationHint?: string;
  /**
   * Next step to transition to when this step completes.
   */
  next?: string;
  /**
   * Optional UI schema for form-style steps. This controls how the card
   * renders (titles, fields) but does not affect the workflow graph.
   */
  ui?: {
    title?: string;
    description?: string;
    fields?: FormFieldSpec[];
    /**
     * Optional label for the primary action button when this step is rendered
     * as a form card.
     */
    primaryActionLabel?: string;
  };
  /**
   * Optional hint for host chat surfaces about whether the generic free-form
   * chat composer ("Ask anything") should be visible while this step is
   * active. When true, presenters like `AiChatPane` can hide the bottom input
   * so the user focuses on the structured card for this step.
   */
  hideFreeformChatInput?: boolean;
};

export type WorkflowSpec = {
  id: string;
  label: string;
  version: number;
  chatMode: 'firstTimeOnboarding';
  /**
   * Very lightweight outcome schema so we can see at a glance what the flow
   * is trying to produce.
   */
  outcomeSchema: {
    kind: string;
    fields: Record<string, unknown>;
  };
  steps: StepSpec[];
};

export const FIRST_TIME_ONBOARDING_V2_SPEC: WorkflowSpec = {
  id: 'first_time_onboarding_v2',
  label: 'First-time onboarding (v2 – goal, arc, activities)',
  version: 2,
  chatMode: 'firstTimeOnboarding',
  outcomeSchema: {
    kind: 'first_time_onboarding_v2',
    fields: {
      name: 'string',
      age: 'number',
      desireSummary: 'string',
      goal: {
        title: 'string',
        why: 'string',
        timeHorizon: 'string',
      },
      arc: {
        name: 'string',
        description: 'string',
      },
      activities: 'array[activity]',
      avatarUrl: 'string?',
      notifications: 'enum[enabled,disabled]',
    },
  },
  steps: [
    {
      id: 'welcome_orientation',
      kind: 'assistant_copy_only',
      label: 'Welcome & priming',
      prompt:
        'In 1–2 short sentences, welcome the user to TAKADO, describe it as a place to bring clarity to their life one goal, one step, one chapter at a time, and explain that you will guide them through a short setup so they can begin with confidence.',
      renderMode: 'static',
      staticCopy:
        '👋 Welcome to Takado.\n\nThis is where you turn vague ideas and “one day” goals into clear, doable steps for your real life.\n\nI’ll walk with you through a quick setup so you can start moving on what matters. 🌿',
      copyLength: 'short_paragraph',
      validationHint:
        'No fields collected; keep the message short, warm, and specific about what will happen.',
      next: 'identity_intro',
    },
    {
      id: 'identity_intro',
      kind: 'assistant_copy_only',
      label: 'Invite name and age',
      prompt:
        'Ask the user, in one short sentence, “What should I call you?” and briefly note that you will also use their age to tune tone and examples. Keep the copy warm and concise.',
      copyLength: 'two_sentences',
      validationHint:
        'No structured fields here; simply orient the user and invite them to share their preferred name and age.',
      next: 'identity_basic',
    },
    {
      id: 'identity_basic',
      kind: 'form',
      label: 'Basic identity',
      collects: ['name', 'age'],
      hideFreeformChatInput: true,
      prompt:
        'After the user has seen the identity_intro message and shared their name and age via the card, acknowledge them warmly in one short sentence (for example, “Good to meet you, {{name}}.”) and note that you’ll use what they shared to tune tone and examples. Do not ask any new questions.',
      copyLength: 'one_sentence',
      validationHint:
        'Name should be non-empty. Age should be a reasonable integer; if unclear, ask once for clarification and then move on.',
      next: 'desire_invite',
      ui: {
        title: 'Basic identity',
        fields: [
          {
            id: 'name',
            label: 'Preferred name',
            type: 'text',
            placeholder: 'e.g., Maya or MJ',
          },
          {
            id: 'age',
            label: 'Age',
            type: 'number',
            placeholder: 'How old are you?',
          },
        ],
      },
    },
    {
      id: 'desire_invite',
      kind: 'form',
      label: 'Invite a desire',
      collects: ['desireSummary'],
      hideFreeformChatInput: true,
      prompt:
        'Ask the user, in 1–2 short sentences, to share one thing they would like to make progress on right now. Emphasize that anything that matters to them is valid and low-pressure, and then point them to the box below to type it in.',
      copyLength: 'short_paragraph',
      validationHint:
        'Expect a short free-text summary. If the user is unsure, offer 2–3 example categories like “health”, “creative work”, or “relationships”.',
      next: 'desire_clarify',
      ui: {
        title: 'What would you like to move forward?',
        fields: [
          {
            id: 'desireSummary',
            label: 'In your own words',
            type: 'textarea',
            placeholder: 'Describe one thing you’d like to make progress on.',
          },
        ],
      },
    },
    {
      id: 'desire_clarify',
      kind: 'assistant_copy_only',
      label: 'Clarify intention',
      collects: ['desireClarified'],
      prompt:
        'Read the desireSummary and ask ONE targeted clarifying question in a single sentence that helps you understand what matters most (for example, “What part of that feels most important right now?”). Record a short clarified phrase as desireClarified.',
      copyLength: 'one_sentence',
      validationHint:
        'Only one follow-up question. Capture a short clarified summary or key phrase that will feed the goal draft.',
      next: 'goal_draft',
    },
    {
      id: 'goal_draft',
      kind: 'agent_generate',
      label: 'Draft goal formation',
      collects: ['goal'],
      prompt:
        'Synthesize a simple, concrete draft goal from the user’s desire and clarified intention. Produce a title, a short “why it matters”, and a rough 30–90 day time horizon.',
      copyLength: 'short_paragraph',
      validationHint:
        'Goal should feel doable within ~30–90 days, specific but not overwhelming. Use the user’s own language where possible.',
      next: 'goal_confirm',
    },
    {
      id: 'goal_confirm',
      kind: 'assistant_copy_only',
      label: 'Goal confirmation',
      collects: ['goalConfirmed'],
      prompt:
        'In one short sentence, acknowledge the saved goal and confirm that you will use this as their first goal.',
      copyLength: 'one_sentence',
      validationHint:
        'No additional data; just confirm and reflect the goal back in natural language.',
      next: 'arc_introduce',
    },
    {
      id: 'arc_introduce',
      kind: 'assistant_copy_only',
      label: 'Introduce Arcs',
      prompt:
        'In 1–2 short sentences, explain that every goal in TAKADO lives inside an Arc—the broader chapter of life it belongs to—and that you are going to find the right chapter for this goal.',
      copyLength: 'two_sentences',
      validationHint:
        'No fields; keep it short and avoid jargon. Make Arcs feel like a natural container, not a technical concept.',
      next: 'arc_identity_primary',
    },
    {
      id: 'arc_identity_primary',
      kind: 'assistant_copy_only',
      label: 'Arc identity prompt',
      collects: ['arcIdentityRaw'],
      prompt:
        'Ask the user, in one clear question, “When you imagine the version of yourself who reaches this goal, what kind of person are they becoming?” Capture their free-form answer as arcIdentityRaw.',
      copyLength: 'one_sentence',
      validationHint:
        'Answer may be short; do not force depth. This is raw material for the Arc name and description.',
      next: 'arc_identity_clarify',
    },
    {
      id: 'arc_identity_clarify',
      kind: 'assistant_copy_only',
      label: 'Arc clarifying prompt',
      collects: ['arcIdentityClarified'],
      prompt:
        'Based on arcIdentityRaw, ask ONE short follow-up question about what feels most important in that identity shift (for example, “What about that feels most important to you?”). Record a short clarified phrase as arcIdentityClarified.',
      copyLength: 'one_sentence',
      validationHint:
        'Single follow-up only. Capture a short clarified phrase or bullet that highlights the core value or direction.',
      next: 'arc_draft',
    },
    {
      id: 'arc_draft',
      kind: 'agent_generate',
      label: 'Draft Arc formation',
      collects: ['arc'],
      prompt:
        'Propose an identity-based Arc that the goal fits inside. Provide an Arc name, a one-sentence description, and a very brief explanation tying the Arc to the current goal.',
      copyLength: 'short_paragraph',
      validationHint:
        'Arc name should be identity-oriented and durable (a chapter), not a task. Description should be one grounded sentence.',
      next: 'arc_confirm',
    },
    {
      id: 'arc_confirm',
      kind: 'assistant_copy_only',
      label: 'Arc confirmation',
      collects: ['arcConfirmed'],
      prompt:
        'In one short sentence, acknowledge the chosen Arc and confirm that this will be the chapter guiding their direction.',
      copyLength: 'one_sentence',
      validationHint:
        'No new structured fields; simply mark that the Arc has been adopted and reflect it back in natural language.',
      next: 'activities_generate',
    },
    {
      id: 'activities_generate',
      kind: 'agent_generate',
      label: 'Generate starter activities',
      collects: ['activities'],
      prompt:
        'Given the confirmed goal and Arc, list 2–4 small, clear starter Activities as specific, doable next steps (for example, “Take a 10-minute walk today”).',
      copyLength: 'short_paragraph',
      validationHint:
        'Activities should feel like next steps, not projects. Avoid overloading the user; keep the list short.',
      next: 'activities_confirm',
    },
    {
      id: 'activities_confirm',
      kind: 'assistant_copy_only',
      label: 'Activities confirmation',
      collects: ['activitiesSelection'],
      prompt:
        'In 1–2 short sentences, acknowledge whichever Activities the user chose to add (or that they skipped) and summarize that these steps are now part of their plan.',
      copyLength: 'two_sentences',
      validationHint:
        'No new structured activities here; just record which ones the user adopted so the client can persist them.',
      next: 'profile_avatar',
    },
    {
      id: 'profile_avatar',
      kind: 'form',
      label: 'Profile personalization',
      collects: ['avatarUrl'],
      prompt:
        'Ask, in 1–2 short sentences, whether the user would like to add a photo or avatar now, and make it clear that skipping is completely fine.',
      copyLength: 'two_sentences',
      validationHint:
        'avatarUrl may be null. Do not pressure the user; this is optional seasoning, not a requirement.',
      next: 'notifications_v2',
      ui: {
        title: 'Profile image (optional)',
        // Specific picker behavior is still implemented in the presenter;
        // this just documents intent.
      },
    },
    {
      id: 'notifications_v2',
      kind: 'form',
      label: 'Notifications setup',
      collects: ['notifications'],
      prompt:
        'Ask the user, in one short question, whether to turn on gentle notifications for steps and Arc attention, offering a clear choice between enabling them or “Not now”.',
      copyLength: 'one_sentence',
      validationHint:
        'notifications should be enabled or disabled. Respect the user’s choice without pushing.',
      next: 'closing_v2',
      ui: {
        title: 'Notifications',
      },
    },
    {
      id: 'closing_v2',
      kind: 'assistant_copy_only',
      label: 'Closing (goal, arc, activities)',
      prompt:
        'In 2–3 short sentences, congratulate the user by name, briefly recap that they now have an Arc, a goal, and a few concrete next steps, and remind them they can ask what to do next at any time.',
      copyLength: 'short_paragraph',
      validationHint:
        'No new fields; keep it concise, encouraging, and grounded. Avoid hype.',
    },
  ],
};


