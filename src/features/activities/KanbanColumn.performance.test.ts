import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(__dirname, 'KanbanColumn.tsx'), 'utf8');

describe('Kanban column rendering performance', () => {
  it('virtualizes card rows instead of mounting every activity in every column', () => {
    expect(source).toContain('<FlatList');
    expect(source).toContain('data={activities}');
    expect(source).not.toContain('{activities.map((activity) => {');
  });

  it('starts exactly one board drag session for one measured long press', () => {
    const beginDragStart = source.indexOf(
      'const beginDrag = React.useCallback',
    );
    const finishDragStart = source.indexOf(
      'const finishDrag = React.useCallback',
      beginDragStart,
    );
    const beginDragSource = source.slice(beginDragStart, finishDragStart);

    expect(beginDragStart).toBeGreaterThan(-1);
    expect(finishDragStart).toBeGreaterThan(beginDragStart);
    expect(beginDragSource.match(/onBeginDrag\(activity\.id/g)).toHaveLength(1);
  });

  it('uses one delayed pan that yields scrolling before the hold and owns movement after it', () => {
    expect(source).toContain('.activateAfterLongPress(300)');
    expect(source).not.toContain('Gesture.LongPress()');
    expect(source).not.toContain('.manualActivation(true)');
    expect(source).not.toContain('verticalScrollGesture');
    expect(source).not.toContain('simultaneousWithExternalGesture');
    expect(source).not.toContain('blocksExternalGesture');
  });
});
