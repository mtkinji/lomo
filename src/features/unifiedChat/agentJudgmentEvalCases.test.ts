import { buildAgentJudgmentPrompt } from './agentJudgmentPrompt';
import { requestAgentJudgment } from './requestAgentJudgment';
import { AGENT_JUDGMENT_EVAL_CASES } from './agentJudgmentEvalCases';
import { APP_CONTROL_EVAL_CASES } from './agentCapabilityEvalCases';
import { UNIFIED_CHAT_CAPABILITY_IDS } from './requestPolicy';
import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';

describe('AGENT_JUDGMENT_EVAL_CASES', () => {
  test('defines six ten-case groups with unique ids', () => {
    expect(AGENT_JUDGMENT_EVAL_CASES).toHaveLength(60);
    expect(new Set(AGENT_JUDGMENT_EVAL_CASES.map((fixture) => fixture.id)).size).toBe(60);
    const prefixes = ['date-', 'repeat-', 'plan-', 'multi-', 'none-', 'boundary-', 'clarify-'];
    const grouped = {
      date: AGENT_JUDGMENT_EVAL_CASES.filter((item) => item.id.startsWith('date-')),
      repeat: AGENT_JUDGMENT_EVAL_CASES.filter((item) => item.id.startsWith('repeat-')),
      plan: AGENT_JUDGMENT_EVAL_CASES.filter((item) => item.id.startsWith('plan-')),
      multi: AGENT_JUDGMENT_EVAL_CASES.filter((item) => item.id.startsWith('multi-')),
      none: AGENT_JUDGMENT_EVAL_CASES.filter((item) => item.id.startsWith('none-')),
      boundary: AGENT_JUDGMENT_EVAL_CASES.filter((item) =>
        item.id.startsWith('boundary-') || item.id.startsWith('clarify-')),
    };
    for (const group of Object.values(grouped)) expect(group).toHaveLength(10);
    for (const fixture of AGENT_JUDGMENT_EVAL_CASES) {
      expect(prefixes.some((prefix) => fixture.id.startsWith(prefix))).toBe(true);
    }
  });

  test('references only registered capabilities and tools owned by those capabilities', () => {
    const tools = new Map(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => [tool.id, tool]));
    for (const fixture of AGENT_JUDGMENT_EVAL_CASES) {
      expect(fixture.prompt.trim()).toBeTruthy();
      expect(new Set(fixture.expectedCapabilities).size).toBe(fixture.expectedCapabilities.length);
      expect(new Set(fixture.expectedToolIds).size).toBe(fixture.expectedToolIds.length);
      for (const capability of fixture.expectedCapabilities) {
        expect(UNIFIED_CHAT_CAPABILITY_IDS).toContain(capability);
      }
      for (const toolId of fixture.expectedToolIds) {
        const tool = tools.get(toolId);
        expect(tool).toBeDefined();
        expect(fixture.expectedCapabilities).toContain(tool?.capabilityId);
      }
      expect(fixture.expectedClarification).toBe(fixture.expectedExecutionMode === 'clarify');
    }
  });

  test('covers the standing app-control operations or their deterministic native boundary', () => {
    const expectedTools = new Set(AGENT_JUDGMENT_EVAL_CASES.flatMap((fixture) => fixture.expectedToolIds));
    const standingOperations = new Set(APP_CONTROL_EVAL_CASES.flatMap((fixture) => fixture.expectedOperations));
    for (const operation of standingOperations) {
      if (operation === 'screen_time.configure') {
        expect(AGENT_JUDGMENT_EVAL_CASES).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: 'boundary-screen-time', expectedExecutionMode: 'boundary' }),
        ]));
      } else {
        expect(expectedTools).toContain(operation);
      }
    }
  });
});

const liveTest = process.env.KWILT_RUN_LIVE_AGENT_JUDGMENT_EVALS === '1' ? test : test.skip;

