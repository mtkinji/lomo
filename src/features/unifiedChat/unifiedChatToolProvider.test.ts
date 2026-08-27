import type { Activity, Arc, Goal, UserProfile } from '../../domain/types';
import { createUnifiedChatToolProvider } from './unifiedChatToolProvider';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

const goal: Goal = {
  id: 'goal-1', arcId: null, title: 'Get ready for school', status: 'in_progress',
  forceIntent: {}, metrics: [], createdAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-20T10:00:00.000Z',
};
const activity: Activity = {
  id: 'activity-1', goalId: goal.id, title: 'Call the school', type: 'task', tags: [], status: 'planned',
  steps: [{ id: 'step-1', title: 'Find the number', completedAt: null, orderIndex: 0 }],
  creationSource: 'manual', forceActual: {}, createdAt: '2026-07-20T10:00:00.000Z', updatedAt: '2026-07-22T10:00:00.000Z',
};
const arc: Arc = {
  id: 'arc-school', name: 'Steady parent', narrative: 'I make transitions feel safe.',
  identity: { statement: 'I am a steady parent.', centralInsight: 'Calm preparation creates trust.' },
  status: 'active', createdAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-20T10:00:00.000Z',
};
const profile: UserProfile = {
  id: 'profile-1', fullName: 'Andrew', email: 'private@example.com', ageRange: '35-44',
  createdAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-20T10:00:00.000Z',
  communication: {}, visuals: {},
};
const snapshots = {
  arcs: { arcs: [arc] },
  goals: { goals: [goal] },
  todos: { activities: [activity], goals: [goal] },
  chapters: { chapters: [] },
  profile: { profile },
  account: {
    showUp: {
      lastShowUpDate: '2026-07-23', currentShowUpStreak: 6,
      currentCoveredShowUpStreak: 7, eligibleRepairUntilMs: null,
      observedAt: '2026-07-23T12:00:00.000Z',
    },
  },
  money: {
    periodLabel: 'July 2026', generatedAt: '2026-07-23T18:00:00.000Z', lastSyncedAt: '2026-07-23T17:00:00.000Z',
    totals: { plannedCents: 80000, spentCents: 10000, remainingCents: 70000, needsReviewCount: 1 },
    forecast: {
      projectedSpendCents: 45000, projectionRangeLowCents: 40000, projectionRangeHighCents: 50000,
      projectedRemainingCents: 35000, projectedOverageCents: 0, confidence: 'medium' as const, atRiskCategoryCount: 0,
    },
    outsidePlan: { spentCents: 2500, transactionCount: 1 },
    categories: [{
      id: 'groceries', sourceId: 'category-uuid', name: 'Groceries', description: null, accentColor: '#315545',
      plannedCents: 60000, spentCents: 10000, remainingCents: 50000, percentUsed: 17,
      transactionCount: 1, rolloverEnabled: false,
      fundingRhythm: 'monthly' as const, fundingPolicyVersion: null, starterWeight: 0,
      monthlyContributionCents: 60000, reserveAvailableCents: 0, reserveBalanceCents: 0,
      reserveBalancePeriodId: null, reserveAvailabilityKnown: true,
      expectedNeed: null, fundingCoverage: { status: 'none' as const },
      forecast: {
        mode: 'paced' as const, claim: 'monthly_range' as const, confidence: 'medium' as const, expectedSpendCents: 20000,
        projectedSpendCents: 30000, projectionRangeLowCents: 27000,
        projectionRangeHighCents: 33000, projectedRemainingCents: 30000,
        projectedOverageCents: 0, status: 'steady' as const,
      },
    }],
    accounts: [{
      id: 'account-1', name: 'Private checking', institutionName: 'Private Bank', mask: '1042', type: 'depository', subtype: 'checking',
      status: 'healthy' as const, lastSyncedAt: '2026-07-23T17:00:00.000Z', transactionCount: 1, latestTransactionDate: '2026-07-20',
    }],
    transactions: [{
      id: 'transaction-private', accountId: 'account-1', accountName: 'Private checking', institutionName: 'Private Bank',
      merchantName: 'Private merchant', amountCents: 10000, direction: 'outflow' as const, date: '2026-07-20', pending: false,
      currencyCode: 'USD', categoryId: 'groceries', categoryName: 'Groceries', reviewState: 'assigned' as const, moneyMeaning: null,
    }],
    livingLimitAnswer: {
      state: 'supported' as const, headlineAmountCents: 34296, qualification: null, recoveryAction: null,
      reviewTransactionIds: [], limitLine: { livingPercent: 70, livingLimitCents: 350000 },
      facts: {
        periodId: '2026-07', planVersionId: 'private-plan-version', policyVersion: 'money-plan-limit-v3' as const,
        resourceBasisCents: 500000, resourceBasisKind: 'detected_income' as const,
        resourceBasisUpdatedAtIso: '2026-07-23T17:00:00.000Z', livingPercent: 70,
        livingLimitCents: 350000, protectedPlanCents: 200000, protectedOverageCents: 0, flexibleCapacityCents: 150000,
        countedFlexibleSpendCents: 115704, flexibleRoomCents: 34296, flexibleRoomLowCents: 34296,
        flexibleRoomHighCents: 34296, unresolvedInScopeCents: 0, plannedCents: 350000,
        unassignedCents: 0, overLimitCents: 0, freshness: 'fresh' as const,
        confidence: 'supported' as const, qualificationReason: null,
      },
    },
  },
};

