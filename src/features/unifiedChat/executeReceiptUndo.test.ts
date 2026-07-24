import type { Activity, Arc, Goal, UserProfile } from '../../domain/types';
import type { ChapterRow } from '../../services/chapters';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { executeReceiptUndo } from './executeReceiptUndo';

test('undoes the authoritative Activity before marking receipt and proposal undone', async () => {
  const order: string[] = [];
  const before: Activity = {
    id: 'activity-1', goalId: null, title: 'Library', type: 'task', tags: [], status: 'planned',
    forceActual: {}, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-21T00:00:00.000Z',
  };
  let activities: Activity[] = [{ ...before, scheduledDate: '2026-07-25', updatedAt: '2026-07-22T13:00:00.000Z' }];
  const store = {
    getActivities: () => activities,
    getGoals: () => [] as Goal[],
    addActivity: jest.fn(),
    updateActivity: jest.fn((id: string, updater: (item: Activity) => Activity) => {
      order.push('store:undo'); activities = activities.map((item) => item.id === id ? updater(item) : item);
    }),
    removeActivity: jest.fn(),
  };
  const proposal = {
    id: 'proposal-1', status: 'applied', version: 4,
  } as UnifiedChatProposal;
  const receipt: UnifiedChatMutationReceipt = {
    id: 'receipt-1', proposalId: 'proposal-1', operationId: 'operation-1', capabilityId: 'todos',
    idempotencyKey: 'run-1:1', status: 'applied', resultingObjectType: 'activity', resultingObjectId: 'activity-1',
    resultState: { title: 'Library', status: 'planned', goalId: null, scheduledDate: '2026-07-25', updatedAt: '2026-07-22T13:00:00.000Z' },
    returnTarget: { capabilityId: 'todos', object: { type: 'activity', id: 'activity-1' }, label: 'Library', route: { name: 'MainTabs', params: {} } },
    undoOperation: { type: 'restore_activity', activity: before, expectedUpdatedAt: '2026-07-22T13:00:00.000Z' },
    canUndo: true, appliedAt: '2026-07-22T13:00:00.000Z', undoneAt: null,
  };
  const repository = {
    markMutationReceiptUndone: jest.fn(async () => { order.push('receipt:undone'); }),
    transitionProposalStatus: jest.fn(async () => { order.push('proposal:undone'); }),
  };

  await executeReceiptUndo({ receipt, proposal, repository, store, now: () => '2026-07-22T14:00:00.000Z' });
  expect(order).toEqual(['store:undo', 'receipt:undone', 'proposal:undone']);
  expect(activities[0]).toMatchObject({ updatedAt: '2026-07-22T14:00:00.000Z' });
  expect(activities[0]?.scheduledDate).toBeUndefined();
});

test('undoes a Plan calendar mutation before marking its durable records undone', async () => {
  const before: Activity = {
    id: 'activity-plan', goalId: null, title: 'School call', type: 'task', tags: [], status: 'planned',
    forceActual: {}, createdAt: 'before', updatedAt: 'before',
  };
  let activities: Activity[] = [{
    ...before, scheduledAt: '2026-07-24T15:00:00.000Z', updatedAt: 'applied',
    calendarBinding: {
      kind: 'provider', provider: 'google', accountId: 'account-1', calendarId: 'primary',
      eventId: 'event-1', createdBy: 'plan',
    },
  }];
  const planStore = {
    getActivities: () => activities,
    updateActivity: jest.fn((id: string, updater: (item: Activity) => Activity) => {
      activities = activities.map((item) => item.id === id ? updater(item) : item);
    }),
    addDailyPlanCommitment: jest.fn(), removeDailyPlanCommitment: jest.fn(),
  };
  const proposal = { id: 'proposal-plan', capabilityId: 'plan', status: 'applied', version: 3 } as UnifiedChatProposal;
  const receipt: UnifiedChatMutationReceipt = {
    id: 'receipt-plan', proposalId: proposal.id, operationId: 'operation-plan', capabilityId: 'plan',
    idempotencyKey: 'plan-1', status: 'applied', resultingObjectType: 'activity', resultingObjectId: before.id,
    resultState: {
      title: before.title, scheduledAt: '2026-07-24T15:00:00.000Z', targetDateKey: '2026-07-24',
      eventId: 'event-1', provider: 'google', accountId: 'account-1', calendarId: 'primary', updatedAt: 'applied',
    },
    returnTarget: {},
    undoOperation: {
      type: 'delete_created_plan_event', previousActivity: before,
      eventRef: { provider: 'google', accountId: 'account-1', calendarId: 'primary', eventId: 'event-1' },
      targetDateKey: '2026-07-24', expectedUpdatedAt: 'applied',
    },
    canUndo: true, appliedAt: 'applied', undoneAt: null,
  };
  const repository = {
    markMutationReceiptUndone: jest.fn(async () => undefined),
    transitionProposalStatus: jest.fn(async () => undefined),
  };
  const planCalendar = {
    resolveBeforeCreate: jest.fn(), createEvent: jest.fn(), resolveAfterCreate: jest.fn(),
    moveEvent: jest.fn(), deleteEvent: jest.fn(async () => undefined),
  };
  const activityStore = {
    getActivities: () => activities, getGoals: () => [] as Goal[], addActivity: jest.fn(),
    updateActivity: planStore.updateActivity, removeActivity: jest.fn(),
  };

  await executeReceiptUndo({
    receipt, proposal, repository, store: activityStore, planStore, planCalendar,
    now: () => 'undone',
  });
  expect(planCalendar.deleteEvent).toHaveBeenCalled();
  expect(activities[0]).toMatchObject({ updatedAt: 'undone' });
  expect(activities[0].scheduledAt).toBeUndefined();
  expect(repository.markMutationReceiptUndone).toHaveBeenCalledWith('receipt-plan', 'undone');
});