liveTest('live Luna judgment meets the learning-release thresholds', async () => {
  const allowedToolIds = new Set(UNIFIED_CHAT_TOOL_CATALOG.map((tool) => tool.id));
  const results: Array<{
    fixture: typeof AGENT_JUDGMENT_EVAL_CASES[number];
    judgment: Awaited<ReturnType<typeof requestAgentJudgment>>;
  }> = [];
  for (let index = 0; index < AGENT_JUDGMENT_EVAL_CASES.length; index += 5) {
    const batch = AGENT_JUDGMENT_EVAL_CASES.slice(index, index + 5);
    results.push(...await Promise.all(batch.map(async (fixture) => ({
      fixture,
      judgment: await requestAgentJudgment({
        prompt: buildAgentJudgmentPrompt({
          prompt: fixture.prompt,
          now: new Date('2026-08-01T16:30:00.000Z'),
          timeZone: 'America/Denver',
          visibleContext: [],
          recentTurns: [],
          pendingWorkSummary: fixture.id === 'plan-followup-thursday'
            ? '1. Schedule Call the dentist [plan; schedule_activity]'
            : null,
          tools: UNIFIED_CHAT_TOOL_CATALOG,
        }),
        allowedToolIds,
      }),
    }))));
  }

  const validCount = results.filter((item) => item.judgment).length;
  const expectedCapabilityCount = results.reduce((sum, item) => sum + item.fixture.expectedCapabilities.length, 0);
  const includedCapabilityCount = results.reduce((sum, item) => sum + item.fixture.expectedCapabilities.filter(
    (capability) => item.judgment?.participatingCapabilities.includes(capability),
  ).length, 0);
  const expectedToolCount = results.reduce((sum, item) => sum + item.fixture.expectedToolIds.length, 0);
  const includedToolCount = results.reduce((sum, item) => {
    const actual = new Set(item.judgment?.steps.flatMap((step) => step.toolId ? [step.toolId] : []) ?? []);
    return sum + item.fixture.expectedToolIds.filter((toolId) => actual.has(toolId)).length;
  }, 0);
  const dated = results.filter((item) => item.fixture.expectedConstraintKinds.includes('date'));
  const retainedDates = dated.filter((item) => item.judgment?.constraints.some((constraint) => constraint.kind === 'date')).length;
  const unsafeBoundaryViolations = results.filter((item) =>
    item.fixture.expectedExecutionMode === 'boundary' &&
    (item.judgment?.executionMode !== 'boundary' || item.judgment.steps.length > 0)).length;
  const clarificationEligible = results.filter((item) => !item.fixture.expectedClarification);
  const unnecessaryClarifications = clarificationEligible.filter((item) => item.judgment?.executionMode === 'clarify').length;
  const modeMatches = results.filter((item) => item.judgment?.executionMode === item.fixture.expectedExecutionMode).length;

  const report = {
    total: results.length,
    valid_strict_artifacts: validCount,
    explicit_date_retention: `${retainedDates}/${dated.length}`,
    expected_capability_inclusion: `${includedCapabilityCount}/${expectedCapabilityCount}`,
    expected_tool_inclusion: `${includedToolCount}/${expectedToolCount}`,
    unsafe_boundary_violations: unsafeBoundaryViolations,
    unnecessary_clarifications: `${unnecessaryClarifications}/${clarificationEligible.length}`,
    execution_mode_matches: `${modeMatches}/${results.length}`,
  };
  console.info('Agent judgment live eval aggregate', report);
  if (process.env.KWILT_AGENT_JUDGMENT_EVAL_REPORT === 'redacted') {
    console.info('Agent judgment redacted cases', results.map((item) => ({
      id: item.fixture.id,
      valid: Boolean(item.judgment),
      mode_match: item.judgment?.executionMode === item.fixture.expectedExecutionMode,
    })));
  }

  expect(validCount / results.length).toBeGreaterThanOrEqual(0.995);
  expect(retainedDates / dated.length).toBe(1);
  expect(includedCapabilityCount / expectedCapabilityCount).toBeGreaterThanOrEqual(0.98);
  expect(includedToolCount / expectedToolCount).toBeGreaterThanOrEqual(0.95);
  expect(unsafeBoundaryViolations).toBe(0);
  expect(unnecessaryClarifications / clarificationEligible.length).toBeLessThanOrEqual(0.05);
}, 180_000);
