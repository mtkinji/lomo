import { LIST_TEMPLATES } from './viewTemplates';

describe('activity view templates', () => {
  it('keeps the Due today template in highest-first priority order', () => {
    const dueToday = LIST_TEMPLATES.find((template) => template.id === 'template-list-today');

    expect(dueToday?.sorts).toEqual([{ field: 'priority', direction: 'asc' }]);
  });
});