test('undoes an Arc mutation before marking its durable records undone', async () => {
  const before: Arc = { id: 'arc-1', name: 'Present parent', status: 'active', createdAt: 'before', updatedAt: 'before' };
  let arcs: Arc[] = [{ ...before, name: 'Steady parent', updatedAt: 'applied' }];
  const proposal = {
    id: 'proposal-arc', capabilityId: 'arcs', status: 'applied', version: 4,
    operation: {
      id: 'operation-arc', proposalId: 'proposal-arc', capabilityId: 'arcs', type: 'update_arc',
      targetId: before.id, summary: 'Update Arc', idempotencyKey: 'arc-1', sequence: 1,
      payload: { name: 'Steady parent', expectedUpdatedAt: before.updatedAt },
    },
  } as UnifiedChatProposal;
  const receipt: UnifiedChatMutationReceipt = {
    id: 'receipt-arc', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'arcs', idempotencyKey: 'arc-1', status: 'applied',
    resultingObjectType: 'arc', resultingObjectId: before.id,
    resultState: { name: 'Steady parent', status: 'active', updatedAt: 'applied' },
    returnTarget: {}, undoOperation: { type: 'restore_arc', arc: before, expectedUpdatedAt: 'applied' },
    canUndo: true, appliedAt: 'applied', undoneAt: null,
  };
  const repository = {
    markMutationReceiptUndone: jest.fn(async () => undefined),
    transitionProposalStatus: jest.fn(async () => undefined),
  };
  const arcStore = {
    getArcs: () => arcs, getGoals: () => [] as Goal[], getActivities: () => [] as Activity[],
    getGoalRecommendations: () => [], getIsPro: () => true, addArc: jest.fn(),
    updateArc: jest.fn((id: string, updater: (arc: Arc) => Arc) => {
      arcs = arcs.map((arc) => arc.id === id ? updater(arc) : arc);
    }),
    removeArc: jest.fn(), restoreRemovedArc: jest.fn(),
  };
  const activityStore = {
    getActivities: () => [] as Activity[], getGoals: () => [] as Goal[], addActivity: jest.fn(),
    updateActivity: jest.fn(), removeActivity: jest.fn(),
  };

  await executeReceiptUndo({
    receipt, proposal, repository, store: activityStore, arcStore, now: () => 'undone',
  });
  expect(arcs).toEqual([{ ...before, updatedAt: 'undone' }]);
  expect(repository.markMutationReceiptUndone).toHaveBeenCalledWith(receipt.id, 'undone');
  expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'undone' }));
});

test('undoes a Profile mutation before marking its durable records undone', async () => {
  const before: UserProfile = {
    id: 'profile-1', fullName: 'Andrew', createdAt: 'before', updatedAt: 'before',
    communication: {}, visuals: {},
  };
  let profile: UserProfile = { ...before, fullName: 'Andy', updatedAt: 'applied' };
  const proposal = {
    id: 'proposal-profile', capabilityId: 'profile', status: 'applied', version: 4,
    operation: {
      id: 'operation-profile', proposalId: 'proposal-profile', capabilityId: 'profile', type: 'update_profile',
      targetId: before.id, summary: 'Update Profile', idempotencyKey: 'profile-1', sequence: 1,
      payload: { fullName: 'Andy', expectedUpdatedAt: before.updatedAt },
    },
  } as UnifiedChatProposal;
  const receipt: UnifiedChatMutationReceipt = {
    id: 'receipt-profile', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'profile', idempotencyKey: 'profile-1', status: 'applied',
    resultingObjectType: 'profile', resultingObjectId: before.id,
    resultState: { fullName: 'Andy', ageRange: null, updatedAt: 'applied' }, returnTarget: {},
    undoOperation: { type: 'restore_profile', profile: before, expectedUpdatedAt: 'applied' },
    canUndo: true, appliedAt: 'applied', undoneAt: null,
  };
  const repository = {
    markMutationReceiptUndone: jest.fn(async () => undefined),
    transitionProposalStatus: jest.fn(async () => undefined),
  };
  const profileStore = {
    getProfile: () => profile,
    updateProfileAt: (updater: (current: UserProfile) => UserProfile, updatedAt: string) => {
      profile = { ...updater(profile), updatedAt };
    },
  };
  const activityStore = {
    getActivities: () => [] as Activity[], getGoals: () => [] as Goal[], addActivity: jest.fn(),
    updateActivity: jest.fn(), removeActivity: jest.fn(),
  };

  await executeReceiptUndo({
    receipt, proposal, repository, store: activityStore, profileStore, now: () => 'undone',
  });
  expect(profile).toEqual({ ...before, updatedAt: 'undone' });
  expect(repository.markMutationReceiptUndone).toHaveBeenCalledWith(receipt.id, 'undone');
});

