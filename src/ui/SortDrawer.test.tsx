import { SORTABLE_FIELDS } from './SortDrawer';

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
});
