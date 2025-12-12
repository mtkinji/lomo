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
// - The runtime does not currently read this file directly. Instead, the active
//   FTUE implementation in `firstTimeOnboardingWorkflow.ts` and
//   `IdentityAspirationFlow.tsx` mirrors this spec. Keep this spec as the
//   product-facing source of truth, and update the runtime definitions to match
//   when making significant changes.
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
       * NOTE: The runtime presenter (`IdentityAspirationFlow`) uses these as
       * high-signal anchors, and may infer additional nuance to keep the
       * first-time onboarding under ~3 minutes.
       */
      domain: 'string',
      motivation: 'string',
      signatureTrait: 'string',
      growthEdge: 'string',
      proudMoment: 'string',
      meaning: 'string',
      impact: 'string',
      values: 'string',
      philosophy: 'string',
      vocation: 'string',
      bigDream: 'string',
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
      label: 'Domain of becoming',
      collects: ['domain'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking which life domain this identity Arc is about (e.g., craft, family, health, learning, creativity, relationships, spirit). Treat the selection as the user’s “domain of becoming”.',
      copyLength: 'one_sentence',
      validationHint:
        'domain should be one of the predefined options. It is a life arena, not a task list.',
      next: 'social_mirror',
      ui: {
        title: 'Choose a direction',
        description: 'What area of life does your future self most want to grow into right now?',
      },
    },
    {
      id: 'social_mirror',
      kind: 'form',
      label: 'Motivational style',
      collects: ['motivation'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card that captures the user’s motivational posture (e.g., calm/steady, bold/energetic, relational, mastery-driven). Treat the selection as the user’s motivational style.',
      copyLength: 'one_sentence',
      validationHint:
        'motivation is a short phrase capturing their motivational posture. It should feel intuitive, not clinical.',
      next: 'core_strength',
      ui: {
        title: 'How do you want it to feel?',
      },
    },
    {
      id: 'core_strength',
      kind: 'form',
      label: 'Signature trait',
      collects: ['signatureTrait'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking for the user’s signature trait (a strength they want to embody). Treat the selection as “signatureTrait”.',
      copyLength: 'one_sentence',
      validationHint:
        'signatureTrait should be a short phrase describing a strength they want to embody (e.g. “disciplined”, “creative”, “reliable”).',
      next: 'growth_edge',
      ui: {
        title: 'What strength do you grow into?',
      },
    },
    {
      id: 'growth_edge',
      kind: 'form',
      label: 'Growth edge',
      collects: ['growthEdge'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking for the user’s growth edge (a pattern they want to outgrow or a skill they want to develop). Treat the selection as “growthEdge”.',
      copyLength: 'one_sentence',
      validationHint:
        'growthEdge should be a short phrase describing a growth edge (e.g. “procrastination”, “staying calm”, “follow-through”).',
      next: 'everyday_moment',
      ui: {
        title: 'What do you outgrow?',
      },
    },
    {
      id: 'everyday_moment',
      kind: 'form',
      label: 'Everyday proud moment',
      collects: ['proudMoment'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking what the user does on a normal day that makes them feel proud. Treat this as an “everyday proud moment” identity-in-action cue.',
      copyLength: 'short_paragraph',
      validationHint:
        'proudMoment should describe identity in action on a normal day (effort, service, creativity, mastery, steadiness).',
      next: 'nickname_optional',
      ui: {
        title: 'On a normal day…',
        description:
          'Picture future-you on a normal day — not a big moment. What are they doing that makes them feel proud?',
      },
    },
    {
      id: 'meaning',
      kind: 'form',
      label: 'Source of meaning',
      collects: ['meaning'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking what makes life feel meaningful. Capture the selection as “meaning”.',
      copyLength: 'one_sentence',
      validationHint:
        'meaning is a short phrase describing where meaning comes from (craft, relationships, faith, service, creation, etc.).',
      next: 'impact',
      ui: {
        title: 'What feels meaningful?',
      },
    },
    {
      id: 'impact',
      kind: 'form',
      label: 'Desired impact',
      collects: ['impact'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking how the user hopes their life impacts other people. Capture the selection as “impact”.',
      copyLength: 'one_sentence',
      validationHint: 'impact is a short phrase describing hoped-for impact on others.',
      next: 'values',
      ui: {
        title: 'What impact do you hope to have?',
      },
    },
    {
      id: 'values',
      kind: 'form',
      label: 'Core value',
      collects: ['values'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking which value feels most core. Capture the selection as “values”.',
      copyLength: 'one_sentence',
      validationHint: 'values is a single selected value token that anchors the Arc.',
      next: 'philosophy',
      ui: {
        title: 'What value is most core?',
      },
    },
    {
      id: 'philosophy',
      kind: 'form',
      label: 'Life philosophy',
      collects: ['philosophy'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking what overall approach the user wants to take through life. Capture the selection as “philosophy”.',
      copyLength: 'one_sentence',
      validationHint: 'philosophy is a short phrase describing life approach (gentle, disciplined, courageous, etc.).',
      next: 'vocation',
      ui: {
        title: 'What’s your approach?',
      },
    },
    {
      id: 'vocation',
      kind: 'form',
      label: 'Vocation / creation lane',
      collects: ['vocation'],
      hideFreeformChatInput: true,
      prompt:
        'The host shows a tap-only card asking which kind of work/creation is closest to the user’s future self. Capture the selection as “vocation”.',
      copyLength: 'one_sentence',
      validationHint:
        'vocation is a short phrase describing a vocational/creative lane (craft, ventures, teaching, ideas, etc.).',
      next: 'big_dream',
      ui: {
        title: 'What kind of work or creation?',
      },
    },
    {
      id: 'big_dream',
      kind: 'form',
      label: 'Big dream (free response)',
      collects: ['bigDream'],
      hideFreeformChatInput: true,
      prompt:
        'The host will ask for one short free-response “big dream” the user would love to bring to life. Capture it as “bigDream”.',
      copyLength: 'one_sentence',
      validationHint: 'bigDream is a short free-response sentence or phrase. It should not be empty.',
      next: 'nickname_optional',
      ui: {
        title: 'One big dream',
        description: 'Looking ahead, what’s one big thing you’d love to bring to life?',
        fields: [
          {
            id: 'bigDream',
            label: 'Big dream',
            type: 'textarea',
            placeholder: 'e.g., Build a small timber-frame home',
          },
        ],
        primaryActionLabel: 'Continue',
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
        'Using the collected inputs — vibe, socialPresence, coreStrength, everydayAction, optional nickname, and any age/profile context the host has already provided in hidden system messages — generate an identity Arc with exactly 3 sentences plus a single gentle "next small step".\n\nQUALITY EXAMPLES (study these for tone and depth):\n\nExample 1 - Craft & Contribution:\nName: "🧠 Craft & Contribution"\nNarrative: "I want to become a product builder whose work is marked by clarity, compassion, and craftsmanship. This Arc is about developing the ability to see complexity clearly, to name problems honestly, and to build solutions that genuinely help people. It\'s the pursuit of excellence—not for ego, but because thoughtful work is a form of service."\n\nExample 2 - Making & Embodied Creativity:\nName: "🪚 Making & Embodied Creativity"\nNarrative: "I want to stay connected to the physical world through the work of my hands—building, shaping, repairing, and creating things that are tangible and lasting. Making reminds me that growth isn\'t only intellectual. It\'s slow, physical, patient, and grounded. It teaches me presence. It teaches me to notice details. It teaches me to treat materials with respect."\n\nExample 3 - Venture / Entrepreneurship:\nName: "🚀 Venture / Entrepreneurship"\nNarrative: "I want to build ventures that are principled, thoughtful, and genuinely helpful. Entrepreneurship is not about speed or hype for me—it\'s about stewarding ideas that could make people\'s lives more coherent, more peaceful, or more empowered. This Arc represents my desire to take responsibility for my creativity and see it through to real-world impact."\n\nKey qualities to match: specific concrete language, clear "I want" statements, natural flow, grounded in real scenes, reflects genuine identity direction.\n\nRespond ONLY with a JSON object in this shape (no extra commentary):\n{\n  "arcName": string, // 1–3 words (emoji prefix allowed), describing an identity direction or arena, stable over time, reflecting the user\'s inputs. Use patterns like Domain+Posture, Value+Domain, Two-noun frame, or canonical templates.\n  "aspirationSentence": string, // exactly 3 sentences in one paragraph, 40–120 words, FIRST sentence must start with "I want…", use plain grounded language suitable for ages 14–50+, avoid guru-speak/cosmic language/therapy language/prescriptive "shoulds". Sentence 1 expresses identity direction, Sentence 2 explains why it matters now, Sentence 3 gives one concrete ordinary-life scene. CRITICAL: All sentences must be grammatically complete and natural-sounding. Transform user inputs into proper prose rather than inserting raw phrases verbatim. Extract core concepts from user dreams/inputs and express them naturally.\n  "nextSmallStep": string // one sentence starting with "Your next small step: …"\n}\n\nThe Arc should focus on character, energy, and trajectory (who they want to become), not achievements or metrics. The nextSmallStep must be concrete but low-pressure (e.g., "Practice what matters for just 5 minutes.").',
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
        'Using the synthesized aspiration fields (arcName, arcNarrative / aspirationSentence, nextSmallStep), briefly introduce the reveal in 1–2 short sentences. The host will handle the actual card that shows the Arc; you do not need to restate the full aspiration inside chat unless explicitly asked.',
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


