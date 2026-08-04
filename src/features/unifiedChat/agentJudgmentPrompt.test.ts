import type { AgentToolDefinition } from '@kwilt/agent-runtime';
import { buildAgentJudgmentPrompt } from './agentJudgmentPrompt';

const tool = (overrides: Partial<AgentToolDefinition> = {}): AgentToolDefinition => ({
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
  inputSchema: { private: 'schema-must-not-be-included' },
  outputSchema: { private: 'schema-must-not-be-included' },
  ...overrides,
});

describe('buildAgentJudgmentPrompt', () => {
  it('uses bounded labels and tool metadata without private record ids or schemas', () => {
    const prompt = buildAgentJudgmentPrompt({
      prompt: 'Add Call the dentist on August 5.',
      now: new Date('2026-08-01T16:30:00.000Z'),
      timeZone: 'America/Denver',
      visibleContext: [{
        capabilityId: 'todos',
        objectType: 'activity',
        objectId: 'private-activity-id',
        label: 'Call the dentist',
      }],
      recentTurns: Array.from({ length: 10 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `Prior turn ${index} ${'long '.repeat(500)}`,
      })),
      pendingWorkSummary: 'One pending Activity proposal labeled Call the dentist.',
      tools: [tool()],
    });

    expect(prompt).toContain('Current local date: 2026-08-01');
    expect(prompt).toContain('Time zone: America/Denver');
    expect(prompt).toContain('Call the dentist');
    expect(prompt).toContain('activities.capture');
    expect(prompt).not.toContain('private-activity-id');
    expect(prompt).not.toContain('schema-must-not-be-included');
    expect(prompt).not.toContain('Prior turn 0');
    expect(prompt).toContain('Prior turn 4');
    expect(prompt.length).toBeLessThanOrEqual(12_000);
  });

  it('states each job, tool, constraint, and safety instruction once', () => {
    const instructions = [
      'Infer the practical job the user is trying to complete.',
      'Choose the smallest tool set that can achieve the desired outcome.',
      'Use direct_answer when no Kwilt data or action is needed.',
      'Use multi_tool only when multiple dependent operations materially help.',
      'Preserve every explicit date, time, recurrence, amount, title, and named target as a constraint.',
      'Ask one question only when a missing answer blocks safe progress.',
      'Treat clear acceptance of concrete suggestions from the recent dialogue as an action request.',
      'Do not claim or perform an action.',
    ];
    const prompt = buildAgentJudgmentPrompt({
      prompt: 'Why do leaves change color?',
      now: new Date('2026-08-01T16:30:00.000Z'),
      timeZone: 'invalid/timezone',
      visibleContext: [],
      recentTurns: [],
      pendingWorkSummary: null,
      tools: [tool()],
    });

    expect(prompt).toContain('Time zone: UTC');
    for (const instruction of instructions) {
      expect(prompt.split(instruction)).toHaveLength(2);
    }
  });
});
