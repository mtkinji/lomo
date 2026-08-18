import {
  isKwiltLabEnabled,
  parsePersistedKwiltLabs,
  setKwiltLabEnabled,
} from './kwiltLabs';

describe('Kwilt Labs capability consent', () => {
  it('keeps every Lab off when storage is missing or malformed', () => {
    expect(parsePersistedKwiltLabs(null)).toEqual({ enabledCapabilities: [] });
    expect(parsePersistedKwiltLabs('{not-json')).toEqual({ enabledCapabilities: [] });
    expect(isKwiltLabEnabled([], 'explore')).toBe(false);
    expect(isKwiltLabEnabled([], 'chores')).toBe(false);
  });

  it('restores only known, explicitly enabled Labs from a Zustand envelope', () => {
    const persisted = parsePersistedKwiltLabs(JSON.stringify({
      state: { enabledCapabilities: ['explore', 'chores', 'unknown', 'explore'] },
      version: 1,
    }));

    expect(persisted.enabledCapabilities).toEqual(['explore', 'chores']);
    expect(isKwiltLabEnabled(persisted.enabledCapabilities, 'explore')).toBe(true);
    expect(isKwiltLabEnabled(persisted.enabledCapabilities, 'chores')).toBe(true);
  });

  it('enables and disables a capability without disturbing other state', () => {
    expect(setKwiltLabEnabled([], 'explore', true)).toEqual(['explore']);
    expect(setKwiltLabEnabled(['explore'], 'explore', true)).toEqual(['explore']);
    expect(setKwiltLabEnabled(['explore'], 'explore', false)).toEqual([]);
    expect(setKwiltLabEnabled(['explore'], 'chores', true)).toEqual(['explore', 'chores']);
  });
});
