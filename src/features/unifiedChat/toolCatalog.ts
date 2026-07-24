import type { AgentToolDefinition } from '@kwilt/agent-runtime';

const OBJECT_SCHEMA = { type: 'object', properties: {}, additionalProperties: false } as const;
const ACTIVITY_FIELD_PROPERTIES = {
  title: { type: 'string', minLength: 1, maxLength: 240 },
  notes: { type: ['string', 'null'], maxLength: 5000 },
  goalId: { type: ['string', 'null'] },
  type: { type: 'string', enum: ['task', 'checklist', 'shopping_list', 'instructions', 'plan'] },
  status: { type: 'string', enum: ['planned', 'in_progress', 'done', 'skipped', 'cancelled'] },
  tags: { type: 'array', maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 80 } },
  priority: { type: ['integer', 'null'], enum: [1, 2, 3, null] },
  scheduledDate: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  reminderAt: { type: ['string', 'null'], format: 'date-time' },
  repeatRule: { type: ['string', 'null'], enum: ['daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom', null] },
  repeatCustom: {
    type: ['object', 'null'],
    properties: {
      cadence: { type: 'string', enum: ['days', 'weeks', 'months', 'years'] },
      interval: { type: 'integer', minimum: 1, maximum: 365 },
      weekdays: { type: 'array', maxItems: 7, items: { type: 'integer', minimum: 0, maximum: 6 } },
    },
    additionalProperties: false,
  },
  repeatBasis: { type: ['string', 'null'], enum: ['scheduled', 'after_completion', null] },
  estimateMinutes: { type: ['integer', 'null'], minimum: 1, maximum: 1440 },
  difficulty: { type: ['string', 'null'], enum: ['very_easy', 'easy', 'medium', 'hard', 'very_hard', null] },
} as const;
const ACTIVITY_CAPTURE_SCHEMA = {
  type: 'object',
  properties: {
    ...ACTIVITY_FIELD_PROPERTIES,
    reminderLocalTime: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
    repeatWeekdays: {
      type: 'array', minItems: 1, maxItems: 7,
      items: { type: 'integer', minimum: 0, maximum: 6 },
    },
  },
  required: ['title'],
  additionalProperties: false,
} as const;
const ACTIVITY_UPDATE_SCHEMA = {
  type: 'object',
  properties: {
    activityId: { type: 'string', minLength: 1 },
    fields: { type: 'object', properties: ACTIVITY_FIELD_PROPERTIES, additionalProperties: false },
  },
  required: ['activityId', 'fields'],
  additionalProperties: false,
} as const;
const PLAN_DAY_SCHEMA = {
  type: 'object',
  properties: { targetDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
  additionalProperties: false,
} as const;
const STEP_TARGET_PROPERTIES = {
  activityId: { type: 'string', minLength: 1 },
  stepId: { type: 'string', minLength: 1 },
} as const;
const GOAL_FIELD_PROPERTIES = {
  title: { type: 'string', minLength: 1, maxLength: 240 },
  description: { type: ['string', 'null'], maxLength: 5000 },
  arcId: { type: ['string', 'null'] },
  status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'archived'] },
  priority: { type: ['integer', 'null'], enum: [1, 2, 3, null] },
  targetDate: { type: ['string', 'null'], format: 'date-time' },
} as const;
const GOAL_CREATE_PROPERTIES = {
  ...GOAL_FIELD_PROPERTIES,
  followUpActivity: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 240 },
      repeatRule: { type: 'string', enum: ['daily'] },
    },
    required: ['title', 'repeatRule'],
    additionalProperties: false,
  },
} as const;
const ARC_FIELD_PROPERTIES = {
  name: { type: 'string', minLength: 1, maxLength: 160 },
  narrative: { type: ['string', 'null'], maxLength: 5000 },
  identityStatement: { type: ['string', 'null'], maxLength: 1000 },
  status: { type: 'string', enum: ['active', 'paused', 'archived'] },
} as const;
const PROFILE_FIELD_PROPERTIES = {
  fullName: { type: ['string', 'null'], maxLength: 160 },
  ageRange: {
    type: ['string', 'null'],
    enum: ['under-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65-plus', 'prefer-not-to-say', null],
  },
} as const;
const RELATIONSHIP_MEMORY_SCHEMA = {
  type: 'object',
  properties: {
    personName: { type: 'string', minLength: 1, maxLength: 160 },
    aliases: { type: 'array', maxItems: 5, items: { type: 'string', minLength: 1, maxLength: 160 } },
    memories: {
      type: 'array', maxItems: 8, items: {
        type: 'object', additionalProperties: false, required: ['kind', 'text'],
        properties: {
          kind: { type: 'string', enum: ['preference', 'constraint', 'note', 'sensitivity', 'milestone'] },
          text: { type: 'string', minLength: 1, maxLength: 5000 },
        },
      },
    },
    events: {
      type: 'array', maxItems: 4, items: {
        type: 'object', additionalProperties: false, required: ['kind', 'title'],
        properties: {
          kind: { type: 'string', enum: ['birthday', 'gathering', 'deadline', 'post_event', 'other'] },
          title: { type: 'string', minLength: 1, maxLength: 500 },
          dateText: { type: ['string', 'null'], maxLength: 160 },
          startsAt: { type: ['string', 'null'], format: 'date-time' },
          timeZone: { type: ['string', 'null'], maxLength: 100 },
        },
      },
    },
    cadences: {
      type: 'array', maxItems: 4, items: {
        type: 'object', additionalProperties: false, required: ['kind', 'intervalDays'],
        properties: {
          kind: { type: 'string', enum: ['drift', 'recurring_followup', 'other'] },
          intervalDays: { type: 'integer', minimum: 1, maximum: 730 },
          nextDueAt: { type: ['string', 'null'], format: 'date-time' },
        },
      },
    },
  },
  required: ['personName', 'aliases', 'memories', 'events', 'cadences'],
  additionalProperties: false,
} as const;
const RELATIONSHIP_RECORD_TYPE_SCHEMA = {
  type: 'string', enum: ['memory', 'event', 'cadence'],
} as const;
const RELATIONSHIP_CORRECT_SCHEMA = {
  type: 'object',
  properties: {
    recordType: RELATIONSHIP_RECORD_TYPE_SCHEMA,
    recordId: { type: 'string', minLength: 1 },
    expectedUpdatedAt: { type: 'string', format: 'date-time' },
    fields: {
      type: 'object', additionalProperties: false,
      properties: {
        kind: { type: 'string', enum: [
          'preference', 'constraint', 'note', 'sensitivity', 'milestone',
          'birthday', 'gathering', 'deadline', 'post_event', 'other',
          'drift', 'recurring_followup',
        ] },
        text: { type: 'string', minLength: 1, maxLength: 5000 },
        title: { type: 'string', minLength: 1, maxLength: 500 },
        dateText: { type: ['string', 'null'], maxLength: 160 },
        startsAt: { type: ['string', 'null'], format: 'date-time' },
        timeZone: { type: ['string', 'null'], maxLength: 100 },
        intervalDays: { type: 'integer', minimum: 1, maximum: 730 },
        nextDueAt: { type: ['string', 'null'], format: 'date-time' },
      },
    },
  },
  required: ['recordType', 'recordId', 'expectedUpdatedAt', 'fields'],
  additionalProperties: false,
} as const;
const RELATIONSHIP_FORGET_SCHEMA = {
  type: 'object',
  properties: {
    recordType: { type: 'string', enum: ['memory', 'event', 'cadence'] },
    recordId: { type: 'string', minLength: 1 },
    expectedUpdatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['recordType', 'recordId', 'expectedUpdatedAt'],
  additionalProperties: false,
} as const;

export const UNIFIED_CHAT_TOOL_CATALOG: readonly AgentToolDefinition[] = [
  {
    id: 'relationships.read', version: 1, capabilityId: 'relationships',
    purpose: 'Read bounded owner-scoped People, relationship memories, personal events, and follow-up cadences.',
    providers: ['server'], effect: 'read', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: false, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'relationships.remember', version: 1, capabilityId: 'relationships',
    purpose: 'Save explicitly stated facts, dates, or follow-up cadence for one named person with an authoritative receipt.',
    providers: ['server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: false, inputSchema: RELATIONSHIP_MEMORY_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'relationships.correct', version: 1, capabilityId: 'relationships',
    purpose: 'Correct explicit fields on one identified relationship memory, event, or cadence using its current version and retain exact receipt undo.',
    providers: ['server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: false, inputSchema: RELATIONSHIP_CORRECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'relationships.forget', version: 1, capabilityId: 'relationships',
    purpose: 'Forget one identified relationship memory, event, or cadence using its current version and retain exact receipt undo.',
    providers: ['server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: false, inputSchema: RELATIONSHIP_FORGET_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'screen_time.configure', version: 1, capabilityId: 'screenTime',
    purpose: 'Interpret one child, app, and allow-or-block intent, then open native Screen Time review without claiming it was applied.',
    providers: ['device'], effect: 'write', consequence: 'consequential', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object',
      properties: {
        childName: { type: 'string', minLength: 1, maxLength: 160 },
        appName: { type: 'string', minLength: 1, maxLength: 160 },
        desiredAccess: { type: 'string', enum: ['allow', 'block'] },
      },
      required: ['childName', 'appName', 'desiredAccess'],
      additionalProperties: false,
    },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'notifications.configure', version: 1, capabilityId: 'notifications',
    purpose: 'Open native notification settings and system authorization review.',
    providers: ['device'], effect: 'write', consequence: 'consequential', reversible: true,
    confirmation: 'explicit', canDeferToClient: true, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'navigation.search.open', version: 1, capabilityId: 'navigation',
    purpose: 'Open Kwilt native search.', providers: ['device'], effect: 'write', consequence: 'low',
    reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'navigation.account_settings.open', version: 1, capabilityId: 'account',
    purpose: 'Open native account settings.', providers: ['device'], effect: 'write', consequence: 'low',
    reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'account.subscription.open', version: 1, capabilityId: 'account',
    purpose: 'Open subscription management without claiming billing changed.',
    providers: ['device'], effect: 'write', consequence: 'consequential', reversible: true,
    confirmation: 'explicit', canDeferToClient: true, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'account.delete.open', version: 1, capabilityId: 'account',
    purpose: 'Open the native account deletion consequence and confirmation flow; never delete directly.',
    providers: ['device'], effect: 'write', consequence: 'consequential', reversible: false,
    confirmation: 'explicit', canDeferToClient: true, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.open_focus', version: 1, capabilityId: 'todos',
    purpose: 'Open the native Focus sheet for one identified Activity; opening is not proof a timer started.',
    providers: ['device'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { activityId: { type: 'string', minLength: 1 } },
      required: ['activityId'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.location.update', version: 1, capabilityId: 'todos',
    purpose: 'Open the Activity detail location editor and native location-permission review.',
    providers: ['device'], effect: 'write', consequence: 'consequential', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { activityId: { type: 'string', minLength: 1 } },
      required: ['activityId'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.attachments.open', version: 1, capabilityId: 'todos',
    purpose: 'Open one Activity for native attachment selection.', providers: ['device'], effect: 'write',
    consequence: 'consequential', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { activityId: { type: 'string', minLength: 1 } },
      required: ['activityId'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.share.open', version: 1, capabilityId: 'todos',
    purpose: 'Open one Activity for native audience and sharing review.', providers: ['device'], effect: 'write',
    consequence: 'consequential', reversible: false, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { activityId: { type: 'string', minLength: 1 } },
      required: ['activityId'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'goals.share.open', version: 1, capabilityId: 'goals',
    purpose: 'Open one Goal for native audience, invitation, and visibility review.',
    providers: ['device'], effect: 'write', consequence: 'consequential', reversible: false,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { goalId: { type: 'string', minLength: 1 } },
      required: ['goalId'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'goals.check_in', version: 1, capabilityId: 'goals',
    purpose: 'Prepare one Goal check-in draft and open the native audience-aware approval sheet without sending it.',
    providers: ['device'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        goalId: { type: 'string', minLength: 1 },
        text: { type: 'string', minLength: 1, maxLength: 2000 },
      }, required: ['goalId', 'text'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'plan.preferences.open', version: 1, capabilityId: 'plan',
    purpose: 'Open native availability and calendar preference settings only when the user explicitly asks to open or manage those settings; never use this to answer a Plan recommendation or placement request.',
    providers: ['device'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'profile.read', version: 1, capabilityId: 'profile',
    purpose: 'Read the bounded display name and age range in the current user coaching profile.',
    providers: ['device', 'server'], effect: 'read', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: true, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'account.show_up_status', version: 1, capabilityId: 'account',
    purpose: 'Read the current authoritative Kwilt show-up streak and repair status.',
    providers: ['device', 'server'], effect: 'read', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: true, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'profile.update', version: 1, capabilityId: 'profile',
    purpose: 'Update an explicitly requested display name or age range after review.',
    providers: ['device', 'server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        fields: { type: 'object', properties: PROFILE_FIELD_PROPERTIES, additionalProperties: false },
      }, required: ['fields'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'arcs.read', version: 1, capabilityId: 'arcs',
    purpose: 'Read bounded identity Arcs owned by the current user.', providers: ['device', 'server'],
    effect: 'read', consequence: 'low', reversible: true, confirmation: 'none', canDeferToClient: true,
    inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'chapters.note.update', version: 1, capabilityId: 'chapters',
    purpose: 'Add, replace, or clear the user-authored note on one identified Chapter.',
    providers: ['server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        chapterId: { type: 'string', minLength: 1 },
        note: { type: ['string', 'null'], maxLength: 500 },
      }, required: ['chapterId', 'note'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'arcs.create', version: 1, capabilityId: 'arcs',
    purpose: 'Create one explicitly reviewed identity Arc.', providers: ['device', 'server'],
    effect: 'write', consequence: 'consequential', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: ARC_FIELD_PROPERTIES, required: ['name'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'arcs.update', version: 1, capabilityId: 'arcs',
    purpose: 'Update explicit fields on one identified Arc.', providers: ['device', 'server'],
    effect: 'write', consequence: 'consequential', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        arcId: { type: 'string', minLength: 1 },
        fields: { type: 'object', properties: ARC_FIELD_PROPERTIES, additionalProperties: false },
      }, required: ['arcId', 'fields'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'arcs.delete', version: 1, capabilityId: 'arcs',
    purpose: 'Delete one identified Arc and its Goal and Activity dependency graph after explicit review.',
    providers: ['device', 'server'], effect: 'write', consequence: 'consequential', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { arcId: { type: 'string', minLength: 1 } },
      required: ['arcId'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'goals.read',
    version: 1,
    capabilityId: 'goals',
    purpose: 'Read bounded Goals owned by the current user.',
    providers: ['device', 'server'], effect: 'read', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: true, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'goals.update', version: 1, capabilityId: 'goals',
    purpose: 'Update explicit fields on one identified Goal.', providers: ['device', 'server'],
    effect: 'write', consequence: 'low', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        goalId: { type: 'string', minLength: 1 },
        fields: { type: 'object', properties: GOAL_FIELD_PROPERTIES, additionalProperties: false },
      }, required: ['goalId', 'fields'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'goals.create', version: 1, capabilityId: 'goals',
    purpose: 'Create one explicit Goal draft, optionally linked to an existing Arc.', providers: ['device', 'server'],
    effect: 'write', consequence: 'consequential', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: GOAL_CREATE_PROPERTIES, required: ['title'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'goals.delete', version: 1, capabilityId: 'goals',
    purpose: 'Delete one identified Goal and its dependent Activities after explicit review.', providers: ['device', 'server'],
    effect: 'write', consequence: 'consequential', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { goalId: { type: 'string', minLength: 1 } },
      required: ['goalId'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.read',
    version: 1,
    capabilityId: 'todos',
    purpose: 'Read bounded Activities and stable step metadata owned by the current user.',
    providers: ['device', 'server'], effect: 'read', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: true, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'chapters.read',
    version: 1,
    capabilityId: 'chapters',
    purpose: 'Read bounded Chapter narratives and the current user private note.',
    providers: ['server'], effect: 'read', consequence: 'low', reversible: true,
    confirmation: 'none', canDeferToClient: false, inputSchema: OBJECT_SCHEMA, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'plan.read_day_context',
    version: 1,
    capabilityId: 'plan',
    purpose: 'Read bounded Activities, Goals, availability, and calendar constraints for one day.',
    providers: ['device', 'server'],
    effect: 'read',
    consequence: 'low',
    reversible: true,
    confirmation: 'none',
    canDeferToClient: true,
    inputSchema: PLAN_DAY_SCHEMA,
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'plan.recommend_day',
    version: 1,
    capabilityId: 'plan',
    purpose: 'Recommend a bounded set of Activities and feasible placements for one day.',
    providers: ['device', 'server'],
    effect: 'read',
    consequence: 'low',
    reversible: true,
    confirmation: 'none',
    canDeferToClient: true,
    inputSchema: PLAN_DAY_SCHEMA,
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.capture',
    version: 1,
    capabilityId: 'todos',
    purpose: 'Capture one explicit low-risk Activity.',
    providers: ['device', 'server'],
    effect: 'write',
    consequence: 'low',
    reversible: true,
    confirmation: 'none',
    canDeferToClient: true,
    inputSchema: ACTIVITY_CAPTURE_SCHEMA,
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.update',
    version: 1,
    capabilityId: 'todos',
    purpose: 'Update fields on one identified Activity.',
    providers: ['device', 'server'],
    effect: 'write',
    consequence: 'low',
    reversible: true,
    confirmation: 'explicit',
    canDeferToClient: true,
    inputSchema: ACTIVITY_UPDATE_SCHEMA,
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.focus_today', version: 1, capabilityId: 'todos',
    purpose: "Schedule one identified Activity for today's focus as a soft, reversible Plan signal.",
    providers: ['device', 'server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { activityId: { type: 'string', minLength: 1 } },
      required: ['activityId'], additionalProperties: false,
    },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.delete', version: 1, capabilityId: 'todos',
    purpose: 'Delete one identified Activity after explicit review.', providers: ['device', 'server'],
    effect: 'write', consequence: 'consequential', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { activityId: { type: 'string', minLength: 1 } },
      required: ['activityId'], additionalProperties: false,
    },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.steps.create', version: 1, capabilityId: 'todos',
    purpose: 'Add one stable step to an identified Activity.', providers: ['device', 'server'],
    effect: 'write', consequence: 'low', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: { type: 'object', properties: { activityId: STEP_TARGET_PROPERTIES.activityId, title: { type: 'string', minLength: 1, maxLength: 240 }, optional: { type: 'boolean' } }, required: ['activityId', 'title'], additionalProperties: false },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.steps.update', version: 1, capabilityId: 'todos',
    purpose: 'Update the title or optional state of one stable Activity step.', providers: ['device', 'server'],
    effect: 'write', consequence: 'low', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: { type: 'object', properties: { ...STEP_TARGET_PROPERTIES, title: { type: 'string', minLength: 1, maxLength: 240 }, optional: { type: 'boolean' } }, required: ['activityId', 'stepId'], additionalProperties: false },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.steps.complete', version: 1, capabilityId: 'todos',
    purpose: 'Mark one stable Activity step complete or incomplete.', providers: ['device', 'server'],
    effect: 'write', consequence: 'low', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: { type: 'object', properties: { ...STEP_TARGET_PROPERTIES, completed: { type: 'boolean' } }, required: ['activityId', 'stepId', 'completed'], additionalProperties: false },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.steps.delete', version: 1, capabilityId: 'todos',
    purpose: 'Delete one stable Activity step.', providers: ['device', 'server'],
    effect: 'write', consequence: 'low', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: { type: 'object', properties: STEP_TARGET_PROPERTIES, required: ['activityId', 'stepId'], additionalProperties: false },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.steps.reorder', version: 1, capabilityId: 'todos',
    purpose: 'Reorder stable Activity step ids; omitted steps retain their relative order at the end.', providers: ['device', 'server'],
    effect: 'write', consequence: 'low', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: { type: 'object', properties: { activityId: STEP_TARGET_PROPERTIES.activityId, stepIds: { type: 'array', items: { type: 'string' }, maxItems: 24 } }, required: ['activityId', 'stepIds'], additionalProperties: false },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.reminder.update', version: 1, capabilityId: 'todos',
    purpose: 'Set or clear the reminder time for one identified Activity.', providers: ['device', 'server'],
    effect: 'write', consequence: 'low', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        activityId: { type: 'string', minLength: 1 },
        reminderAt: { type: ['string', 'null'], format: 'date-time' },
      }, required: ['activityId', 'reminderAt'], additionalProperties: false,
    },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'activities.repeat.update', version: 1, capabilityId: 'todos',
    purpose: 'Set or clear the recurrence rule for one identified Activity.', providers: ['device', 'server'],
    effect: 'write', consequence: 'low', reversible: true, confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        activityId: { type: 'string', minLength: 1 },
        repeatRule: { type: ['string', 'null'], enum: ['daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom', null] },
        repeatCustom: ACTIVITY_FIELD_PROPERTIES.repeatCustom,
        repeatBasis: { type: 'string', enum: ['scheduled', 'after_completion'] },
      }, required: ['activityId', 'repeatRule'], additionalProperties: false,
    },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'plan.schedule_activity',
    version: 1,
    capabilityId: 'plan',
    purpose: 'Schedule one identified Activity in the authoritative Plan calendar.',
    providers: ['connector', 'server'],
    effect: 'write',
    consequence: 'low',
    reversible: true,
    confirmation: 'explicit',
    canDeferToClient: true,
    inputSchema: {
      type: 'object',
      properties: {
        activityId: { type: 'string', minLength: 1 },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        targetDateKey: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      },
      required: ['activityId', 'startDate', 'endDate', 'targetDateKey'],
      additionalProperties: false,
    },
    outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'plan.schedule_chunks', version: 1, capabilityId: 'plan',
    purpose: 'Split one identified Activity into two to ten reviewed calendar blocks with independent receipts and undo.',
    providers: ['connector', 'server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        activityId: { type: 'string', minLength: 1 },
        chunks: {
          type: 'array', minItems: 2, maxItems: 10,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              title: { type: 'string', minLength: 1, maxLength: 160 },
              startDate: { type: 'string', format: 'date-time' },
              endDate: { type: 'string', format: 'date-time' },
              targetDateKey: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            },
            required: ['title', 'startDate', 'endDate', 'targetDateKey'],
          },
        },
      }, required: ['activityId', 'chunks'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'plan.reschedule_activity', version: 1, capabilityId: 'plan',
    purpose: 'Move one managed Plan calendar block to a reviewed time.',
    providers: ['connector', 'server'], effect: 'write', consequence: 'low', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: {
        activityId: { type: 'string', minLength: 1 },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        targetDateKey: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      }, required: ['activityId', 'startDate', 'endDate', 'targetDateKey'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
  {
    id: 'plan.remove_activity', version: 1, capabilityId: 'plan',
    purpose: 'Remove one managed calendar block from Plan after explicit review.',
    providers: ['connector', 'server'], effect: 'write', consequence: 'consequential', reversible: true,
    confirmation: 'explicit', canDeferToClient: true,
    inputSchema: {
      type: 'object', properties: { activityId: { type: 'string', minLength: 1 } },
      required: ['activityId'], additionalProperties: false,
    }, outputSchema: OBJECT_SCHEMA,
  },
];
