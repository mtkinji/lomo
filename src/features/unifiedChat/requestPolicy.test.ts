import { classifyUnifiedChatRequest, directTodoCaptureTitle } from './requestPolicy';

describe('classifyUnifiedChatRequest', () => {
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

  test.each([
    ['What are some good rainy-day activities for kids?', 'general', false, []],
    [
      'Given what this week looks like, what is a realistic rainy-day plan?',
      'general_with_kwilt_context',
      true,
      ['todos'],
    ],
    ['Which of my current Goals is actually moving?', 'capability_question', true, ['goals']],
    ['Which of my Arcs feels most alive?', 'capability_question', true, ['arcs']],
    ['What name is on my profile?', 'capability_question', true, ['profile']],
    ['Call me Andy from now on.', 'capability_action', true, ['profile']],
    ['What do you remember about Lily?', 'capability_question', true, ['relationships']],
    ["Lily's birthday is October 12 and she likes dragons.", 'capability_action', true, ['relationships']],
    ["Actually, Lily's birthday is October 14.", 'capability_action', true, ['relationships']],
    ["Forget Lily's birthday.", 'capability_action', true, ['relationships']],
    ['Move my unfinished errands to Saturday morning.', 'capability_action', true, ['todos']],
    ['Block games until reading is done.', 'native_control', false, ['screenTime']],
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

  test('asks one clarification when an action has no owning capability', () => {
    expect(
      classifyUnifiedChatRequest({ prompt: 'Change it for me.', context: [] }),
    ).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: [],
      usePrivateContext: false,
      clarification: 'What would you like Kwilt to change?',
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

  test('does not reinterpret a different named domain as a To-do', () => {
    expect(classifyUnifiedChatRequest({ prompt: 'Add $50 to my budget', context: [] })).toMatchObject({
      requestClass: 'capability_action',
      participatingCapabilities: [],
      clarification: 'What would you like Kwilt to change?',
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
});
