import { classifyUnifiedChatRequest, directTodoCaptureTitle } from './requestPolicy';

describe('classifyUnifiedChatRequest', () => {
  test.each([
    ['What are some good rainy-day activities for kids?', 'general', false, []],
    [
      'Given what this week looks like, what is a realistic rainy-day plan?',
      'general_with_kwilt_context',
      true,
      ['todos'],
    ],
    ['Which of my current Goals is actually moving?', 'capability_question', true, ['goals']],
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

  test('extracts the name-only title used by the deterministic create fallback', () => {
    expect(directTodoCaptureTitle('Add milk')).toBe('milk');
    expect(directTodoCaptureTitle('Create a todo called Call school Friday.')).toBe('Call school Friday');
    expect(directTodoCaptureTitle('Add $50 to my budget')).toBeNull();
  });
});
