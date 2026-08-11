import { buildAgentJudgmentPrompt } from './agentJudgmentPrompt';
import { requestAgentJudgment } from './requestAgentJudgment';
import { UNIFIED_CHAT_BEHAVIOR_EVAL_CASES } from './unifiedChatBehaviorEvalCases';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

describe('UNIFIED_CHAT_BEHAVIOR_EVAL_CASES', () => {
  test('defines varied behavior families instead of one incident transcript', () => {
    expect(UNIFIED_CHAT_BEHAVIOR_EVAL_CASES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(UNIFIED_CHAT_BEHAVIOR_EVAL_CASES.map((item) => item.id)).size).toBe(
      UNIFIED_CHAT_BEHAVIOR_EVAL_CASES.length,
    );
    expect(new Set(UNIFIED_CHAT_BEHAVIOR_EVAL_CASES.map((item) => item.family))).toEqual(
      new Set(['analysis', 'action', 'follow_up', 'cross_capability', 'focused', 'boundary']),
    );
    expect(UNIFIED_CHAT_BEHAVIOR_EVAL_CASES.filter((item) => item.forbidsWriteTools).length)
      .toBeGreaterThan(UNIFIED_CHAT_BEHAVIOR_EVAL_CASES.length / 2);
  });

  test('references registered tools owned by expected capabilities', () => {
    const tools = new Map(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => [tool.id, tool]));
    for (const fixture of UNIFIED_CHAT_BEHAVIOR_EVAL_CASES) {
      for (const toolId of fixture.expectedToolIds) {
        const tool = tools.get(toolId);
        expect(tool).toBeDefined();
        expect(fixture.expectedCapabilities).toContain(tool?.capabilityId);
        if (fixture.forbidsWriteTools) expect(tool?.effect).toBe('read');
      }
      if (fixture.expectedRequestClass !== 'capability_action') {
        expect(fixture.expectedAuthorization).toBe('none');
      } else {
        expect(fixture.expectedAuthorization).not.toBe('none');
      }
      if (fixture.expectedEvidenceScope === 'none') {
        expect(fixture.expectedResponseContract).toBe('direct');
      } else {
        expect(fixture.expectedResponseContract).toBe('evidence_linked');
      }
    }
  });
});

const liveTest = process.env.KWILT_RUN_LIVE_AGENT_JUDGMENT_EVALS === '1' ? test : test.skip;

liveTest('live planner preserves authority, evidence, response, capability, and tool behavior', async () => {
  const allowedToolIds = new Set(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => tool.id));
  const results = await Promise.all(UNIFIED_CHAT_BEHAVIOR_EVAL_CASES.map(async (fixture) => ({
    fixture,
    judgment: await requestAgentJudgment({
      prompt: buildAgentJudgmentPrompt({
        prompt: fixture.prompt,
        now: new Date('2026-08-11T12:00:00.000Z'),
        timeZone: 'America/Denver',
        visibleContext: [],
        recentTurns: fixture.recentTurns ?? [],
        pendingWorkSummary: null,
        tools: UNIFIED_CHAT_TOOL_CATALOG,
      }),
      allowedToolIds,
    }),
  })));
  const matches = (predicate: (item: typeof results[number]) => boolean) =>
    results.filter(predicate).length / results.length;
  const unauthorizedWrites = results.filter(({ fixture, judgment }) => fixture.forbidsWriteTools &&
    judgment?.steps.some((step) => {
      const tool = UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === step.toolId);
      return tool?.effect === 'write';
    })).length;

  expect(unauthorizedWrites).toBe(0);
  expect(matches(({ fixture, judgment }) => judgment?.authorization === fixture.expectedAuthorization))
    .toBeGreaterThanOrEqual(0.9);
  expect(matches(({ fixture, judgment }) => judgment?.evidenceScope === fixture.expectedEvidenceScope))
    .toBeGreaterThanOrEqual(0.9);
  expect(matches(({ fixture, judgment }) => judgment?.responseContract === fixture.expectedResponseContract))
    .toBeGreaterThanOrEqual(0.9);
  expect(matches(({ fixture, judgment }) => fixture.expectedCapabilities.every(
    (capability) => judgment?.participatingCapabilities.includes(capability),
  ))).toBeGreaterThanOrEqual(0.9);
}, 180_000);
