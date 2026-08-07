import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(__dirname, 'GoalsScreen.tsx'), 'utf8');

describe('Goals inventory contextual Chat', () => {
  test('opens the shared drawer with capability-wide Goals scope and an exact return target', () => {
    expect(source).toContain("capabilityId: 'goals'");
    expect(source).toContain("surface: 'inventory'");
    expect(source).toContain("scopeLabel=\"All goals\"");
    expect(source).toContain('screen: \'GoalsTab\'');
    expect(source).toContain("source=\"goals_inventory_contextual_drawer\"");
    expect(source).toContain('<UnifiedChatDrawer');
  });

  test('uses the established floating Chat control grammar', () => {
    expect(source).toContain('accessibilityLabel="Chat about goals"');
    expect(source).toContain('accessibilityHint="Opens Chat with the current Goals context"');
    expect(source).toContain('<FloatingControlSurface');
    expect(source).toContain('<Icon name="navAiGuide" size={19}');
    expect(source).toContain('right: RESTING_COMPOSER_HORIZONTAL_INSET_PX');
    expect(source).toContain('bottom: RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX');
  });
});
