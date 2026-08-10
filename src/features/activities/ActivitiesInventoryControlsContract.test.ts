import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(__dirname, 'ActivitiesScreen.tsx'), 'utf8');

describe('To-dos inventory controls', () => {
  it('reuses the shared Transactions control group for Filter, Group, and Sort', () => {
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

    const filterIndex = groupSource.indexOf('testID="e2e.activities.toolbar.filter"');
    const groupingIndex = groupSource.indexOf('testID="e2e.activities.toolbar.grouping"');
    const sortIndex = groupSource.indexOf('testID="e2e.activities.toolbar.sort"');

    expect(filterIndex).toBeGreaterThan(-1);
    expect(groupingIndex).toBeGreaterThan(filterIndex);
    expect(sortIndex).toBeGreaterThan(groupingIndex);
    expect(groupSource).not.toContain('variant="outline"');
  });
});
