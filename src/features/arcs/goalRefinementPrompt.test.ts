import type { Metric } from '../../domain/types';
import { buildGoalRefinementPrompt } from './goalRefinementPrompt';

describe('buildGoalRefinementPrompt', () => {
  it('preserves the workspace snapshot and appends required refinement instructions', () => {
    const prompt = buildGoalRefinementPrompt({
      workspaceSnapshot: 'FOCUSED GOAL SNAPSHOT',
      targetDate: '2026-08-15T23:00:00.000Z',
      metrics: [],
    });

    expect(prompt).toContain('FOCUSED GOAL SNAPSHOT\n---');
    expect(prompt).toContain('TASK: refine the focused goal (do NOT create a different goal).');
    expect(prompt).toContain('Return a revised GOAL_PROPOSAL_JSON that makes the goal more specific + timeboxed.');
    expect(prompt).toContain('Prefer including both a structured targetDate and 1 metric in metrics if possible.');
    expect(prompt).toContain('Current targetDate: 2026-08-15T23:00:00.000Z');
    expect(prompt).toContain('Current metrics:\nNone');
  });

  it('summarizes at most three populated metrics', () => {
    const metrics: Metric[] = [
      {
        id: 'count',
        label: 'Publish essays',
        kind: 'count',
        target: 6,
        unit: 'essays',
      },
      {
        id: 'milestone',
        label: 'Ship TestFlight',
        kind: 'milestone',
        completedAt: '2026-07-20T12:00:00.000Z',
      },
      { id: 'plain', label: 'Ask for feedback' },
      { id: 'omitted', label: 'This fourth metric is omitted' },
    ];

    const prompt = buildGoalRefinementPrompt({ workspaceSnapshot: '', metrics });

    expect(prompt).toContain('- Publish essays kind:count target:6 unit:essays');
    expect(prompt).toContain('- Ship TestFlight kind:milestone done:true');
    expect(prompt).toContain('- Ask for feedback');
    expect(prompt).not.toContain('This fourth metric is omitted');
  });

  it('uses explicit empty context when the Goal has no target or metrics', () => {
    const prompt = buildGoalRefinementPrompt({ workspaceSnapshot: '' });

    expect(prompt).toContain('Current targetDate: None');
    expect(prompt).toContain('Current metrics:\nNone');
  });
});
