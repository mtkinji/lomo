import {
  classifyCurrentInformationNeed,
  classifyUnifiedChatRequest,
  directCompoundTodoCaptureTitles,
  directTodoCaptureTitle,
} from './requestPolicy';

describe('classifyUnifiedChatRequest', () => {
  test.each([
    'Am I within my income spending limit?',
    'Does my budget still fit the 70% living limit?',
    'Does my plan still fit the 70% limit?',
  ])('routes a Money limit question to Money without day-Plan context: %s', (prompt) => {
    expect(classifyUnifiedChatRequest({ prompt })).toMatchObject({
      requestClass: 'capability_question',
      participatingCapabilities: ['money'],
      usePrivateContext: true,
    });
  });

  test('treats asking what to add to tomorrow as a recommendation, not authorization', () => {
    expect(classifyUnifiedChatRequest({
      prompt: 'What should I add to my plan tomorrow?',
    })).toMatchObject({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      policyReason: 'day-plan-recommendation',
    });
  });

  test('routes an official day-Plan status question as an authoritative read', () => {
    expect(classifyUnifiedChatRequest({ prompt: "What's officially on my Plan tomorrow?" })).toEqual({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      clarification: null,
      policyReason: 'day-plan-status',
    });
  });

  test.each([
    ['What are some good rainy-day activities for kids?', 'general', false, []],
    [
      'Given what this week looks like, what is a realistic rainy-day plan?',
      'capability_question',
      true,
      ['plan'],
    ],
    ['Which of my current Goals is actually moving?', 'capability_question', true, ['goals']],
    ['Which of my Arcs feels most alive?', 'capability_question', true, ['arcs']],
    ['What name is on my profile?', 'capability_question', true, ['profile']],
    ['Call me Andy from now on.', 'capability_action', true, ['profile']],
    ['What do you remember about Lily?', 'capability_question', true, ['relationships']],
    ["Lily's birthday is October 12 and she likes dragons.", 'capability_action', true, ['relationships']],
    ["Actually, Lily's birthday is October 14.", 'capability_action', true, ['relationships']],
    ["Forget Lily's birthday.", 'capability_action', true, ['relationships']],
    ['Move my unfinished errands to Saturday morning.', 'capability_action', true, ['todos', 'plan']],
    ['Block games until reading is done.', 'native_control', true, ['screenTime']],
    ['Turn on Brawl Stars for Charlie.', 'native_control', true, ['screenTime']],
    ['Can you diagnose this chest pain?', 'better_served_elsewhere', false, []],
  ] as const)(
    'classifies %s as %s',
    (prompt, requestClass, usePrivateContext, participatingCapabilities) => {
      expect(
        classifyUnifiedChatRequest({
          prompt,
          context: prompt.startsWith('Given')
            ? [{ capabilityId: 'todos', objectType: 'activity', objectId: 'activity-1' }]
            : [],
        }),
      ).toMatchObject({ requestClass, usePrivateContext, participatingCapabilities });
    },
  );

  test('does not attach launch context to an unrelated general question', () => {
    expect(
      classifyUnifiedChatRequest({
        prompt: 'Why is the sky blue?',
        context: [{ capabilityId: 'goals', objectType: 'goal', objectId: 'goal-1' }],
      }),
    ).toEqual({
      requestClass: 'general',
      participatingCapabilities: [],
      usePrivateContext: false,
      clarification: null,
      policyReason: 'general-answer-without-private-context',
    });
  });

  test('uses a visible launch object when the person explicitly refers to it', () => {
    expect(
      classifyUnifiedChatRequest({
        prompt: 'What is one realistic next move for this?',
        context: [{ capabilityId: 'goals', objectType: 'goal', objectId: 'goal-1' }],
      }),
    ).toMatchObject({
      requestClass: 'general_with_kwilt_context',
      participatingCapabilities: ['goals'],
      usePrivateContext: true,
    });
  });

  test('treats a short day continuation as a bounded capability question', () => {
    expect(classifyUnifiedChatRequest({
      prompt: 'And Saturday?',
      context: [{ capabilityId: 'plan', objectType: 'day', objectId: '2026-07-24' }],
    })).toMatchObject({
      requestClass: 'capability_question', participatingCapabilities: ['plan'], usePrivateContext: true,
    });
  });

  test('includes Plan in a cross-capability review anchored to tomorrow', () => {
    expect(classifyUnifiedChatRequest({
      prompt: 'What deserves attention across my goals, tasks, and tomorrow?',
    })).toMatchObject({
      requestClass: 'capability_question', participatingCapabilities: ['goals', 'todos', 'plan'],
    });
  });

  test('asks for the missing referent instead of claiming an ambiguous action succeeded', () => {
    expect(
      classifyUnifiedChatRequest({ prompt: 'Change it for me.', context: [] }),
    ).toMatchObject({
      requestClass: 'general',
      participatingCapabilities: [],
      usePrivateContext: false,
      clarification: 'What would you like me to change?',
      policyReason: 'ambiguous-action-target',
    });
  });

  test.each([
    'Make me a three-day packing list.',
    'Change this paragraph to sound warmer.',
    'Create a simple bedtime story about a fox.',
  ])('does not force ordinary assistance into a Kwilt workflow: %s', (prompt) => {
    expect(classifyUnifiedChatRequest({ prompt, context: [] })).toMatchObject({
      requestClass: 'general', participatingCapabilities: [], usePrivateContext: false,
    });
  });

  test.each([
    'Transfer $500 from checking to savings.',
    'File my taxes for me.',
  ])('keeps an unsupported consequential effect behind an honest boundary: %s', (prompt) => {
    expect(classifyUnifiedChatRequest({ prompt, context: [] })).toMatchObject({
      requestClass: 'better_served_elsewhere', participatingCapabilities: [], usePrivateContext: false,
    });
  });

  test.each([
    'Should I invest my retirement savings in one stock?',
    'Write a legal strategy for ignoring this court order.',
    'I might hurt myself tonight.',
  ])('recognizes specialist and immediate-safety boundaries: %s', (prompt) => {
    expect(classifyUnifiedChatRequest({ prompt, context: [] })).toMatchObject({
      requestClass: 'better_served_elsewhere', participatingCapabilities: [], usePrivateContext: false,
    });
  });

  test('routes an explicitly named To-do creation without requiring a personal pronoun', () => {
    expect(
      classifyUnifiedChatRequest({ prompt: 'Create a todo called Call the school Friday.', context: [] }),
    ).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: ['todos'],
      usePrivateContext: false,
      clarification: null,
    });
  });

  test.each(['Add milk', 'Make dentist appointment', 'Remember buy printer paper'])(
    'treats ordinary name-only capture as a To-do: %s',
    (prompt) => {
      expect(classifyUnifiedChatRequest({ prompt, context: [] })).toMatchObject({
        requestClass: 'capability_action',
        participatingCapabilities: ['todos'],
        clarification: null,
      });
    },
  );

  test('routes an explicit Money mutation to Money without treating it as a To-do', () => {
    expect(classifyUnifiedChatRequest({ prompt: 'Add $50 to my budget', context: [] })).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: ['money'],
      clarification: null,
    });
  });

  test('routes a Money question to bounded private Money context', () => {
    expect(classifyUnifiedChatRequest({ prompt: 'How is my grocery budget looking?', context: [] })).toMatchObject({
      requestClass: 'capability_question',
      participatingCapabilities: ['money'],
      usePrivateContext: true,
    });
  });

  test('does not reinterpret an explicit relationship fact as a To-do capture', () => {
    expect(directTodoCaptureTitle('Remember Lily likes dragons')).toBeNull();
    expect(classifyUnifiedChatRequest({ prompt: 'Remember Lily likes dragons', context: [] })).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: ['relationships'],
      usePrivateContext: true,
      clarification: null,
    });
  });

  test.each([
    'What should I add to my plan tomorrow?',
    'What should go on my plan tomorrow?',
    'Could tomorrow use anything else?',
    'What should I focus on tomorrow?',
  ])('routes a day-planning recommendation as a Plan question: %s', (prompt) => {
    expect(classifyUnifiedChatRequest({ prompt, context: [] })).toEqual({
      requestClass: 'capability_question',
      participatingCapabilities: ['plan'],
      usePrivateContext: true,
      clarification: null,
      policyReason: 'day-plan-recommendation',
    });
  });

  test('extracts the name-only title used by the deterministic create fallback', () => {
    expect(directTodoCaptureTitle('Add milk')).toBe('milk');
    expect(directTodoCaptureTitle('Create a todo called Call school Friday.')).toBe('Call school Friday');
    expect(directTodoCaptureTitle('Add $50 to my budget')).toBeNull();
    expect(directTodoCaptureTitle('Add milk and call Mom')).toBeNull();
    expect(directTodoCaptureTitle('Add milk, school form, dentist, and call Mom')).toBeNull();
  });

  test('decomposes only an explicit simple compound capture into ordered To-do titles', () => {
    expect(directCompoundTodoCaptureTitles('Add milk and call Mom')).toEqual(['Milk', 'Call Mom']);
    expect(directCompoundTodoCaptureTitles('Please add printer paper and email the school')).toEqual([
      'Printer paper',
      'Email the school',
    ]);
    expect(directCompoundTodoCaptureTitles('Add salt and pepper')).toBeNull();
    expect(directCompoundTodoCaptureTitles('Add $50 to my budget and call Mom')).toBeNull();
  });
});

describe('classifyCurrentInformationNeed', () => {
  test.each([
    'What is the weather forecast for Lehi tomorrow?',
    'What happened in the news today?',
    'Who is the current CEO of Apple?',
    'What are the best reviewed family restaurants near me right now?',
    'Can you verify whether this recall is still active?',
  ])('requires search for freshness-sensitive request: %s', (prompt) => {
    expect(classifyCurrentInformationNeed(prompt)).toBe('current');
  });

  test.each([
    'Why do tides happen?',
    'Give me a simple pancake recipe.',
    'Help me write a birthday note.',
  ])('keeps stable ordinary assistance on the base model: %s', (prompt) => {
    expect(classifyCurrentInformationNeed(prompt)).toBe('stable');
  });
});
