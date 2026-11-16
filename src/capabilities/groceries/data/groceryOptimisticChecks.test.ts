import { createGroceryCheckTracker } from './groceryOptimisticChecks';

describe('pending grocery checks', () => {
  it('restores the original state when a check and its immediate undo both fail to save', () => {
    const tracker = createGroceryCheckTracker();
    tracker.begin('item', 'needed', { queuedAt: 'check', state: 'already_have' });
    tracker.begin('item', 'already_have', { queuedAt: 'undo', state: 'needed' });
    expect(tracker.settle('item', 'check', false)).toBe('needed');
    expect(tracker.settle('item', 'undo', false)).toBe('needed');
  });

  it('restores the saved check if its later undo fails to save', () => {
    const tracker = createGroceryCheckTracker();
    tracker.begin('item', 'needed', { queuedAt: 'check', state: 'already_have' });
    tracker.begin('item', 'already_have', { queuedAt: 'undo', state: 'needed' });
    expect(tracker.settle('item', 'check', true)).toBe('needed');
    expect(tracker.settle('item', 'undo', false)).toBe('already_have');
  });

  it('does not roll back another item when one check fails', () => {
    const tracker = createGroceryCheckTracker();
    tracker.begin('flour', 'needed', { queuedAt: 'first', state: 'already_have' });
    tracker.begin('rice', 'needed', { queuedAt: 'second', state: 'already_have' });
    expect(tracker.settle('flour', 'first', false)).toBe('needed');
    expect(tracker.settle('rice', 'second', true)).toBe('already_have');
  });
});
