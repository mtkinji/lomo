import type { WorkflowDefinition, WorkflowStep } from '../../../domain/workflows';
import { FIRST_TIME_ONBOARDING_PROMPT } from '../systemPrompts';

/**
 * First-Time Onboarding workflow (v2 – identity Arc / aspiration).
 *
 * This workflow guides new users through a tap-first identity discovery flow
 * that synthesizes an initial Arc from structured inputs (vibe, social presence,
 * core strength, everyday proud moment, optional nickname).
 */
export const firstTimeOnboardingWorkflow: WorkflowDefinition = {
  id: 'firstTimeOnboarding', // Matches ChatMode
  label: 'First-time onboarding (v2 – identity Arc / aspiration)',
  version: 2,
  chatMode: 'firstTimeOnboarding',
  systemPrompt: FIRST_TIME_ONBOARDING_PROMPT,
  tools: [],
  autoBootstrapFirstMessage: false,
  renderableComponents: [
    'FormField',
    'ActionButton',
    'InstructionCard',
    'ProgressIndicator',
    'InlineCapability',
  ],
  outcomeSchema: {
    kind: 'first_time_onboarding_v2_arc',
    fields: {
      vibe: 'string',
      socialPresence: 'string',
      coreStrength: 'string',
      everydayAction: 'string',
      nickname: 'string?',
      arcName: 'string',
      arcNarrative: 'string',
      nextSmallStep: 'string',
      confirmed: 'boolean',
    },
  },
  steps: [
    {
      id: 'soft_start',
      type: 'collect_fields',
      label: 'Soft start',
      fieldsCollected: [],
      renderMode: 'static',
      staticCopy: "Let's uncover the version of you that feels the most you.",
      promptTemplate:
        'Welcome the user with one gentle line about uncovering the version of them that feels most themselves. Do not ask any questions or mention steps – just set a curious, low-pressure tone. Keep your visible reply to a single short sentence.',
      validationHint:
        'No fields collected; keep the message short, warm, and free of instructions or pressure.',
      hideFreeformChatInput: true,
      nextStepId: 'vibe_select',
    },
    {
      id: 'vibe_select',
      type: 'collect_fields',
      label: 'Future self vibe',
      fieldsCollected: ['vibe'],
      hideFreeformChatInput: true,
      promptTemplate:
        "The host will show a card that asks: \"When you imagine your future self… what's the vibe they give off?\" with 6–8 single-tap options like calm, confident, kind, curious, strong, creative, focused. Once the user taps one, you do not need to say anything unless explicitly asked later; treat this as a silent capture of their dominant emotional signature. Keep your visible reply to a single short sentence.",
      validationHint:
        'vibe should be one of the predefined options. It is a soft emotional anchor, not a clinical label.',
      nextStepId: 'social_mirror',
      ui: {
        title: 'When you imagine your future self…',
        description: "What's the vibe they give off?",
      },
    },
    {
      id: 'social_mirror',
      type: 'collect_fields',
      label: 'Social mirror',
      fieldsCollected: ['socialPresence'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a card asking: "And how do people experience that future you?" with tap-only options like "someone people trust", "someone who keeps their cool", "someone who brings others together", "someone who works hard", "someone who surprises people", "someone others want around". You do not need to ask follow-up questions here; simply let the host store this as the social identity orientation. Keep your visible reply to a single short sentence.',
      validationHint:
        'socialPresence is a short phrase describing how others experience the hoped-for self. It should feel intuitive and relational, not clinical.',
      nextStepId: 'core_strength',
      ui: {
        title: 'And how do people experience that future you?',
      },
    },
    {
      id: 'core_strength',
      type: 'collect_fields',
      label: 'Core strength',
      fieldsCollected: ['coreStrength'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a card asking: "What kind of strength does future-you grow into?" with options like physical skill, thinking skill, creative skill, leadership skill, focus + discipline, supporting others, problem-solving. Capture the selection as a soft pointer toward competence and motivation, not a rigid category. Keep your visible reply to a single short sentence.',
      validationHint:
        'coreStrength should be a short noun phrase (e.g. "creative skill", "leadership skill") indicating where aspiration energy clusters.',
      nextStepId: 'everyday_moment',
      ui: {
        title: 'What kind of strength does future-you grow into?',
      },
    },
    {
      id: 'everyday_moment',
      type: 'collect_fields',
      label: 'Everyday proud moment',
      fieldsCollected: ['everydayAction'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a card asking: "Picture future-you on a normal day—not a big moment. What are they doing that makes them feel proud?" with tap-only options like practicing a skill, helping someone, creating something, solving a tough problem, showing up consistently, trying something challenging, staying calm, improving. Treat this as a narrative-identity cue about how aspiration shows up in ordinary life. Keep your visible reply to one short paragraph (2–3 sentences).',
      validationHint:
        'everydayAction should describe identity in action on a normal day (effort, service, creativity, mastery, steadiness).',
      nextStepId: 'nickname_optional',
      ui: {
        title: 'On a normal day…',
        description:
          'Picture future-you on a normal day — not a big moment. What are they doing that makes them feel proud?',
      },
    },
    {
      id: 'nickname_optional',
      type: 'collect_fields',
      label: 'One-word identity (optional)',
      fieldsCollected: ['nickname'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host will invite the user to optionally type a one- or two-word nickname for their future self (e.g., "The Builder", "The Quiet Genius", "The Reliable One") and also let them skip with a tap. Do not pressure the user to type anything; a skip is a perfectly good outcome. Keep your visible reply to one short paragraph (2–3 sentences).',
      validationHint:
        "nickname is optional and may be blank. When present, it is a very strong signal of the user's internal metaphor; when absent, you should still be able to synthesize an aspiration.",
      nextStepId: 'aspiration_generate',
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
      type: 'agent_generate',
      label: 'Synthesize identity aspiration',
      fieldsCollected: ['arcName', 'arcNarrative', 'nextSmallStep'],
      promptTemplate:
        'Using the collected inputs — vibe, socialPresence, coreStrength, everydayAction, optional nickname, and any age/profile context the host has already provided in hidden system messages — generate an identity Arc with exactly 3 sentences plus a single gentle "next small step".\n\nQUALITY EXAMPLES (study these for tone and depth):\n\nExample 1 - Craft & Contribution:\nName: "🧠 Craft & Contribution"\nNarrative: "I want to become a product builder whose work is marked by clarity, compassion, and craftsmanship. This Arc is about developing the ability to see complexity clearly, to name problems honestly, and to build solutions that genuinely help people. It\'s the pursuit of excellence—not for ego, but because thoughtful work is a form of service."\n\nExample 2 - Making & Embodied Creativity:\nName: "🪚 Making & Embodied Creativity"\nNarrative: "I want to stay connected to the physical world through the work of my hands—building, shaping, repairing, and creating things that are tangible and lasting. Making reminds me that growth isn\'t only intellectual. It\'s slow, physical, patient, and grounded. It teaches me presence. It teaches me to notice details. It teaches me to treat materials with respect."\n\nExample 3 - Venture / Entrepreneurship:\nName: "🚀 Venture / Entrepreneurship"\nNarrative: "I want to build ventures that are principled, thoughtful, and genuinely helpful. Entrepreneurship is not about speed or hype for me—it\'s about stewarding ideas that could make people\'s lives more coherent, more peaceful, or more empowered. This Arc represents my desire to take responsibility for my creativity and see it through to real-world impact."\n\nKey qualities to match: specific concrete language, clear "I want" statements, natural flow, grounded in real scenes, reflects genuine identity direction.\n\nRespond ONLY with a JSON object in this shape (no extra commentary):\n{\n  "arcName": string, // 1–3 words (emoji prefix allowed), describing an identity direction or arena, stable over time, reflecting the user\'s inputs. Use patterns like Domain+Posture, Value+Domain, Two-noun frame, or canonical templates.\n  "aspirationSentence": string, // exactly 3 sentences in one paragraph, 40–120 words, FIRST sentence must start with "I want…", use plain grounded language suitable for ages 14–50+, avoid guru-speak/cosmic language/therapy language/prescriptive "shoulds". Sentence 1 expresses identity direction, Sentence 2 explains why it matters now, Sentence 3 gives one concrete ordinary-life scene. CRITICAL: All sentences must be grammatically complete and natural-sounding. Transform user inputs into proper prose rather than inserting raw phrases verbatim. Extract core concepts from user dreams/inputs and express them naturally.\n  "nextSmallStep": string // one sentence starting with "Your next small step: …"\n}\n\nThe Arc should focus on character, energy, and trajectory (who they want to become), not achievements or metrics. The nextSmallStep must be concrete but low-pressure (e.g., "Practice what matters for just 5 minutes."). Keep your visible reply to one short paragraph (2–3 sentences).',
      validationHint:
        'arcName should be short and legible in a list (typically 2–5 words). aspirationSentence should be emotionally resonant but grounded. nextSmallStep must begin with "Your next small step: " and describe one doable action.',
      nextStepId: 'aspiration_reveal',
    },
    {
      id: 'aspiration_reveal',
      type: 'collect_fields',
      label: 'Reveal identity aspiration',
      fieldsCollected: [],
      renderMode: 'static',
      staticCopy:
        "Here's a first snapshot of the identity you're growing into, plus one tiny next step to help you live it.",
      promptTemplate:
        'Using the synthesized aspiration fields (arcName, arcNarrative / aspirationSentence, nextSmallStep), briefly introduce the reveal in 1–2 short sentences. The host will handle the actual card that shows the Arc; you do not need to restate the full aspiration inside chat unless explicitly asked. Keep your visible reply to one short paragraph (2–3 sentences).',
      hideFreeformChatInput: true,
      validationHint:
        'No additional data; keep the reveal introduction short and let the host surface the actual aspiration and next step.',
      nextStepId: 'aspiration_confirm',
    },
    {
      id: 'aspiration_confirm',
      type: 'collect_fields',
      label: 'Confirmation',
      fieldsCollected: ['confirmed'],
      promptTemplate:
        'The host asks: "Does this feel like the future you?" with two taps: Yes / Close but tweak it. Do not override that binary choice. Treat a "Yes" as confirmed=true and any other path as confirmed=false. Keep your visible reply to one or two short sentences.',
      validationHint:
        'confirmed is a boolean reflecting whether the user said the aspiration feels like their future self. The host may still allow a light "tweak" loop before finalizing; the final stored Arc should only represent a version the user said Yes to.',
      nextStepId: 'closing_arc',
    },
    {
      id: 'closing_arc',
      type: 'collect_fields',
      label: 'Closing – Arc adopted',
      renderMode: 'static',
      staticCopy:
        "Great—we've turned what you shared into a clear identity Arc to start from.\n\n" +
        "This isn't meant to be a perfect definition of you; it's a simple storyline you can grow into and refine as you go. As you spend more time in kwilt, you'll be able to add more Arcs, attach goals and activities, and design concrete plans that actually fit your real life.\n\n" +
        "From here, you can explore your new Arc, add your own goals, or just let this sit at the top of your identity layer while you get used to the app.",
      promptTemplate:
        'In 2–3 short sentences, congratulate the user, briefly recap that they now have a clear identity Arc saved in kwilt, and remind them they can always refine it or add more Arcs, goals, and activities once they are in the app. Emphasize that this Arc is a starting point, not a life sentence. Keep your visible reply to one short paragraph (2–3 sentences).',
      fieldsCollected: [],
      validationHint:
        'No new fields; keep it concise, encouraging, and grounded. Avoid hype.',
    },
  ],
};


