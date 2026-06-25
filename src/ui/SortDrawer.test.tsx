import { getDefaultSortCondition, SORTABLE_FIELDS } from './SortDrawer';

describe('SortDrawer sortable fields', () => {
  it('offers last modified as a to-do sort field', () => {
    expect(SORTABLE_FIELDS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'updatedAt',
          label: 'Last modified',
        }),
      ]),
    );
  });

  it('uses Priority as the editable default sort condition', () => {
    expect(getDefaultSortCondition('priority')).toEqual({ field: 'priority', direction: 'asc' });
  });

  it('maps legacy view defaults into single editable sort rows', () => {
    expect(getDefaultSortCondition('titleDesc')).toEqual({ field: 'title', direction: 'desc' });
    expect(getDefaultSortCondition('dueDateAsc')).toEqual({ field: 'scheduledDate', direction: 'asc' });
    expect(getDefaultSortCondition('manual')).toEqual({ field: 'orderIndex', direction: 'asc' });
  });
});
