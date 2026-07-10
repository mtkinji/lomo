import { readFileSync } from 'fs';
import path from 'path';

describe('ActivityDetail step completion Screen Time wiring', () => {
  it('records direct step completion as qualifying Screen Time progress', () => {
    const source = readFileSync(path.join(__dirname, 'ActivityDetailScreen.tsx'), 'utf8');
    const handlerStart = source.indexOf('const handleToggleStepComplete = (stepId: string) => {');
    const handlerEnd = source.indexOf('\n  const handleChangeStepTitle', handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(handler).toContain("recordScreenTimeProgress('activity_progress_recorded'");
  });
});
