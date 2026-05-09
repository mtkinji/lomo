import type { WorkflowDefinition, WorkflowStep } from '../../../domain/workflows';
import { FIRST_TIME_ONBOARDING_PROMPT } from '../systemPrompts';
import { buildHybridArcGuidelinesBlock } from '../../../domain/arcHybridPrompt';

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
      staticCopy: "Let's name one direction you want to make easier to practice.",
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
      label: 'Domain of becoming',
      fieldsCollected: ['domain'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking which life domain this identity Arc is about (e.g., craft, family, health, learning, creativity, relationships, spirit). Treat the selection as the user’s “domain of becoming”. Keep your visible reply to a single short sentence.',
      validationHint:
        'domain should be one of the predefined options. It is a life arena, not a task list.',
      nextStepId: 'social_mirror',
      ui: {
        title: 'Choose a direction',
        description: 'Where do you want to practice becoming steadier right now?',
      },
    },
    {
      id: 'social_mirror',
      type: 'collect_fields',
      label: 'Motivational style',
      fieldsCollected: ['motivation'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card that captures the user’s motivational posture (e.g., calm/steady, bold/energetic, relational, mastery-driven). Treat the selection as the user’s motivational style. Keep your visible reply to a single short sentence.',
      validationHint:
        'motivation is a short phrase capturing their motivational posture. It should feel intuitive, not clinical.',
      nextStepId: 'core_strength',
      ui: {
        title: 'How do you want it to feel?',
      },
    },
    {
      id: 'core_strength',
      type: 'collect_fields',
      label: 'Signature trait',
      fieldsCollected: ['signatureTrait'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking for the user’s signature trait (a strength they want to embody). Treat the selection as a “signatureTrait” signal. Keep your visible reply to a single short sentence.',
      validationHint:
        'signatureTrait should be a short phrase describing a strength they want to embody (e.g. “disciplined”, “creative”, “reliable”).',
      nextStepId: 'growth_edge',
      ui: {
        title: 'What strength do you grow into?',
      },
    },
    {
      id: 'growth_edge',
      type: 'collect_fields',
      label: 'Growth edge',
      fieldsCollected: ['growthEdge'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking for the user’s growth edge (a weakness/pattern they want to outgrow or a skill they want to develop). Treat the selection as a “growthEdge” signal. Keep your visible reply to a single short sentence.',
      validationHint:
        'growthEdge should be a short phrase describing a growth edge (e.g. “procrastination”, “staying calm”, “follow-through”).',
      nextStepId: 'everyday_moment',
      ui: {
        title: 'What do you outgrow?',
      },
    },
    {
      id: 'everyday_moment',
      type: 'collect_fields',
      label: 'Everyday proud moment',
      fieldsCollected: ['proudMoment'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking what the user does on a normal day that makes them feel proud. Treat this as an “everyday proud moment” identity-in-action cue. Keep your visible reply to one short paragraph (2–3 sentences).',
      validationHint:
        'proudMoment should describe identity in action on a normal day (effort, service, creativity, mastery, steadiness).',
      nextStepId: 'nickname_optional',
      ui: {
        title: 'On a normal day…',
        description:
          'Picture an ordinary day where this is going well. What are you doing?',
      },
    },
    {
      id: 'meaning',
      type: 'collect_fields',
      label: 'Source of meaning',
      fieldsCollected: ['meaning'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking what makes life feel meaningful. Capture the selection as “meaning”. Keep your visible reply to a single short sentence.',
      validationHint:
        'meaning is a short phrase describing where meaning comes from (craft, relationships, faith, service, creation, etc.).',
      nextStepId: 'impact',
      ui: {
        title: 'What feels meaningful?',
      },
    },
    {
      id: 'impact',
      type: 'collect_fields',
      label: 'Desired impact',
      fieldsCollected: ['impact'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking how the user hopes their life impacts other people. Capture the selection as “impact”. Keep your visible reply to a single short sentence.',
      validationHint:
        'impact is a short phrase describing hoped-for impact on others.',
      nextStepId: 'values',
      ui: {
        title: 'What impact do you hope to have?',
      },
    },
    {
      id: 'values',
      type: 'collect_fields',
      label: 'Core value',
      fieldsCollected: ['values'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking which value feels most core. Capture the selection as “values”. Keep your visible reply to a single short sentence.',
      validationHint:
        'values is a single selected value token that anchors the Arc.',
      nextStepId: 'philosophy',
      ui: {
        title: 'What value is most core?',
      },
    },
    {
      id: 'philosophy',
      type: 'collect_fields',
      label: 'Life philosophy',
      fieldsCollected: ['philosophy'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking what overall approach the user wants to take through life. Capture the selection as “philosophy”. Keep your visible reply to a single short sentence.',
      validationHint:
        'philosophy is a short phrase describing life approach (gentle, disciplined, courageous, etc.).',
      nextStepId: 'vocation',
      ui: {
        title: 'What’s your approach?',
      },
    },
    {
      id: 'vocation',
      type: 'collect_fields',
      label: 'Vocation / creation lane',
      fieldsCollected: ['vocation'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host shows a tap-only card asking which kind of work/creation belongs in this Arc. Capture the selection as “vocation”. Keep your visible reply to a single short sentence.',
      validationHint:
        'vocation is a short phrase describing a vocational/creative lane (craft, ventures, teaching, ideas, etc.).',
      nextStepId: 'big_dream',
      ui: {
        title: 'What kind of work or creation?',
      },
    },
    {
      id: 'big_dream',
      type: 'collect_fields',
      label: 'Big dream (free response)',
      fieldsCollected: ['bigDream'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host will ask for one short free-response “big dream” the user wants to make room for. Capture it as “bigDream”. Keep your visible reply to a single short sentence.',
      validationHint:
        'bigDream is a short free-response sentence or phrase. It should not be empty.',
      nextStepId: 'nickname_optional',
      ui: {
        title: 'One big dream',
        description: 'Looking ahead, what’s one big thing you want to make room for?',
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
      type: 'collect_fields',
      label: 'One-word identity (optional)',
      fieldsCollected: ['nickname'],
      hideFreeformChatInput: true,
      promptTemplate:
        'The host will invite the user to optionally type a one- or two-word name for this Arc (e.g., "The Builder", "The Quiet Genius", "The Reliable One") and also let them skip with a tap. Do not pressure the user to type anything; a skip is a perfectly good outcome. Keep your visible reply to one short paragraph (2–3 sentences).',
      validationHint:
        "nickname is optional and may be blank. When present, it is a very strong signal of the user's internal metaphor; when absent, you should still be able to synthesize an aspiration.",
      nextStepId: 'aspiration_generate',
      ui: {
        title: 'If this Arc had a short name…',
        description: 'If this direction had a short name, what would fit? (Optional)',
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
      promptTemplate: `${[
        'Using the collected inputs (domain, motivation, signatureTrait, growthEdge, proudMoment, meaning, impact, values, philosophy, vocation, bigDream, optional nickname), generate an identity Arc plus a single gentle "next small step".',
        '',
        // Shared hybrid paradigm constraints + quality targets.
        buildHybridArcGuidelinesBlock(),
        '',
        'QUALITY EXAMPLES (3 sentences each; follow the feel, do not copy):',
        '',
        'Example 1 — The Steady Maker',
        'Name: "The Steady Maker"',
        'Narrative: "You are becoming someone who turns creative energy into visible work, one small finished piece at a time. Your ideas need rhythm, feedback, and the courage to be seen before they are perfect. Progress looks like opening the rough draft, shipping one small piece, and telling one real person what you made."',
        '',
        'Example 2 — The Grounded Maker',
        'Name: "The Grounded Maker"',
        'Narrative: "You are becoming someone who stays connected to the physical world through the work of your hands. The tension is between drifting into screens and returning to materials, tools, and patient attention. Progress looks like stepping into the garage, picking up one tool, and making one visible improvement to something real."',
        '',
        'Example 3 — The Patient Parent',
        'Name: "The Patient Parent"',
        'Narrative: "You are becoming someone who helps home feel safe, steady, and seen. The central shift is treating the atmosphere of family life as something you can practice with care, not something left to stress or schedule. Progress looks like putting your phone down, listening before reacting, and doing one quiet thing that makes the house feel cared for."',
        '',
        'Respond ONLY with a JSON object in this shape (no extra commentary):',
        '{',
        '  "arcName": string,',
        '  "aspirationSentence": string,',
        '  "nextSmallStep": string',
        '}',
        '',
        'nextSmallStep requirements:',
        '- One sentence starting with "Your next small step: …"',
        '- Concrete but low-pressure (fits in 5–20 minutes).',
      ].join('\n')}`,
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
        'The host asks: "Does this feel like the direction you want to practice?" with two taps: Yes / Close but tweak it. Do not override that binary choice. Treat a "Yes" as confirmed=true and any other path as confirmed=false. Keep your visible reply to one or two short sentences.',
      validationHint:
        'confirmed is a boolean reflecting whether the user said the aspiration feels like the direction they want to practice. The host may still allow a light "tweak" loop before finalizing; the final stored Arc should only represent a version the user said Yes to.',
      nextStepId: 'closing_arc',
    },
    {
      id: 'closing_arc',
      type: 'collect_fields',
      label: 'Closing – Arc adopted',
      renderMode: 'static',
      staticCopy:
        "Great—we've turned what you shared into a clear identity Arc to start from.\n\n" +
        "This isn't meant to be a perfect definition of you; it's a working draft you can use and refine as you go. As you spend more time in Kwilt, you'll be able to add more Arcs, attach goals and to-dos, and design concrete plans that actually fit your real life.\n\n" +
        "From here, you can explore your new Arc, add your own goals, or just let this sit at the top of your identity layer while you get used to the app.",
      promptTemplate:
        'In 2–3 short sentences, congratulate the user, briefly recap that they now have a clear identity Arc saved in Kwilt, and remind them they can always refine it or add more Arcs, goals, and to-dos once they are in the app. Emphasize that this Arc is a starting point, not a life sentence. Keep your visible reply to one short paragraph (2–3 sentences).',
      fieldsCollected: [],
      validationHint:
        'No new fields; keep it concise, encouraging, and grounded. Avoid hype.',
    },
  ],
};





