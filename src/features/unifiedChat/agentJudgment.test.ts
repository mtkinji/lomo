import {
  AGENT_JUDGMENT_RESPONSE_FORMAT,
  parseAgentJudgment,
} from './agentJudgment';

const LIVE_TOOL_IDS = new Set([
  'activities.capture',
  'plan.read_day_context',
  'plan.schedule_activity',
]);

const directAnswer = {
  schemaVersion: 1,
  userJob: 'Understand why leaves change color',
  desiredOutcome: 'A clear ordinary explanation',
  requestClass: 'general',
  participatingCapabilities: [],
  usePrivateContext: false,
  informationNeed: 'stable',
  authorization: 'none',
  evidenceScope: 'none',
  responseContract: 'direct',
  executionMode: 'direct_answer',
  constraints: [],
  steps: [],
  clarificationQuestion: null,
  confidence: 0.98,
  reason: 'No Kwilt data or action is needed.',
};

const singleTool = {
  ...directAnswer,
  userJob: 'Remember to call the dentist on the requested date',
  desiredOutcome: 'A dated call Activity exists',
  requestClass: 'capability_action',
  participatingCapabilities: ['todos'],
  authorization: 'explicit_request',
  evidenceScope: 'none',
  responseContract: 'direct',
  executionMode: 'single_tool',
  constraints: [
    { kind: 'title', sourceText: 'Call the dentist', normalizedValue: 'Call the dentist' },
    { kind: 'date', sourceText: 'August 5', normalizedValue: '2026-08-05' },
  ],
  steps: [{ sequence: 1, objective: 'Capture the dated call Activity', toolId: 'activities.capture', dependsOn: null }],
  confidence: 0.95,
  reason: 'One Activity capture can achieve the requested outcome.',
};

const multiTool = {
  ...singleTool,
  userJob: 'Make room for a dentist appointment and remember the prerequisite call',
  desiredOutcome: 'A call Activity exists and the appointment can be placed next week',
  participatingCapabilities: ['todos', 'plan'],
  usePrivateContext: true,
  evidenceScope: 'focused',
  responseContract: 'evidence_linked',
  executionMode: 'multi_tool',
  constraints: [
    { kind: 'date', sourceText: 'next week', normalizedValue: '2026-08-03/2026-08-09' },
    { kind: 'other', sourceText: 'call first', normalizedValue: 'call first' },
  ],
  steps: [
    { sequence: 1, objective: 'Read next week Plan context', toolId: 'plan.read_day_context', dependsOn: null },
    { sequence: 2, objective: 'Capture the prerequisite call', toolId: 'activities.capture', dependsOn: 1 },
    { sequence: 3, objective: 'Propose appointment placement', toolId: 'plan.schedule_activity', dependsOn: 2 },
  ],
  confidence: 0.87,
  reason: 'The request needs an ordered read, capture, and placement proposal.',
};

describe('parseAgentJudgment', () => {
  it.each([
    ['direct answer', directAnswer],
    ['single tool', singleTool],
    ['multi tool', multiTool],
  ])('parses a valid %s artifact from JSON text', (_name, fixture) => {
    expect(parseAgentJudgment(JSON.stringify(fixture), LIVE_TOOL_IDS)).toEqual(fixture);
  });

  it('exposes the strict Responses JSON schema format', () => {
    expect(AGENT_JUDGMENT_RESPONSE_FORMAT).toMatchObject({
      type: 'json_schema',
      name: 'kwilt_agent_judgment',
      strict: true,
      schema: { type: 'object', additionalProperties: false },
    });
  });

  const invalidFixtures: Array<[string, unknown]> = [
    ['unknown request class', { ...directAnswer, requestClass: 'mystery' }],
    ['unknown capability', { ...singleTool, participatingCapabilities: ['calendar'] }],
    ['confidence below zero', { ...directAnswer, confidence: -0.1 }],
    ['confidence above one', { ...directAnswer, confidence: 1.1 }],
    ['duplicate capability', { ...multiTool, participatingCapabilities: ['todos', 'todos'] }],
    ['duplicate step sequence', { ...multiTool, steps: [multiTool.steps[0], { ...multiTool.steps[1], sequence: 1 }] }],
    ['step dependency pointing forward', { ...multiTool, steps: [{ ...multiTool.steps[0], dependsOn: 2 }, multiTool.steps[1]] }],
    ['single_tool with zero steps', { ...singleTool, steps: [] }],
    ['single_tool with multiple steps', { ...singleTool, steps: [singleTool.steps[0], { ...singleTool.steps[0], sequence: 2, dependsOn: 1 }] }],
    ['multi_tool with one step', { ...multiTool, steps: [multiTool.steps[0]] }],
    ['direct_answer with a tool', { ...directAnswer, steps: [singleTool.steps[0]] }],
    ['direct_answer with private context', { ...directAnswer, usePrivateContext: true }],
    ['question with action authority', {
      ...singleTool,
      requestClass: 'capability_question', authorization: 'explicit_request',
      steps: [{ ...singleTool.steps[0], toolId: 'plan.read_day_context' }],
    }],
    ['action without authority', { ...singleTool, authorization: 'none' }],
    ['private context without evidence scope', { ...multiTool, evidenceScope: 'none' }],
    ['direct response with evidence-linked contract', { ...directAnswer, responseContract: 'evidence_linked' }],
    ['clarify without a question', { ...directAnswer, executionMode: 'clarify' }],
    ['boundary with a tool step', { ...singleTool, executionMode: 'boundary' }],
    ['unknown response field', { ...directAnswer, hiddenThought: 'secret' }],
    ['reason longer than 240 characters', { ...directAnswer, reason: 'x'.repeat(241) }],
    ['unknown tool id', { ...singleTool, steps: [{ ...singleTool.steps[0], toolId: 'unknown.tool' }] }],
  ];

  it.each(invalidFixtures)('rejects %s', (_scenario, fixture) => {
    expect(parseAgentJudgment(fixture, LIVE_TOOL_IDS)).toBeNull();
  });
});