test('undoes a Chapter note through its authoritative service before closing durable records', async () => {
  let chapter: ChapterRow = {
    id: 'chapter-1', user_id: 'user-1', template_id: 'template-1', period_start: '2026-07-13',
    period_end: '2026-07-20', period_key: '2026-W29', input_summary: {}, metrics: {}, output_json: {},
    status: 'ready', error: null, emailed_at: null, user_note: 'Sleep mattered.', user_note_updated_at: 'applied',
    created_at: 'before', updated_at: 'before',
  };
  const proposal = {
    id: 'proposal-chapter', capabilityId: 'chapters', status: 'applied', version: 4,
    operation: {
      id: 'operation-chapter', proposalId: 'proposal-chapter', capabilityId: 'chapters', type: 'update_chapter_note',
      targetId: chapter.id, summary: 'Add a line', idempotencyKey: 'chapter-1', sequence: 1,
      payload: { note: chapter.user_note, expectedUpdatedAt: 'before' },
    },
  } as UnifiedChatProposal;
  const receipt: UnifiedChatMutationReceipt = {
    id: 'receipt-chapter', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'chapters', idempotencyKey: 'chapter-1', status: 'applied',
    resultingObjectType: 'chapter', resultingObjectId: chapter.id,
    resultState: { periodKey: chapter.period_key, note: chapter.user_note, updatedAt: 'applied' }, returnTarget: {},
    undoOperation: {
      type: 'restore_chapter_note', note: null, previousUpdatedAt: 'before',
      desiredNote: chapter.user_note, expectedUpdatedAt: 'applied',
    },
    canUndo: true, appliedAt: 'applied', undoneAt: null,
  };
  const repository = {
    markMutationReceiptUndone: jest.fn(async () => undefined),
    transitionProposalStatus: jest.fn(async () => undefined),
  };
  const chapterStore = {
    getChapter: async () => chapter,
    updateNote: jest.fn(async (_id: string, note: string | null) => {
      chapter = { ...chapter, user_note: note, user_note_updated_at: 'undone' };
      return chapter;
    }),
  };
  const activityStore = {
    getActivities: () => [] as Activity[], getGoals: () => [] as Goal[], addActivity: jest.fn(),
    updateActivity: jest.fn(), removeActivity: jest.fn(),
  };

  await executeReceiptUndo({ receipt, proposal, repository, store: activityStore, chapterStore });
  expect(chapter.user_note).toBeNull();
  expect(repository.markMutationReceiptUndone).toHaveBeenCalledWith(receipt.id, 'undone');
});

test('delegates a relationship receipt to its server-owned atomic undo path', async () => {
  const proposal = {
    id: 'proposal-relationship', capabilityId: 'relationships', status: 'applied', version: 1,
  } as UnifiedChatProposal;
  const receipt: UnifiedChatMutationReceipt = {
    id: 'receipt-relationship', proposalId: proposal.id, operationId: 'operation-relationship',
    capabilityId: 'relationships', idempotencyKey: 'relationship-1', status: 'applied',
    resultingObjectType: 'relationship_event', resultingObjectId: 'event-1',
    resultState: { recordType: 'event', recordId: 'event-1' }, returnTarget: {},
    undoOperation: {
      type: 'restore_relationship_record', recordType: 'event', recordId: 'event-1',
      expectedUpdatedAt: '2026-07-23T19:00:00.000Z',
    },
    canUndo: true, appliedAt: '2026-07-23T19:00:00.000Z', undoneAt: null,
  };
  const repository = {
    markMutationReceiptUndone: jest.fn(async () => undefined),
    transitionProposalStatus: jest.fn(async () => undefined),
  };
  const relationshipUndo = jest.fn(async () => ({
    receiptId: receipt.id, proposalId: proposal.id,
    undoneAt: '2026-07-23T20:00:00.000Z', replayed: false,
  }));
  const activityStore = {
    getActivities: () => [] as Activity[], getGoals: () => [] as Goal[], addActivity: jest.fn(),
    updateActivity: jest.fn(), removeActivity: jest.fn(),
  };

  await executeReceiptUndo({
    receipt, proposal, repository, store: activityStore, relationshipUndo,
  });
  expect(relationshipUndo).toHaveBeenCalledWith(receipt.id);
  expect(repository.markMutationReceiptUndone).not.toHaveBeenCalled();
  expect(repository.transitionProposalStatus).not.toHaveBeenCalled();
});
