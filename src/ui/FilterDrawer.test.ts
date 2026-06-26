import { addTagFilterValue } from './FilterDrawer';

describe('addTagFilterValue', () => {
  it('adds a new tag without toggling off an existing tag from keyboard submit', () => {
    expect(addTagFilterValue(['Groceries'], 'Errands')).toEqual(['Groceries', 'Errands']);
    expect(addTagFilterValue(['Groceries'], 'groceries')).toEqual(['Groceries']);
  });

  it('returns undefined when adding an empty tag to an empty filter value', () => {
    expect(addTagFilterValue(undefined, '   ')).toBeUndefined();
  });
});