const tool = (id: string) => {
  const value = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id);
  if (!value) throw new Error(`Missing test tool ${id}`);
  return value;
};

describe('createUnifiedChatToolProvider', () => {
  it('reads only bounded Money aggregates without account or merchant details', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const result = await provider.execute(
      { id: 'money-read', toolId: 'money.read', arguments: {} }, tool('money.read'),
    );
    expect(result).toEqual({
      status: 'completed', receipt: null,
      output: {
        money: {
          periodLabel: 'July 2026', lastSyncedAt: '2026-07-23T17:00:00.000Z',
          totals: snapshots.money.totals,
          forecast: snapshots.money.forecast,
          outsidePlan: snapshots.money.outsidePlan,
          categories: [{
            id: 'category-uuid', name: 'Groceries', plannedCents: 60000, spentCents: 10000,
            remainingCents: 50000, percentUsed: 17, transactionCount: 1,
            forecast: snapshots.money.categories[0].forecast,
          }],
          accountCount: 1,
          planLimit: {
            state: 'supported', livingPercent: 70, incomeBasisCents: 500000,
            livingLimitCents: 350000, plannedCents: 350000, flexibleRoomCents: 34296,
            confidence: 'supported', freshness: 'fresh', observedAt: '2026-07-23T17:00:00.000Z',
            answer: '$342.96 left for flexible spending this month · $1,157.04 of $1,500 used',
            returnTarget: { name: 'Money', params: { screen: 'MoneySummary' } },
          },
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain('Private merchant');
    expect(JSON.stringify(result)).not.toContain('Private checking');
    expect(JSON.stringify(result)).not.toContain('private-plan-version');
  });

  it('stages reviewed Money category creation and name-only emoji changes', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });

    await expect(provider.execute({
      id: 'money-create', toolId: 'money.category.create',
      arguments: { name: '✈️ Travel', budgetCents: 0 },
    }, tool('money.category.create'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    await expect(provider.execute({
      id: 'money-rename', toolId: 'money.category.rename',
      arguments: { categoryId: 'category-uuid', name: '🛒 Groceries' },
    }, tool('money.category.rename'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));

    expect(provider.proposals()).toEqual([
      expect.objectContaining({
        capabilityId: 'money',
        operation: { type: 'create_money_category', targetId: null, payload: { name: '✈️ Travel', budgetCents: 0 } },
      }),
      expect.objectContaining({
        capabilityId: 'money',
        operation: {
          type: 'rename_money_category', targetId: 'category-uuid',
          payload: { name: '🛒 Groceries', expectedName: 'Groceries' },
        },
      }),
    ]);
  });

  it('returns a direct truthful Money refusal when the income basis is unavailable', async () => {
    const unavailable = {
      ...snapshots.money.livingLimitAnswer,
      state: 'missing_income_basis' as const,
      headlineAmountCents: null,
      limitLine: null,
      recoveryAction: 'review_income' as const,
      facts: {
        ...snapshots.money.livingLimitAnswer.facts,
        resourceBasisCents: null,
        resourceBasisKind: 'unknown' as const,
        livingLimitCents: null,
        protectedPlanCents: null,
        flexibleCapacityCents: null,
        countedFlexibleSpendCents: null,
        flexibleRoomCents: null,
        flexibleRoomLowCents: null,
        flexibleRoomHighCents: null,
        confidence: 'qualified' as const,
        qualificationReason: 'missing_provenance' as const,
      },
    };
    const provider = createUnifiedChatToolProvider({
      snapshots: { ...snapshots, money: { ...snapshots.money, livingLimitAnswer: unavailable } },
    });

    const result = await provider.execute(
      { id: 'money-read-unavailable', toolId: 'money.read', arguments: {} }, tool('money.read'),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('Finish your monthly plan');
    expect(serialized).toContain('Add your monthly income so Kwilt can calculate flexible money');
    expect(serialized).not.toContain('$0');
    expect(serialized).not.toContain('"livingPercent":0');
  });

  it('delegates relationship reads and writes to the shared authenticated provider', async () => {
    const executeRelationshipTool = jest.fn(async () => ({
      status: 'completed' as const,
      output: { people: [{ id: 'person-1', displayName: 'Lily' }] },
      receipt: null,
    }));
    const provider = createUnifiedChatToolProvider({ snapshots, executeRelationshipTool });

    await expect(provider.execute(
      { id: 'relationships-read', toolId: 'relationships.read', arguments: {} },
      tool('relationships.read'),
    )).resolves.toMatchObject({ status: 'completed' });
    expect(executeRelationshipTool).toHaveBeenCalledWith(
      { id: 'relationships-read', toolId: 'relationships.read', arguments: {} },
      tool('relationships.read'),
    );
  });

  it('delegates Household reads to the authenticated native provider', async () => {
    const executeHouseholdTool = jest.fn(async () => ({
      status: 'completed' as const,
      output: { household: { members: [] } },
      receipt: null,
    }));
    const provider = createUnifiedChatToolProvider({ snapshots, executeHouseholdTool });

    await expect(provider.execute(
      { id: 'household-read', toolId: 'household.read', arguments: {} },
      tool('household.read'),
    )).resolves.toMatchObject({ status: 'completed' });
    expect(executeHouseholdTool).toHaveBeenCalledWith(
      { id: 'household-read', toolId: 'household.read', arguments: {} },
      tool('household.read'),
    );
  });

  it('applies shared consequence policy before a direct relationship provider can mutate', async () => {
    const executeRelationshipTool = jest.fn(async () => ({
      status: 'completed' as const, output: {}, receipt: null,
    }));
    const provider = createUnifiedChatToolProvider({ snapshots, executeRelationshipTool });
    const remember = tool('relationships.remember');

    await expect(provider.execute(
      { id: 'remember', toolId: remember.id, arguments: {} },
      { ...remember, reversible: false },
    )).resolves.toEqual({
      status: 'needs_input',
      prompt: 'This relationship change needs review before Kwilt can apply it.',
      fields: ['confirmation'],
    });
    expect(executeRelationshipTool).not.toHaveBeenCalled();
  });
  it('reads bounded authoritative show-up status without a mutation', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute(
      { id: 'show-up', toolId: 'account.show_up_status', arguments: {} }, tool('account.show_up_status'),
    )).resolves.toEqual({ status: 'completed', receipt: null, output: { showUp: snapshots.account.showUp } });
  });

  it('reads and stages only bounded Profile fields', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute(
      { id: 'profile-read', toolId: 'profile.read', arguments: {} }, tool('profile.read'),
    )).resolves.toEqual({
      status: 'completed', receipt: null,
      output: { profile: {
        id: profile.id, fullName: 'Andrew', ageRange: '35-44', updatedAt: profile.updatedAt,
      } },
    });
    await expect(provider.execute({
      id: 'profile-update', toolId: 'profile.update', arguments: { fields: { fullName: 'Andy' } },
    }, tool('profile.update'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'profile',
      operation: {
        type: 'update_profile', targetId: profile.id, expectedUpdatedAt: profile.updatedAt,
        payload: { fullName: 'Andy' },
      },
    })]);
  });

  it('stages a versioned Chapter note without writing it', async () => {
    const chapter = {
      id: 'chapter-1', user_id: 'user-1', template_id: 'template-1', period_start: '2026-07-13',
      period_end: '2026-07-20', period_key: '2026-W29', input_summary: {}, metrics: {}, output_json: {},
      status: 'ready' as const, error: null, emailed_at: null, user_note: null, user_note_updated_at: null,
      created_at: 'before', updated_at: 'current',
    };
    const provider = createUnifiedChatToolProvider({
      snapshots: { ...snapshots, chapters: { chapters: [chapter] } },
    });
    await expect(provider.execute({
      id: 'chapter-note', toolId: 'chapters.note.update',
      arguments: { chapterId: chapter.id, note: 'Sleep mattered more than I expected.' },
    }, tool('chapters.note.update'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'chapters',
      operation: {
        type: 'update_chapter_note', targetId: chapter.id, expectedUpdatedAt: chapter.updated_at,
        payload: { note: 'Sleep mattered more than I expected.' },
      },
    })]);
    expect(chapter.user_note).toBeNull();
  });
  it('returns a bounded Arc projection without exposing the full identity object', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute(
      { id: 'arc-read', toolId: 'arcs.read', arguments: {} }, tool('arcs.read'),
    )).resolves.toEqual({
      status: 'completed', receipt: null,
      output: { arcs: [{
        id: arc.id, name: arc.name, narrative: arc.narrative,
        identityStatement: arc.identity?.statement, status: arc.status, updatedAt: arc.updatedAt,
      }] },
    });
  });

  it('stages explicit Arc creation and versioned identity updates without applying them', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute({
      id: 'arc-create', toolId: 'arcs.create', arguments: {
        name: 'Curious maker', narrative: 'I learn by making.',
      },
    }, tool('arcs.create'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    await expect(provider.execute({
      id: 'arc-update', toolId: 'arcs.update', arguments: {
        arcId: arc.id, fields: { identityStatement: 'I bring calm to transitions.', status: 'paused' },
      },
    }, tool('arcs.update'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));

    expect(provider.proposals().map((item) => item.operation)).toEqual([
      {
        type: 'create_arc', targetId: null, expectedUpdatedAt: null,
        payload: { name: 'Curious maker', narrative: 'I learn by making.' },
      },
      {
        type: 'update_arc', targetId: arc.id, expectedUpdatedAt: arc.updatedAt,
        payload: { identityStatement: 'I bring calm to transitions.', status: 'paused' },
      },
    ]);
    expect(arc.status).toBe('active');
  });

  it('discloses the full linked graph when staging Arc deletion', async () => {
    const linkedGoal = { ...goal, arcId: arc.id };
    const provider = createUnifiedChatToolProvider({
      snapshots: {
        ...snapshots,
        goals: { goals: [linkedGoal], arcIds: [arc.id] },
        todos: { activities: [activity], goals: [linkedGoal] },
      },
    });
    await expect(provider.execute({
      id: 'arc-delete', toolId: 'arcs.delete', arguments: { arcId: arc.id },
    }, tool('arcs.delete'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'arcs', title: `Delete ${arc.name}`,
      body: 'Deletes this Arc, 1 linked Goal, and 1 linked Activity after review. Undo restores them.',
      operation: { type: 'delete_arc', targetId: arc.id, expectedUpdatedAt: arc.updatedAt, payload: {} },
    })]);
  });
  it('returns bounded stable object and step references for reads', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const result = await provider.execute(
      { id: 'call-1', toolId: 'activities.read', arguments: {} },
      tool('activities.read'),
    );

    expect(result).toEqual({
      status: 'completed',
      receipt: null,
      output: {
        activities: [{
          id: 'activity-1', title: 'Call the school', status: 'planned', goalId: 'goal-1',
          updatedAt: '2026-07-22T10:00:00.000Z',
          reminderAt: null, repeatRule: null, repeatCustom: null, repeatBasis: null,
          steps: [{ id: 'step-1', title: 'Find the number', completed: false, optional: false, order: 0 }],
        }],
      },
    });
  });

  it('stages a versioned Goal update and validates Arc references', async () => {
    const provider = createUnifiedChatToolProvider({
      snapshots: { ...snapshots, goals: { goals: [goal], arcIds: ['arc-school'] } },
    });
    await expect(provider.execute({
      id: 'goal-update', toolId: 'goals.update', arguments: {
        goalId: goal.id, fields: { title: 'Prepare for school', arcId: 'arc-school', priority: 1 },
      },
    }, tool('goals.update'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'goals',
      operation: {
        type: 'update_goal', targetId: goal.id, expectedUpdatedAt: goal.updatedAt,
        payload: { title: 'Prepare for school', arcId: 'arc-school', priority: 1 },
      },
    })]);
  });

  it('stages an explicit Goal draft without inventing an Arc', async () => {
    const provider = createUnifiedChatToolProvider({
      snapshots: { ...snapshots, goals: { goals: [goal], arcIds: ['arc-school'] } },
    });
    await expect(provider.execute({
      id: 'goal-create', toolId: 'goals.create', arguments: {
        title: 'Prepare for the school year', description: 'Make the transition calm.',
      },
    }, tool('goals.create'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'goals',
      operation: {
        type: 'create_goal', targetId: null, expectedUpdatedAt: null,
        payload: { title: 'Prepare for the school year', description: 'Make the transition calm.' },
      },
    })]);
  });

  it('keeps daily follow-through intent on the Goal proposal without inventing a Goal id', async () => {
    const provider = createUnifiedChatToolProvider({
      snapshots: { ...snapshots, goals: { goals: [goal], arcIds: ['arc-school'] } },
    });
    await expect(provider.execute({
      id: 'goal-walk', toolId: 'goals.create', arguments: {
        title: 'Walk every day for the next week',
        targetDate: '2026-07-30T23:59:59.000-06:00',
        followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' },
      },
    }, tool('goals.create'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'goals',
      operation: expect.objectContaining({
        type: 'create_goal', targetId: null,
        payload: expect.objectContaining({
          followUpActivity: { title: 'Go for a walk', repeatRule: 'daily' },
        }),
      }),
    })]);
    expect(provider.proposals()[0]?.operation.payload).not.toHaveProperty('arcId');
  });

  it('discloses linked Activities when staging Goal deletion', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute({
      id: 'goal-delete', toolId: 'goals.delete', arguments: { goalId: goal.id },
    }, tool('goals.delete'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'goals', title: `Delete ${goal.title}`,
      body: 'Deletes this Goal and 1 linked Activity after review. Undo restores them.',
      operation: {
        type: 'delete_goal', targetId: goal.id, expectedUpdatedAt: goal.updatedAt, payload: {},
      },
    })]);
  });

  it('stages an Activity update with the authoritative optimistic version and does not mutate state', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    const result = await provider.execute(
      { id: 'call-2', toolId: 'activities.update', arguments: { activityId: 'activity-1', fields: { title: 'Call school office', priority: 1 } } },
      tool('activities.update'),
    );

    expect(result).toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'todos',
      operation: {
        type: 'update_activity', targetId: 'activity-1', expectedUpdatedAt: activity.updatedAt,
        payload: { title: 'Call school office', priority: 1 },
      },
    })]);
    expect(activity.title).toBe('Call the school');
  });

  it('stages due-date and reminder removal for every overdue Activity selected by the turn', async () => {
    const secondActivity: Activity = {
      ...activity,
      id: 'activity-2',
      title: 'Replace the furnace filter',
      scheduledDate: '2026-07-20',
      reminderAt: '2026-07-20T15:00:00.000Z',
      updatedAt: '2026-07-22T11:00:00.000Z',
    };
    const firstActivity: Activity = {
      ...activity,
      scheduledDate: '2026-07-19',
      reminderAt: '2026-07-19T15:00:00.000Z',
    };
    const provider = createUnifiedChatToolProvider({
      snapshots: {
        ...snapshots,
        todos: { ...snapshots.todos, activities: [firstActivity, secondActivity] },
      },
    });

    for (const item of [firstActivity, secondActivity]) {
      await expect(provider.execute({
        id: `clear-${item.id}`,
        toolId: 'activities.update',
        arguments: {
          activityId: item.id,
          fields: { scheduledDate: null, reminderAt: null },
        },
      }, tool('activities.update'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    }

    expect(provider.proposals()).toEqual([
      expect.objectContaining({
        operation: {
          type: 'update_activity', targetId: firstActivity.id,
          expectedUpdatedAt: firstActivity.updatedAt,
          payload: { scheduledDate: null, reminderAt: null },
        },
      }),
      expect.objectContaining({
        operation: {
          type: 'update_activity', targetId: secondActivity.id,
          expectedUpdatedAt: secondActivity.updatedAt,
          payload: { scheduledDate: null, reminderAt: null },
        },
      }),
    ]);
  });

  it('stages Focus today as the existing reversible scheduled-date update', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute(
      { id: 'focus-today', toolId: 'activities.focus_today', arguments: { activityId: activity.id } },
      tool('activities.focus_today'),
    )).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'todos', title: `Focus on ${activity.title} today`,
      operation: {
        type: 'update_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
        payload: { scheduledDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      },
    })]);
    expect(activity.scheduledDate).toBeUndefined();
  });

  it('stages calendar chunks as grouped per-event Plan proposals', async () => {
    const provider = createUnifiedChatToolProvider({
      snapshots: {
        ...snapshots,
        plan: {
          targetDate: '2026-07-24T12:00:00.000Z', limitation: null, recommendations: [],
          writeCalendarRef: { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' },
        },
      },
    });
    await expect(provider.execute({
      id: 'chunk-call', toolId: 'plan.schedule_chunks', arguments: {
        activityId: activity.id,
        chunks: [
          { title: 'Find the number', startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:20:00.000Z', targetDateKey: '2026-07-24' },
          { title: 'Make the call', startDate: '2026-07-24T16:00:00.000Z', endDate: '2026-07-24T16:30:00.000Z', targetDateKey: '2026-07-24' },
        ],
      },
    }, tool('plan.schedule_chunks'))).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([
      expect.objectContaining({
        capabilityId: 'plan', title: 'Find the number',
        operation: expect.objectContaining({
          type: 'schedule_activity_chunk', targetId: activity.id,
          payload: expect.objectContaining({ groupId: 'plan-chunks:chunk-call', chunkId: 'chunk-1' }),
        }),
      }),
      expect.objectContaining({
        capabilityId: 'plan', title: 'Make the call',
        operation: expect.objectContaining({
          type: 'schedule_activity_chunk',
          payload: expect.objectContaining({ groupId: 'plan-chunks:chunk-call', chunkId: 'chunk-2' }),
        }),
      }),
    ]);
  });

  it('rejects overlapping or underspecified calendar chunks before staging', async () => {
    const provider = createUnifiedChatToolProvider({
      snapshots: {
        ...snapshots,
        plan: {
          targetDate: '2026-07-24T12:00:00.000Z', limitation: null, recommendations: [],
          writeCalendarRef: { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' },
        },
      },
    });
    await expect(provider.execute({
      id: 'bad-chunks', toolId: 'plan.schedule_chunks', arguments: {
        activityId: activity.id,
        chunks: [
          { title: 'One', startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T16:00:00.000Z', targetDateKey: '2026-07-24' },
          { title: 'Two', startDate: '2026-07-24T15:30:00.000Z', endDate: '2026-07-24T16:30:00.000Z', targetDateKey: '2026-07-24' },
        ],
      },
    }, tool('plan.schedule_chunks'))).resolves.toMatchObject({ status: 'failed', code: 'invalid_plan_chunks' });
    expect(provider.proposals()).toEqual([]);
  });

  it('stages explicit capture but rejects invented targets and malformed patches', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute(
      { id: 'call-3', toolId: 'activities.capture', arguments: { title: 'Pack lunch' } },
      tool('activities.capture'),
    )).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    await expect(provider.execute(
      { id: 'call-4', toolId: 'activities.update', arguments: { activityId: 'missing', fields: { title: 'Nope' } } },
      tool('activities.update'),
    )).resolves.toEqual(expect.objectContaining({ status: 'failed', code: 'activity_not_found' }));
    await expect(provider.execute(
      { id: 'call-5', toolId: 'activities.update', arguments: { activityId: 'activity-1', fields: { secret: true } } },
      tool('activities.update'),
    )).resolves.toEqual(expect.objectContaining({ status: 'failed', code: 'invalid_activity_patch' }));
  });

  it('stages an exact, versioned Activity deletion without mutating state', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await expect(provider.execute(
      { id: 'delete', toolId: 'activities.delete', arguments: { activityId: activity.id } },
      tool('activities.delete'),
    )).resolves.toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'todos', title: 'Delete Call the school',
      operation: {
        type: 'delete_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
        payload: {},
      },
    })]);
    expect(snapshots.todos.activities).toContain(activity);
  });

  it('stages stable-id step create, completion, deletion, and reorder operations', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await provider.execute(
      { id: 'step-create', toolId: 'activities.steps.create', arguments: { activityId: 'activity-1', title: 'Call the office', optional: false } },
      tool('activities.steps.create'),
    );
    await provider.execute(
      { id: 'step-complete', toolId: 'activities.steps.complete', arguments: { activityId: 'activity-1', stepId: 'step-1', completed: true } },
      tool('activities.steps.complete'),
    );
    await provider.execute(
      { id: 'step-delete', toolId: 'activities.steps.delete', arguments: { activityId: 'activity-1', stepId: 'step-1' } },
      tool('activities.steps.delete'),
    );
    await provider.execute(
      { id: 'step-reorder', toolId: 'activities.steps.reorder', arguments: { activityId: 'activity-1', stepIds: ['step-1'] } },
      tool('activities.steps.reorder'),
    );

    expect(provider.proposals().map((proposal) => proposal.operation)).toEqual([
      { type: 'create_activity_step', targetId: 'activity-1', expectedUpdatedAt: activity.updatedAt, payload: { title: 'Call the office', isOptional: false } },
      { type: 'complete_activity_step', targetId: 'activity-1', expectedUpdatedAt: activity.updatedAt, payload: { stepId: 'step-1', completed: true } },
      { type: 'delete_activity_step', targetId: 'activity-1', expectedUpdatedAt: activity.updatedAt, payload: { stepId: 'step-1' } },
      { type: 'reorder_activity_steps', targetId: 'activity-1', expectedUpdatedAt: activity.updatedAt, payload: { stepIds: ['step-1'] } },
    ]);
  });

  it('stages reminder and recurrence changes against an authoritative Activity version', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await provider.execute(
      { id: 'reminder', toolId: 'activities.reminder.update', arguments: { activityId: activity.id, reminderAt: '2026-07-30T15:00:00.000Z' } },
      tool('activities.reminder.update'),
    );
    await provider.execute(
      { id: 'repeat', toolId: 'activities.repeat.update', arguments: { activityId: activity.id, repeatRule: 'weekly', repeatBasis: 'scheduled' } },
      tool('activities.repeat.update'),
    );

    expect(provider.proposals().map((proposal) => proposal.operation)).toEqual([
      {
        type: 'update_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
        payload: { reminderAt: '2026-07-30T15:00:00.000Z' },
      },
      {
        type: 'update_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
        payload: { repeatRule: 'weekly', repeatCustom: null, repeatBasis: 'scheduled' },
      },
    ]);
  });

  it('stages recurring reminder fields atomically when capturing a new Activity', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots });
    await provider.execute({
      id: 'capture-trash', toolId: 'activities.capture', arguments: {
        title: 'Take out the trash', reminderAt: '2026-07-29T02:00:00.000Z',
        repeatRule: 'custom', repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2] },
        repeatBasis: 'scheduled',
      },
    }, tool('activities.capture'));

    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'todos', title: 'Add Take out the trash',
      operation: {
        type: 'create_activity', targetId: null, expectedUpdatedAt: null,
        payload: {
          title: 'Take out the trash', reminderAt: '2026-07-29T02:00:00.000Z',
          repeatRule: 'custom', repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2] },
          repeatBasis: 'scheduled',
        },
      },
    })]);
  });

  it('resolves a natural weekday and clock time through the device Activity boundary', async () => {
    const now = new Date(2026, 6, 23, 12, 0, 0);
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await provider.execute({
      id: 'capture-trash-local', toolId: 'activities.capture', arguments: {
        title: 'Take out the trash', reminderLocalTime: '20:00', repeatWeekdays: [2],
      },
    }, tool('activities.capture'));

    const operation = provider.proposals()[0]?.operation;
    expect(operation?.type).toBe('create_activity');
    if (operation?.type !== 'create_activity') throw new Error('Expected create Activity proposal.');
    const reminder = new Date(operation.payload.reminderAt!);
    expect(reminder.getDay()).toBe(2);
    expect(reminder.getHours()).toBe(20);
    expect(operation.payload).toMatchObject({
      title: 'Take out the trash', scheduledDate: '2026-07-28', repeatRule: 'custom',
      repeatCustom: { cadence: 'weeks', interval: 1, weekdays: [2] },
      repeatBasis: 'scheduled',
    });
  });

  it('stages a Plan placement only with owned Activity and authoritative calendar context', async () => {
    const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };
    const provider = createUnifiedChatToolProvider({
      snapshots: {
        ...snapshots,
        plan: { targetDate: '2026-07-24T12:00:00.000Z', limitation: null, writeCalendarRef, recommendations: [] },
      },
    });
    const result = await provider.execute({
      id: 'schedule', toolId: 'plan.schedule_activity', arguments: {
        activityId: activity.id,
        startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z',
        targetDateKey: '2026-07-24',
      },
    }, tool('plan.schedule_activity'));

    expect(result).toEqual(expect.objectContaining({ status: 'proposed' }));
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'plan',
      operation: {
        type: 'schedule_activity', targetId: activity.id, expectedUpdatedAt: activity.updatedAt,
        payload: {
          activityId: activity.id, expectedUpdatedAt: activity.updatedAt,
          startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z',
          targetDateKey: '2026-07-24', writeCalendarRef,
        },
      },
    })]);
  });

  it('exposes and enforces the durable Plan placement referent during a follow-up', async () => {
    const otherActivity: Activity = {
      ...activity, id: 'activity-2', title: 'Lower priority item',
      updatedAt: '2026-07-22T11:00:00.000Z',
    };
    const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };
    const conversationReferent = {
      schemaVersion: 1 as const, capabilityId: 'plan' as const, kind: 'awaiting_placement' as const,
      activityId: activity.id, expectedUpdatedAt: activity.updatedAt, title: activity.title,
      targetDate: '2026-07-24T12:00:00.000Z', priorityPosition: 0,
    };
    const provider = createUnifiedChatToolProvider({
      snapshots: {
        ...snapshots,
        todos: { activities: [activity, otherActivity], goals: [goal] },
        plan: { targetDate: conversationReferent.targetDate, limitation: null, writeCalendarRef, recommendations: [] },
      },
      planConversationReferent: conversationReferent,
    });

    await expect(provider.execute(
      { id: 'read', toolId: 'plan.read_day_context', arguments: {} },
      tool('plan.read_day_context'),
    )).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      output: expect.objectContaining({ conversationReferent }),
    }));
    await expect(provider.execute({
      id: 'wrong-target', toolId: 'plan.schedule_activity', arguments: {
        activityId: otherActivity.id,
        startDate: '2026-07-24T14:00:00.000Z', endDate: '2026-07-24T16:00:00.000Z',
        targetDateKey: '2026-07-24',
      },
    }, tool('plan.schedule_activity'))).resolves.toEqual({
      status: 'failed',
      code: 'conversation_referent_mismatch',
      message: `This follow-up refers to ${activity.title}, not ${otherActivity.title}.`,
      retryable: false,
    });
    await expect(provider.execute({
      id: 'wrong-move', toolId: 'plan.reschedule_activity', arguments: {
        activityId: otherActivity.id,
        startDate: '2026-07-24T14:00:00.000Z', endDate: '2026-07-24T16:00:00.000Z',
        targetDateKey: '2026-07-24',
      },
    }, tool('plan.reschedule_activity'))).resolves.toEqual(expect.objectContaining({
      status: 'failed', code: 'conversation_referent_mismatch',
    }));
    expect(provider.proposals()).toEqual([]);
  });

  it('rejects a stale Plan placement referent after the Activity changes', async () => {
    const writeCalendarRef = { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary' };
    const provider = createUnifiedChatToolProvider({
      snapshots: {
        ...snapshots,
        plan: { targetDate: '2026-07-24T12:00:00.000Z', limitation: null, writeCalendarRef, recommendations: [] },
      },
      planConversationReferent: {
        schemaVersion: 1, capabilityId: 'plan', kind: 'awaiting_placement',
        activityId: activity.id, expectedUpdatedAt: '2026-07-21T10:00:00.000Z', title: activity.title,
        targetDate: '2026-07-24T12:00:00.000Z', priorityPosition: 0,
      },
    });

    await expect(provider.execute({
      id: 'stale', toolId: 'plan.schedule_activity', arguments: {
        activityId: activity.id,
        startDate: '2026-07-24T14:00:00.000Z', endDate: '2026-07-24T16:00:00.000Z',
        targetDateKey: '2026-07-24',
      },
    }, tool('plan.schedule_activity'))).resolves.toEqual({
      status: 'failed', code: 'conversation_referent_stale',
      message: `${activity.title} changed since Kwilt recommended it. Refresh Plan before scheduling.`,
      retryable: true,
    });
    expect(provider.proposals()).toEqual([]);
  });

  it('stages provider-backed Plan move and removal with exact prior timing', async () => {
    const scheduled = {
      ...activity,
      scheduledAt: '2026-07-24T15:00:00.000Z', estimateMinutes: 30,
      calendarBinding: {
        kind: 'provider' as const, provider: 'google' as const, accountId: 'account-1',
        calendarId: 'primary', eventId: 'event-1', createdBy: 'plan' as const,
      },
    };
    const provider = createUnifiedChatToolProvider({
      snapshots: { ...snapshots, todos: { activities: [scheduled], goals: [goal] } },
    });
    await provider.execute({
      id: 'move', toolId: 'plan.reschedule_activity', arguments: {
        activityId: scheduled.id, startDate: '2026-07-25T16:00:00.000Z',
        endDate: '2026-07-25T16:30:00.000Z', targetDateKey: '2026-07-25',
      },
    }, tool('plan.reschedule_activity'));
    await provider.execute({
      id: 'remove', toolId: 'plan.remove_activity', arguments: { activityId: scheduled.id },
    }, tool('plan.remove_activity'));

    expect(provider.proposals().map((proposal) => proposal.operation)).toEqual([
      expect.objectContaining({
        type: 'reschedule_activity',
        payload: expect.objectContaining({
          previousStartDate: '2026-07-24T15:00:00.000Z',
          previousEndDate: '2026-07-24T15:30:00.000Z',
        }),
      }),
      expect.objectContaining({ type: 'remove_activity_from_plan' }),
    ]);
  });
});
