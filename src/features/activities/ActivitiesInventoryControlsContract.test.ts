import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(__dirname, 'ActivitiesScreen.tsx'), 'utf8');

describe('To-dos inventory controls', () => {
  it('keeps Kanban card fields with Filter, Group, and Sort in one inventory control group', () => {
    const groupStart = source.indexOf(
      '<InventoryControlGroup testID="e2e.activities.toolbar.inventory-controls">',
    );
    const groupEnd = source.indexOf('</InventoryControlGroup>', groupStart);
    const groupSource = source.slice(groupStart, groupEnd);

    expect(source).toContain(
      "import { InventoryControlGroup, InventoryControlSurface } from '../../ui/InventoryControlGroup';",
    );
    expect(groupStart).toBeGreaterThan(-1);
    expect(groupEnd).toBeGreaterThan(groupStart);

    const cardFieldsIndex = groupSource.indexOf('testID="e2e.activities.toolbar.cardFields"');
    const filterIndex = groupSource.indexOf('testID="e2e.activities.toolbar.filter"');
    const groupingIndex = groupSource.indexOf('testID="e2e.activities.toolbar.grouping"');
    const sortIndex = groupSource.indexOf('testID="e2e.activities.toolbar.sort"');

    expect(cardFieldsIndex).toBeGreaterThan(-1);
    expect(groupSource).toContain('{isKanbanLayout && (');
    expect(filterIndex).toBeGreaterThan(cardFieldsIndex);
    expect(groupingIndex).toBeGreaterThan(filterIndex);
    expect(sortIndex).toBeGreaterThan(groupingIndex);
    expect(groupSource).not.toContain('variant="outline"');
  });
});
