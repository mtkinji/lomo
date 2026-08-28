import {
  savePersonalCompositeScreenTimeRule,
  deletePersonalCompositeScreenTimeRule,
  type PersonalCompositeRuleActionBoundary,
} from './personalCompositeRuleActions';
import { normalizeScreenTimeProtectionSettings } from '../../../services/screenTimeProtection';
import type { PersonalCompositeScreenTimeRule } from './personalCompositeScreenTimeRule';

const prior: PersonalCompositeScreenTimeRule = {
  id: 'social-rule', selectionId: 'social-selection', selectedApps: [],
  selectedCategories: [{ token: 'social', label: 'Social' }], enabled: true,
  setupCompleted: true, connector: 'all', outcome: 'available',
  conditions: [{ id: 'after-five', type: 'time_of_day', operator: 'after', minuteOfDay: 1020 }],
  temporaryOpenUntilIso: null,
  lastUpdated: '2026-08-27T20:00:00.000Z',
};

function makeBoundary(): jest.Mocked<PersonalCompositeRuleActionBoundary> {
  let settings = normalizeScreenTimeProtectionSettings({
    authorizationStatus: 'approved', personalRuleSchemaVersion: 2,
    personalCompositeRules: [prior], personalRules: [],
  });
  return {
    readSettings: jest.fn(() => settings),
    persistSettings: jest.fn((next) => { settings = next; }),
    activateRule: jest.fn(async (_rule: PersonalCompositeScreenTimeRule): Promise<boolean> => true),
    deactivateRule: jest.fn(async (_rule: PersonalCompositeScreenTimeRule): Promise<boolean> => true),
  };
}

describe('personalCompositeRuleActions', () => {
  it('replaces enforcement before atomically persisting the aggregate', async () => {
    const boundary = makeBoundary();
    const next = { ...prior, connector: 'any' as const, lastUpdated: '2026-08-27T21:00:00.000Z' };
    await savePersonalCompositeScreenTimeRule({
      rule: next, expectedUpdatedAt: prior.lastUpdated, confirmed: true,
    }, boundary);
    expect(boundary.deactivateRule).toHaveBeenCalledWith(prior);
    expect(boundary.activateRule).toHaveBeenCalledWith(next);
    expect(boundary.persistSettings).toHaveBeenCalledWith(expect.objectContaining({ personalCompositeRules: [next] }));
    expect(boundary.deactivateRule.mock.invocationCallOrder[0]).toBeLessThan(boundary.persistSettings.mock.invocationCallOrder[0]);
  });

  it('restores prior enforcement when replacement activation fails', async () => {
    const boundary = makeBoundary();
    boundary.activateRule.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(savePersonalCompositeScreenTimeRule({
      rule: { ...prior, lastUpdated: '2026-08-27T21:00:00.000Z' },
      expectedUpdatedAt: prior.lastUpdated, confirmed: true,
    }, boundary)).rejects.toThrow('screen_time_composite_rule_activation_failed');
    expect(boundary.activateRule).toHaveBeenLastCalledWith(prior);
    expect(boundary.persistSettings).not.toHaveBeenCalled();
  });

  it('clears new enforcement and restores prior enforcement when persistence fails', async () => {
    const boundary = makeBoundary();
    boundary.persistSettings.mockRejectedValueOnce(new Error('disk_failed'));
    const next = { ...prior, lastUpdated: '2026-08-27T21:00:00.000Z' };
    await expect(savePersonalCompositeScreenTimeRule({
      rule: next, expectedUpdatedAt: prior.lastUpdated, confirmed: true,
    }, boundary)).rejects.toThrow('disk_failed');
    expect(boundary.deactivateRule).toHaveBeenLastCalledWith(next);
    expect(boundary.activateRule).toHaveBeenLastCalledWith(prior);
  });

  it('deletes only after native cleanup succeeds', async () => {
    const boundary = makeBoundary();
    await deletePersonalCompositeScreenTimeRule({
      ruleId: prior.id, expectedUpdatedAt: prior.lastUpdated!, confirmed: true,
    }, boundary);
    expect(boundary.deactivateRule).toHaveBeenCalledWith(prior);
    expect(boundary.persistSettings).toHaveBeenCalledWith(expect.objectContaining({ personalCompositeRules: [] }));
  });

  it('can replace an unversioned migrated rule without treating it as a new duplicate', async () => {
    const unversioned = { ...prior, lastUpdated: null };
    let settings = normalizeScreenTimeProtectionSettings({
      authorizationStatus: 'approved', personalRuleSchemaVersion: 2,
      personalCompositeRules: [unversioned], personalRules: [],
    });
    const boundary: jest.Mocked<PersonalCompositeRuleActionBoundary> = {
      readSettings: jest.fn(() => settings),
      persistSettings: jest.fn((next) => { settings = next; }),
      activateRule: jest.fn(async (_rule: PersonalCompositeScreenTimeRule): Promise<boolean> => true),
      deactivateRule: jest.fn(async (_rule: PersonalCompositeScreenTimeRule): Promise<boolean> => true),
    };
    const next = { ...unversioned, enabled: false, lastUpdated: '2026-08-27T21:00:00.000Z' };

    await savePersonalCompositeScreenTimeRule({
      rule: next, expectedUpdatedAt: 'unversioned', confirmed: true,
    }, boundary);

    expect(boundary.deactivateRule).toHaveBeenCalledWith(unversioned);
    expect(boundary.persistSettings).toHaveBeenCalledWith(expect.objectContaining({ personalCompositeRules: [next] }));
  });
});
