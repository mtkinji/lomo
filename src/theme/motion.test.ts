import { motion } from './motion';
import { readFileSync } from 'fs';
import path from 'path';

describe('shared motion contract', () => {
  it('makes drawer entrances brief and visibly ease out', () => {
    expect(motion.drawer.enter.durationMs).toBeLessThanOrEqual(220);
    expect(motion.drawer.enter.character).toBe('decelerate');
  });

  it('keeps drawer exits faster than entrances', () => {
    expect(motion.drawer.exit.durationMs).toBeLessThan(motion.drawer.enter.durationMs);
  });

  it('keeps every shared BottomDrawer transition on semantic motion tokens', () => {
    const source = readFileSync(path.join(__dirname, '../ui/BottomDrawer.tsx'), 'utf8');

    expect(source).not.toMatch(/motionDuration\(\d/);
    expect(source).toContain('motion.drawer.enter');
    expect(source).toContain('motion.drawer.exit');
    expect(source).toContain('motion.drawer.resize');
    expect(source).toContain('motion.drawer.settle');
    expect(source).toContain('motion.drawer.rebound');
  });
});
