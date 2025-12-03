// High-level, business-friendly spec for the first-time onboarding v2 workflow.
//
// For the identity-first Arc model and the tap-only FTUE question set that this
// workflow should implement, see `docs/arc-aspiration-ftue.md`. That doc
// defines the gold-standard 5-factor model (domain of becoming, motivational
// style, signature trait, growth edge, everyday proud moment) and how to
// synthesize `Arc.name` and `Arc.narrative` from those answers.
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
  label: 'First-time onboarding (v2 – identity Arc / aspiration)',
  version: 2,
  chatMode: 'firstTimeOnboarding',
  outcomeSchema: {
    kind: 'first_time_onboarding_v2_arc',
    fields: {
      /**
       * Lightweight identity inputs collected through tap-first cards.
       * These are intentionally high-level; the synthesis step is responsible
       * for mapping them into a concrete Arc (aspiration) record.
       */
      vibe: 'string',
      socialPresence: 'string',
      coreStrength: 'string',
      everydayAction: 'string',
      nickname: 'string?',
      /**
       * Synthesized identity Arc fields. The host maps these directly into
       * an `Arc` object using `Arc.name` and `Arc.narrative` with no extra
       * "aspiration" field on the Arc type.
       */
      arcName: 'string',
      arcNarrative: 'string',
      nextSmallStep: 'string',
      /**
       * Whether the user explicitly confirmed that the synthesized Arc feels
       * like "future them". This is useful for analytics and future tuning
       * but does not affect Arc creation semantics.
       */
      confirmed: 'boolean',
    },
  },
  steps: [
    {
      id: 'soft_start',
      kind: 'assistant_copy_only',
      label: 'Soft start',
      prompt:
        'Welcome the user with one gentle line about uncovering the version of them that feels most themselves. Do not ask any questions or mention steps – just set a curious, low-pressure tone.',
      renderMode: 'static',
      staticCopy:
        'Let’s uncover the version of you that feels the most you.',
      copyLength: 'one_sentence',
      validationHint:
        'No fields collected; keep the message short, warm, and free of instructions or pressure.',
      hideFreeformChatInput: true,
      next: 'vibe_select',
    },
    {
      kind: 'form',
      id: 'vibe_select',
      label: 'Future self vibe',
      collects: ['vibe'],
      hideFreeformChatInput: true,
      prompt:
        'The host will show a card that asks: “When you imagine your future self… what’s the vibe they give off?” with 6–8 single-tap options like calm, confident, kind, curious, strong, creative, focused. Once the user taps one, you do not need to say anything unless explicitly asked later; treat this as a silent capture of their dominant emotional signature.',
      copyLength: 'one_sentence',
      validationHint:
        'vibe should be one of the predefined options. It is a soft emotional anchor, not a clinical label.',
      next: 'social_mirror',
      ui: {
        title: 'When you imagine your future self…',
        description: 'What’s the vibe they give off?',
      },
    },
    {
      id: 'social_mirror',
      kind: 'form',
      label: 'Social mirror',
      collects: ['socialPresence'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a card asking: “And how do people experience that future you?” with tap-only options like “someone people trust”, “someone who keeps their cool”, “someone who brings others together”, “someone who works hard”, “someone who surprises people”, “someone others want around”. You do not need to ask follow-up questions here; simply let the host store this as the social identity orientation.',
      copyLength: 'one_sentence',
      validationHint:
        'socialPresence is a short phrase describing how others experience the hoped-for self. It should feel intuitive and relational, not clinical.',
      next: 'core_strength',
      ui: {
        title: 'And how do people experience that future you?',
      },
    },
    {
      id: 'core_strength',
      kind: 'form',
      label: 'Core strength',
      collects: ['coreStrength'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a card asking: “What kind of strength does future-you grow into?” with options like physical skill, thinking skill, creative skill, leadership skill, focus + discipline, supporting others, problem-solving. Capture the selection as a soft pointer toward competence and motivation, not a rigid category.',
      copyLength: 'one_sentence',
      validationHint:
        'coreStrength should be a short noun phrase (e.g. “creative skill”, “leadership skill”) indicating where aspiration energy clusters.',
      next: 'everyday_moment',
      ui: {
        title: 'What kind of strength does future-you grow into?',
      },
    },
    {
      id: 'everyday_moment',
      kind: 'form',
      label: 'Everyday proud moment',
      collects: ['everydayAction'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a card asking: “Picture future-you on a normal day—not a big moment. What are they doing that makes them feel proud?” with tap-only options like practicing a skill, helping someone, creating something, solving a tough problem, showing up consistently, trying something challenging, staying calm, improving. Treat this as a narrative-identity cue about how aspiration shows up in ordinary life.',
      copyLength: 'short_paragraph',
      validationHint:
        'everydayAction should describe identity in action on a normal day (effort, service, creativity, mastery, steadiness).',
      next: 'nickname_optional',
      ui: {
        title: 'On a normal day…',
        description:
          'Picture future-you on a normal day — not a big moment. What are they doing that makes them feel proud?',
      },
    },
    {
      id: 'nickname_optional',
      kind: 'form',
      label: 'One-word identity (optional)',
      collects: ['nickname'],
      hideFreeformChatInput: true,
      prompt:
        'The host will invite the user to optionally type a one- or two-word nickname for their future self (e.g., “The Builder”, “The Quiet Genius”, “The Reliable One”) and also let them skip with a tap. Do not pressure the user to type anything; a skip is a perfectly good outcome.',
      copyLength: 'short_paragraph',
      validationHint:
        'nickname is optional and may be blank. When present, it is a very strong signal of the user’s internal metaphor; when absent, you should still be able to synthesize an aspiration.',
      next: 'aspiration_generate',
      ui: {
        title: 'If future-you had a nickname…',
        description: 'If that future-you had a nickname, what would it be? (Optional)',
        fields: [
          {
            id: 'nickname',
            label: 'Nickname (optional)',
            type: 'text',
            placeholder: 'e.g., The Builder, The Quiet Genius',
          },
        ],
        primaryActionLabel: 'Continue',
      },
    },
    {
      id: 'aspiration_generate',
      kind: 'agent_generate',
      label: 'Synthesize identity aspiration',
      collects: ['arcName', 'arcNarrative', 'nextSmallStep'],
      prompt:
        'Using the collected inputs — vibe, socialPresence, coreStrength, everydayAction, optional nickname, and any age/profile context the host has already provided in hidden system messages — generate a 1–2 sentence identity aspiration plus a single gentle “next small step”.\n\nRespond ONLY with a JSON object in this shape (no extra commentary):\n{\n  "arcName": string, // short, tappable label for the Arc (aspiration)\n  "aspirationSentence": string, // 1–2 sentences starting from the user’s perspective (e.g. “You are becoming someone who…” or equivalent)\n  "nextSmallStep": string // one sentence starting with “Your next small step: …”\n}\n\nThe aspiration should focus on character, energy, and trajectory (who they are becoming), not achievements or metrics. The nextSmallStep must be concrete but low-pressure (e.g., “Practice what matters for just 5 minutes.”).',
      copyLength: 'short_paragraph',
      validationHint:
        'arcName should be short and legible in a list (typically 2–5 words). aspirationSentence should be emotionally resonant but grounded. nextSmallStep must begin with “Your next small step: ” and describe one doable action.',
      next: 'aspiration_reveal',
    },
    {
      id: 'aspiration_reveal',
      kind: 'assistant_copy_only',
      label: 'Reveal identity aspiration',
      collects: [],
      prompt:
        'Using the synthesized aspiration fields (arcName, arcNarrative / aspirationSentence, nextSmallStep), briefly introduce the reveal in 1–2 short sentences. The host will handle the actual card that says “You’re becoming someone who…” and shows the aspiration; you do not need to restate the full aspiration inside chat unless explicitly asked.',
      renderMode: 'static',
      staticCopy:
        'Here’s a first snapshot of the identity you’re growing into, plus one tiny next step to help you live it.',
      copyLength: 'short_paragraph',
      hideFreeformChatInput: true,
      validationHint:
        'No additional data; keep the reveal introduction short and let the host surface the actual aspiration and next step.',
      next: 'aspiration_confirm',
    },
    {
      id: 'aspiration_confirm',
      kind: 'form',
      label: 'Confirmation',
      collects: ['confirmed'],
      prompt:
        'The host asks: “Does this feel like the future you?” with two taps: Yes / Close but tweak it. Do not override that binary choice. Treat a “Yes” as confirmed=true and any other path as confirmed=false.',
      copyLength: 'two_sentences',
      validationHint:
        'confirmed is a boolean reflecting whether the user said the aspiration feels like their future self. The host may still allow a light “tweak” loop before finalizing; the final stored Arc should only represent a version the user said Yes to.',
      next: 'closing_arc',
    },
    {
      id: 'closing_arc',
      kind: 'assistant_copy_only',
      label: 'Closing – Arc adopted',
      prompt:
        'In 2–3 short sentences, congratulate the user, briefly recap that they now have a clear identity Arc saved in kwilt, and remind them they can always refine it or add more Arcs, goals, and activities once they are in the app. Emphasize that this Arc is a starting point, not a life sentence.',
      renderMode: 'static',
      staticCopy:
        'Great—we’ve turned what you shared into a clear identity Arc to start from.\n\n' +
        'This isn’t meant to be a perfect definition of you; it’s a simple storyline you can grow into and refine as you go. As you spend more time in kwilt, you’ll be able to add more Arcs, attach goals and activities, and design concrete plans that actually fit your real life.\n\n' +
        'From here, you can explore your new Arc, add your own goals, or just let this sit at the top of your identity layer while you get used to the app.',
      copyLength: 'short_paragraph',
      validationHint:
        'No new fields; keep it concise, encouraging, and grounded. Avoid hype.',
    },
  ],
};


