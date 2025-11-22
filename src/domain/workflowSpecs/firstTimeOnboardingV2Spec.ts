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
  label: 'First-time onboarding (v2 – first goal)',
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
      avatarUrl: 'string?',
    },
  },
  steps: [
    {
      id: 'welcome_orientation',
      kind: 'assistant_copy_only',
      label: 'Welcome & priming',
      prompt:
        'In 1 short sentence, welcome the user to TAKADO, describe it as a place to bring clarity to their life one goal, one step, one chapter at a time, and explain that you will guide them through a short setup so they can begin with confidence.',
      renderMode: 'static',
      staticCopy:
        '👋 Welcome to Takado.\n\nThis is where you turn vague ideas and "some day” goals into clear, doable steps for your real life.\n\nI’ll walk with you through a quick setup so you can start moving on what matters.',
      copyLength: 'one_sentence',
      validationHint:
        'No fields collected; keep the message short, warm, and specific about what will happen.',
      next: 'identity_intro',
    },
    {
      id: 'identity_intro',
      kind: 'assistant_copy_only',
      label: 'Invite name and age',
      prompt:
        'Ask the user, in one short sentence, “What should I call you and how old are you?” and briefly note that you will also use their age to tune tone and examples. Keep the copy warm and concise.',
      copyLength: 'one_sentence',
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
      renderMode: 'static',
      staticCopy:
        'Thanks for sharing that. Now, I’d love to hear about one thing you’d like to make progress on right now. It can be anything that matters to you—big or small—there’s no pressure.',
      copyLength: 'two_sentences',
      validationHint:
        'Expect a short free-text summary. If the user is unsure, offer 2–3 example categories like “health”, “creative work”, or “relationships”.',
      next: 'goal_draft',
      ui: {
        fields: [
          {
            id: 'desireSummary',
            label: '',
            type: 'textarea',
            placeholder: 'Describe one thing you’d like to make progress on.',
          },
        ],
      },
    },
    {
      id: 'goal_draft',
      kind: 'agent_generate',
      label: 'Draft goal formation',
      collects: ['goal'],
      prompt:
        'You are helping a new TAKADO user turn a single desire into a simple, realistic goal.\n\n' +
        'Context you have about the user:\n' +
        '- Name: {{name}}\n' +
        '- Age: {{age}}\n' +
        '- What they said they want to make progress on: {{desireSummary}}\n\n' +
        'Using only this context, synthesize ONE short-term goal that feels achievable in roughly 30–90 days.\n' +
        '- The goal **title** should be specific but not overwhelming (one short phrase).\n' +
        '- The **why** should be one short sentence that reflects why this matters to them, using their own language where possible.\n' +
        '- The **timeHorizon** should be a natural-language range like "next 30 days", "next 6–8 weeks", or "next 3 months".\n\n' +
        'Respond ONLY with a JSON object with the following shape, and no extra commentary:\n' +
        '{\n' +
        '  "title": string,\n' +
        '  "why": string,\n' +
        '  "timeHorizon": string\n' +
        '}',
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
        'In 1–2 short sentences, briefly acknowledge the saved goal, note that Takado will use it as their first goal, and remind them they can edit or change it anytime from the Goals view.',
      renderMode: 'static',
      staticCopy:
        'Great—let’s use this as your first goal in Takado. You can always rename it, tweak the wording, or change it from the Goals view once you’re in the app.',
      copyLength: 'short_paragraph',
      validationHint:
        'No additional data; just confirm and reflect the goal back in natural language.',
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
      next: 'closing_v2',
      ui: {
        title: 'Profile image (optional)',
        // Specific picker behavior is still implemented in the presenter;
        // this just documents intent.
      },
    },
    {
      id: 'closing_v2',
      kind: 'assistant_copy_only',
      label: 'Closing',
      prompt:
        'In 2–3 short sentences, congratulate the user by name, briefly recap that they now have a clear first goal saved in Takado, and remind them they can ask what to do next at any time.',
      copyLength: 'short_paragraph',
      validationHint:
        'No new fields; keep it concise, encouraging, and grounded. Avoid hype.',
    },
  ],
};


