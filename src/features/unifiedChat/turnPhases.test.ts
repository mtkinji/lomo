import fs from 'node:fs';
import path from 'node:path';

const phaseModules = [
  'turnPersistencePhase',
  'turnPlanningPhase',
  'turnContextPhase',
  'turnExecutionPhase',
  'turnOutcomePhase',
  'turnFinalizationPhase',
] as const;

describe('Unified Chat turn phases', () => {
  test.each(phaseModules)('%s exposes one focused phase entrypoint', (moduleName) => {
    let loaded: Record<string, unknown> | null = null;
    try {
      loaded = require(`./${moduleName}`) as Record<string, unknown>;
    } catch {
      loaded = null;
    }

    expect(loaded).not.toBeNull();
    expect(Object.keys(loaded ?? {}).some((name) => name.endsWith('Phase'))).toBe(true);
  });

  test('runUnifiedChatTurn coordinates the named phases in causal order', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'runUnifiedChatTurn.ts'),
      'utf8',
    );
    const phaseCalls = [
      'persistUnifiedChatTurnPhase(',
      'planUnifiedChatTurnPhase(',
      'authorizeUnifiedChatContextPhase(',
      'executeUnifiedChatTurnPhase(',
      'materializeUnifiedChatOutcomePhase(',
      'finalizeUnifiedChatTurnPhase(',
    ];

    const positions = phaseCalls.map((call) => source.indexOf(call));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
