import type { Goal, Metric } from '../../domain/types';
import type { GoalProposalDraft } from '../ai/agentHandoffParsers';
import { mergeRefinedGoalProposal } from './goalProposalMerge';

const existingMetric: Metric = {
  id: 'metric-existing',
  label: 'Existing definition of done',
  kind: 'milestone',
};

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: 'arc-1',
    title: 'Existing title',
    description: 'Existing description',
    status: 'in_progress',
    qualityState: 'ready',
    priority: 2,
    targetDate: '2026-08-01T23:00:00.000Z',
    forceIntent: {},
    metrics: [existingMetric],
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('mergeRefinedGoalProposal', () => {
  it('applies and trims a complete proposal, then marks the Goal ready', () => {
    const metric: Metric = { id: 'metric-new', label: 'Ship it', kind: 'milestone' };
    const proposal: GoalProposalDraft = {
      title: '  Refined title  ',
      description: '  Clear finish line  ',
      targetDate: '2026-09-01T23:00:00.000Z',
      metrics: [metric],
      priority: 1,
    };

    expect(
      mergeRefinedGoalProposal({
        goal: goal(),
        proposal,
        updatedAt: '2026-07-21T12:00:00.000Z',
      }),
    ).toMatchObject({
      title: 'Refined title',
      description: 'Clear finish line',
      targetDate: proposal.targetDate,
      metrics: [metric],
      priority: 1,
      qualityState: 'ready',
      updatedAt: '2026-07-21T12:00:00.000Z',
    });
  });

  it('preserves existing fields when a partial proposal is blank or absent', () => {
    const existing = goal();

    expect(
      mergeRefinedGoalProposal({
        goal: existing,
        proposal: { title: '   ', description: '   ' },
        updatedAt: '2026-07-21T12:00:00.000Z',
      }),
    ).toMatchObject({
      title: existing.title,
      description: existing.description,
      targetDate: existing.targetDate,
      metrics: existing.metrics,
      priority: existing.priority,
      qualityState: 'ready',
    });
  });

  it('accepts an explicit empty metrics array and marks the Goal draft', () => {
    const result = mergeRefinedGoalProposal({
      goal: goal(),
      proposal: { title: 'Existing title', metrics: [] },
      updatedAt: '2026-07-21T12:00:00.000Z',
    });

    expect(result.metrics).toEqual([]);
    expect(result.targetDate).toBe('2026-08-01T23:00:00.000Z');
    expect(result.qualityState).toBe('draft');
  });

  it('keeps an incomplete Goal draft when the proposal adds no quality fields', () => {
    const result = mergeRefinedGoalProposal({
      goal: goal({ targetDate: undefined, metrics: [], qualityState: 'draft' }),
      proposal: { title: 'Sharper title' },
      updatedAt: '2026-07-21T12:00:00.000Z',
    });

    expect(result.qualityState).toBe('draft');
  });
});
