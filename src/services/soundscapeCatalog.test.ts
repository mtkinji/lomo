import { SOUND_SCAPES, soundscapesByKind } from './soundscapeCatalog';

describe('Focus soundscape catalog', () => {
  it('groups every soundscape into the stable Music and Nature sections', () => {
    expect(soundscapesByKind()).toEqual(
      [
        { kind: 'music', title: 'Music' },
        { kind: 'nature', title: 'Nature' },
      ]
        .map((section) => ({
          ...section,
          soundscapes: SOUND_SCAPES.filter((soundscape) => soundscape.kind === section.kind),
        }))
        .filter((section) => section.soundscapes.length > 0),
    );
  });

  it('does not return empty sections while the catalog is rolling out', () => {
    expect(soundscapesByKind().every((section) => section.soundscapes.length > 0)).toBe(true);
  });
});
