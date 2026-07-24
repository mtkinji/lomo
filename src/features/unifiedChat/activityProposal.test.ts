import {
  ACTIVITY_ACTION_RESPONSE_FORMAT,
  ActivityProposalApprovalRequiredError,
  assertActivityProposalCanApply,
  parseActivityActionResponse,
  recurringReminderClarification,
} from './activityProposal';

describe('Unified Chat Activity proposals', () => {
  test('asks for an exact reminder time without inventing what night means', () => {
    expect(recurringReminderClarification(
      'Create a to-do called Take out the trash, set it to be a recurring reminder every Tuesday night.',
    )).toBe('What time Tuesday night should I remind you?');
    expect(recurringReminderClarification(
      'Create a to-do called Take out the trash and remind me every Tuesday at 8 PM.',
    )).toBeNull();
    expect(recurringReminderClarification('What should I add to my Plan tomorrow?')).toBeNull();
  });

  test('constrains generated Activity types to the capability domain', () => {
    expect(ACTIVITY_ACTION_RESPONSE_FORMAT.json_schema.strict).toBe(true);
    const schema = ACTIVITY_ACTION_RESPONSE_FORMAT.json_schema.schema;
    const payloadSchema = schema.properties.proposal.properties.operation.properties.payload;
    const payload = payloadSchema.properties;
    expect(payloadSchema.required).toEqual([
      'title', 'notes', 'goalId', 'type', 'status', 'tags', 'priority',
      'scheduledDate', 'reminderAt', 'repeatRule', 'repeatCustom', 'repeatBasis',
      'estimateMinutes', 'difficulty', 'clearFields',
    ]);
    expect(payload.type).toEqual({
      type: ['string', 'null'],
      enum: ['task', 'checklist', 'shopping_list', 'instructions', 'plan', null],
    });
    expect(payload.title).toMatchObject({ minLength: 1, maxLength: 240 });
    expect(payload.notes).toMatchObject({ maxLength: 5000 });
    expect(payload.goalId).toMatchObject({ maxLength: 200 });
    expect(payload.tags).toMatchObject({ maxItems: 20 });
    expect(payload.tags.items).toMatchObject({ minLength: 1, maxLength: 80 });
    expect(payload.scheduledDate).toMatchObject({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' });
    expect(payload.reminderAt).toMatchObject({ format: 'date-time' });
    expect(payload.estimateMinutes).toMatchObject({ minimum: 1, maximum: 1440 });
    expect(payload.clearFields.items.enum).toEqual([
      'notes', 'goalId', 'tags', 'priority', 'scheduledDate', 'reminderAt',
      'repeatRule', 'repeatCustom', 'repeatBasis', 'estimateMinutes', 'difficulty',
    ]);
  });

  test('parses bounded reminder and recurrence fields and rejects malformed custom recurrence', () => {
    expect(parseActivityActionResponse(JSON.stringify({
      answer: 'I drafted the schedule change.',
      proposal: {
        title: 'Repeat the school call', body: 'Adds a weekly reminder.',
        operation: {
          type: 'update_activity', targetId: 'activity-school',
          expectedUpdatedAt: '2026-07-22T13:00:00.000Z',
          payload: {
            reminderAt: '2026-07-30T15:00:00.000Z', repeatRule: 'custom',
            repeatCustom: { cadence: 'weeks', interval: 2, weekdays: [1, 3] },
            repeatBasis: 'scheduled',
          },
        },
      },
    }))?.proposal?.operation.payload).toMatchObject({
      reminderAt: '2026-07-30T15:00:00.000Z', repeatRule: 'custom',
      repeatCustom: { cadence: 'weeks', interval: 2, weekdays: [1, 3] },
      repeatBasis: 'scheduled',
    });

    expect(parseActivityActionResponse(JSON.stringify({
      answer: 'Drafted.', proposal: {
        title: 'Repeat it', body: 'Invalid recurrence.', operation: {
          type: 'update_activity', targetId: 'activity-school',
          expectedUpdatedAt: '2026-07-22T13:00:00.000Z',
          payload: { repeatRule: 'custom', repeatCustom: { cadence: 'weeks', interval: 0, weekdays: [9] } },
        },
      },
    }))).toBeNull();
  });

  test('parses a bounded create proposal without applying it', () => {
    expect(parseActivityActionResponse(JSON.stringify({
      answer: 'I drafted a To-do for you to review.',
      proposal: {
        title: 'Add library visit',
        body: 'Creates one planned To-do.',
        operation: {
          type: 'create_activity',
          targetId: null,
          expectedUpdatedAt: null,
          payload: {
            title: 'Visit the library',
            notes: 'Choose rainy-day books.',
            goalId: 'goal-reading',
            status: 'planned',
            tags: ['errands', 'books'],
            priority: 1,
            scheduledDate: '2026-07-24',
          },
        },
      },
    }))).toEqual(expect.objectContaining({
      answer: 'I drafted a To-do for you to review.',
      proposal: expect.objectContaining({
        operation: expect.objectContaining({
          type: 'create_activity',
          payload: expect.objectContaining({ title: 'Visit the library', status: 'planned' }),
        }),
      }),
    }));
  });

  test('requires an owned target and optimistic version for updates', () => {
    expect(parseActivityActionResponse(JSON.stringify({
      answer: 'I drafted the change.',
      proposal: {
        title: 'Move the library visit',
        body: 'Changes the scheduled day.',
        operation: {
          type: 'update_activity',
          targetId: 'activity-library',
          expectedUpdatedAt: '2026-07-21T13:00:00.000Z',
          payload: { scheduledDate: '2026-07-25' },
        },
      },
    }))?.proposal?.operation).toMatchObject({
      type: 'update_activity',
      targetId: 'activity-library',
      expectedUpdatedAt: '2026-07-21T13:00:00.000Z',
    });

    expect(parseActivityActionResponse(JSON.stringify({
      answer: 'Drafted.',
      proposal: {
        title: 'Move it', body: 'Changes date.',
        operation: {
          type: 'update_activity', targetId: null, expectedUpdatedAt: null,
          payload: { scheduledDate: '2026-07-25' },
        },
      },
    }))).toBeNull();
  });

  test('treats nullable strict-schema fields as unchanged during an update', () => {
    const response = parseActivityActionResponse(JSON.stringify({
      answer: 'I drafted the change.',
      proposal: {
        title: 'Move tea to tomorrow',
        body: 'Changes only the scheduled day.',
        operation: {
          type: 'update_activity',
          targetId: 'activity-tea',
          expectedUpdatedAt: '2026-07-22T13:00:00.000Z',
          payload: {
            title: null,
            notes: null,
            goalId: null,
            type: null,
            status: null,
            tags: null,
            priority: null,
            scheduledDate: '2026-07-23',
            estimateMinutes: null,
            difficulty: null,
            clearFields: [],
          },
        },
      },
    }));

    expect(response?.proposal?.operation).toMatchObject({
      type: 'update_activity',
      payload: { scheduledDate: '2026-07-23' },
    });
    expect(response?.proposal?.operation.payload).not.toHaveProperty('title');
    expect(response?.proposal?.operation.payload).not.toHaveProperty('notes');
  });

  test('only clears fields named explicitly by the model', () => {
    const response = parseActivityActionResponse(JSON.stringify({
      answer: 'I drafted the cleanup.',
      proposal: {
        title: 'Remove optional details',
        body: 'Clears the notes, tags, and priority.',
        operation: {
          type: 'update_activity',
          targetId: 'activity-tea',
          expectedUpdatedAt: '2026-07-22T13:00:00.000Z',
          payload: {
            title: null,
            notes: null,
            goalId: null,
            type: null,
            status: null,
            tags: null,
            priority: null,
            scheduledDate: null,
            estimateMinutes: null,
            difficulty: null,
            clearFields: ['notes', 'tags', 'priority'],
          },
        },
      },
    }));

    expect(response?.proposal?.operation.payload).toEqual({
      notes: null,
      tags: [],
      priority: null,
    });
  });

  test.each([
    'not json',
    JSON.stringify({ answer: '', proposal: null }),
    JSON.stringify({ answer: 'Okay', proposal: { title: 'Delete', body: 'No', operation: { type: 'delete_activity', payload: {} } } }),
    JSON.stringify({ answer: 'Okay', proposal: { title: 'Update', body: 'No', operation: { type: 'update_activity', targetId: 'x', expectedUpdatedAt: 'now', payload: { secret: true } } } }),
  ])('rejects malformed or out-of-contract output', (raw) => {
    expect(parseActivityActionResponse(raw)).toBeNull();
  });

  test.each(['pending', 'edited', 'rejected', 'deferred', 'applying', 'applied', 'failed', 'undone'] as const)(
    'prevents apply while proposal status is %s',
    (status) => {
      expect(() => assertActivityProposalCanApply(status)).toThrow(
        ActivityProposalApprovalRequiredError,
      );
    },
  );

  test('allows only an approved proposal into the capability apply boundary', () => {
    expect(() => assertActivityProposalCanApply('approved')).not.toThrow();
  });
});
