jest.mock('../arcs/arcHeroLibrary', () => ({
  ARC_HERO_LIBRARY: [
    { id: 'hero-one', uri: 'curated://one', tags: {} },
    { id: 'hero-two', uri: 'curated://two', tags: {} },
    { id: 'hero-three', uri: 'curated://three', tags: {} },
  ],
}));

import { getActivityHeaderArtworkSource } from './activityTypeHeaderArtwork';

describe('getActivityHeaderArtworkSource', () => {
  it('selects a stable default image from the curated hero library', () => {
    const activity = {
      id: 'activity-stable-default',
      title: 'Book the campsite',
      type: 'task' as const,
    };

    const first = getActivityHeaderArtworkSource(activity);
    const second = getActivityHeaderArtworkSource(activity);

    expect(first).toEqual(second);
    expect(['curated://one', 'curated://two', 'curated://three']).toContain(
      (first as { uri?: string }).uri
    );
  });

  it('varies defaults across different activity identities', () => {
    const selectedUris = new Set(
      ['one', 'two', 'three', 'four', 'five'].map((id) => {
        const source = getActivityHeaderArtworkSource({
          id: `activity-${id}`,
          title: `Activity ${id}`,
          type: 'task',
        });

        return (source as { uri?: string }).uri;
      })
    );

    expect(selectedUris.size).toBeGreaterThan(1);
  });
});
