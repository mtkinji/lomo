import { resolveCapabilityFirstRunEntry } from './capabilityFirstRunEntry';

const fresh = { hydrated: true, signedIn: true, returningUser: false as boolean | null,
  completed: false, returningPermissions: false, goalFlowActive: false,
  universalState: 'reel' as 'reel' | 'chosen' | 'explored', selectedPathId: null as string | null };

describe('capability first-run entry', () => {
  it('lets a new signed-in user choose a path instead of starting Goals automatically', () => {
    expect(resolveCapabilityFirstRunEntry(fresh)).toBe('choose-path');
  });
  it.each([{ hydrated: false }, { signedIn: false }, { returningUser: null },
    { returningUser: true }, { completed: true }, { returningPermissions: true }, { goalFlowActive: true }])(
    'does not interrupt an unresolved, returning, completed or active session: %p', override => {
      expect(resolveCapabilityFirstRunEntry({ ...fresh, ...override })).toBe('none');
    });
  it('resumes only an explicitly selected goal path', () => {
    expect(resolveCapabilityFirstRunEntry({ ...fresh, universalState: 'chosen', selectedPathId: 'make-progress' })).toBe('resume-goal');
    expect(resolveCapabilityFirstRunEntry({ ...fresh, universalState: 'chosen', selectedPathId: 'screen-time-controls' })).toBe('none');
    expect(resolveCapabilityFirstRunEntry({ ...fresh, universalState: 'explored' })).toBe('none');
  });
});
