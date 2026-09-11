import { addTagFilterValue } from './FilterDrawer';
import { readFileSync } from 'fs';
import path from 'path';

it('resizes the filter host including its actions with only one keyboard inset owner', () => {
  const source = readFileSync(path.join(__dirname, 'FilterDrawer.tsx'), 'utf8');
  // Native regression: Value remains visible while Apply and Cancel sit under the keyboard.
  expect(source).toContain('keyboardBehavior="resize"');
  expect(source).toContain('<BottomDrawerScrollView');
  expect(source).not.toContain('<KeyboardAwareScrollView');
  expect(source).not.toContain('keyboardAvoidanceEnabled={false}');
});

describe('addTagFilterValue', () => {
  it('adds a new tag without toggling off an existing tag from keyboard submit', () => {
    expect(addTagFilterValue(['Groceries'], 'Errands')).toEqual(['Groceries', 'Errands']);
    expect(addTagFilterValue(['Groceries'], 'groceries')).toEqual(['Groceries']);
  });

  it('returns undefined when adding an empty tag to an empty filter value', () => {
    expect(addTagFilterValue(undefined, '   ')).toBeUndefined();
  });
});
