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
  };
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
        'Briefly welcome the user to TAKADO and explain in one short paragraph that this is a guided setup to clarify one goal, the Arc it lives inside, and a few simple starting steps.',
      validationHint:
        'No fields collected; keep the message short, warm, and specific about what will happen.',
      next: 'identity_basic',
    },
    {
      id: 'identity_basic',
      kind: 'form',
      label: 'Basic identity',
      collects: ['name', 'age'],
      prompt:
        'In one or two short sentences, explain that you’ll start by learning how to address the user and roughly how old they are. Then invite them to fill in the fields below without re-asking questions in the text.',
      validationHint:
        'Name should be non-empty. Age should be a reasonable integer; if unclear, ask once for clarification and then move on.',
      next: 'desire_invite',
      ui: {
        title: 'Basic identity',
        description: "Let’s start with the basics so I know how to address you.",
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
      prompt:
        'Invite the user to share one thing they would like to make progress on right now. Keep it low-pressure and concrete. End by pointing to the text box below where they can type it in.',
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
        'Read the desireSummary and ask ONE targeted clarifying question that helps you understand what matters most. Examples: “What part of that feels most important right now?” or “Is this more about developing a habit, learning something, or making a specific change?” Record a short clarified phrase as desireClarified.',
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
        'Synthesize a simple, concrete goal from the user’s desire and clarified intention. Produce a title, a short “why it matters”, and a rough time horizon (30–90 days).',
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
        'Once the user accepts or edits the goal in the UI, briefly acknowledge it and confirm you will use this as their first goal.',
      validationHint:
        'No additional data; just confirm and reflect the goal back in natural language.',
      next: 'arc_introduce',
    },
    {
      id: 'arc_introduce',
      kind: 'assistant_copy_only',
      label: 'Introduce Arcs',
      prompt:
        'Explain briefly that every goal in TAKADO lives inside an Arc, the broader chapter of life it belongs to. Set up the next identity-oriented questions.',
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
        'Ask: “When you imagine the version of yourself who reaches this goal, what kind of person are they becoming?” Capture their free-form answer as arcIdentityRaw.',
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
        'Based on arcIdentityRaw, ask ONE follow-up question about what feels most important in that identity shift. Example: “What about that feels most important to you?” Record a short clarified phrase as arcIdentityClarified.',
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
        'Propose an identity-based Arc that the goal fits inside. Produce an Arc name, a one-sentence description, and a short explanation tying the Arc to the current goal.',
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
        'Once the user accepts or edits the Arc in the UI, briefly acknowledge it and confirm this will be the chapter guiding their direction.',
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
        'Given the confirmed goal and Arc, propose 2–4 small, clear starter Activities that build early momentum. Each should be concrete and doable (e.g., “Take a 10-minute walk today”).',
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
        'Acknowledge whichever Activities the user chose to add (or that they skipped for now), and briefly summarize that these are now part of their plan.',
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
        'Offer the option to add a photo or avatar before they begin, and gracefully accept skips.',
      validationHint:
        'avatarUrl may be null. Do not pressure the user; this is optional seasoning, not a requirement.',
      next: 'notifications_v2',
      ui: {
        title: 'Profile image (optional)',
        description: 'You can add a photo or avatar now, or skip and do it later.',
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
        'Offer a simple choice to turn on gentle notifications for steps and Arc attention, or “Not now”.',
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
        'Congratulate the user by name, briefly recap that they now have an Arc, a goal, and a few concrete next steps, and remind them they can ask what to do next at any time.',
      validationHint:
        'No new fields; keep it concise, encouraging, and grounded. Avoid hype.',
    },
  ],
};


