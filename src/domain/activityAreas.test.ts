import {
  DEFAULT_ACTIVITY_AREAS,
  findActivityAreaById,
  normalizeActivityAreas,
  resolveActivityAreaFallbackMode,
} from './activityAreas';

describe('activityAreas', () => {
  it('seeds intelligent defaults in stable order', () => {
    expect(DEFAULT_ACTIVITY_AREAS.map((area) => area.label)).toEqual([
      'Work',
      'Personal',
      'Family',
      'Home',
      'Health',
    ]);
    expect(DEFAULT_ACTIVITY_AREAS.map((area) => area.id)).toEqual([
      'area-work',
      'area-personal',
      'area-family',
      'area-home',
      'area-health',
    ]);
  });

  it('falls back to defaults when persisted areas are missing', () => {
    expect(normalizeActivityAreas(undefined).map((area) => area.id)).toEqual(
      DEFAULT_ACTIVITY_AREAS.map((area) => area.id),
    );
  });

  it('keeps archived areas resolvable but inactive', () => {
    const areas = normalizeActivityAreas([
      {
        id: 'area-church',
        label: 'Church',
        order: 0,
        archivedAt: '2026-06-25T12:00:00.000Z',
        scheduling: { fallbackMode: 'personal' },
      },
    ]);

    expect(findActivityAreaById(areas, 'area-church')?.label).toBe('Church');
    expect(findActivityAreaById(areas, 'area-church')?.archivedAt).toBe('2026-06-25T12:00:00.000Z');
  });

  it('deduplicates invalid labels and keeps a valid default list', () => {
    const areas = normalizeActivityAreas([
      { id: 'area-a', label: 'Work', order: 0 },
      { id: 'area-b', label: 'Work', order: 1 },
      { id: 'area-empty', label: '   ', order: 2 },
    ]);

    expect(areas.filter((area) => area.label === 'Work')).toHaveLength(1);
    expect(areas.some((area) => area.id === 'area-empty')).toBe(false);
    expect(areas.length).toBeGreaterThanOrEqual(5);
  });

  it('resolves scheduling fallback modes for default areas', () => {
    const areas = normalizeActivityAreas(undefined);

    expect(resolveActivityAreaFallbackMode(areas, 'area-work')).toBe('work');
    expect(resolveActivityAreaFallbackMode(areas, 'area-family')).toBe('personal');
    expect(resolveActivityAreaFallbackMode(areas, 'area-health')).toBe('personal');
    expect(resolveActivityAreaFallbackMode(areas, null)).toBe(null);
  });
});
