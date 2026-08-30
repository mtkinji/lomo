import type { Activity, ActivityArea } from '../../../domain/types';
import {
  ActivityAreaConflictError,
  activityAreaReviewReference,
  createActivityAreaActions,
  type ActivityAreaActionsBoundary,
} from './activityAreaActions';

const work: ActivityArea = {
  id: 'area-work', label: 'Work', order: 0, isDefault: true,
  scheduling: { enabled: true, fallbackMode: 'work' },
};
const activity = { id: 'activity-1', areaId: work.id } as Activity;

function boundary(): ActivityAreaActionsBoundary & { apply: jest.Mock } {
  let areas = [work];
  const apply = jest.fn((next: ActivityArea[]) => { areas = next; });
  return { read: () => ({ areas, activities: [activity] }), apply };
}

test('lists and gets bounded Activity areas with opaque review fingerprints', () => {
  const actions = createActivityAreaActions(boundary());
  const listed = actions.list();
  expect(listed).toEqual({ areas: [{
    areaId: 'area-work', label: 'Work', order: 0, archived: false, isDefault: true,
    schedulingEnabled: true, fallbackMode: 'work', affectedActivityCount: 1,
    fingerprint: expect.stringMatching(/^area:/),
  }] });
  expect(actions.get({ areaId: work.id })).toEqual(listed.areas[0]);
});

test('creates one unique area and confirms normalized state', () => {
  const provider = boundary();
  expect(createActivityAreaActions(provider).create({ label: 'Church' })).toMatchObject({
    areaId: 'area-church', label: 'Church', archived: false, fallbackMode: 'personal',
  });
  expect(provider.apply).toHaveBeenCalledTimes(1);
});

test('renames the exact reviewed area and rejects stale or duplicate names', () => {
  const provider = boundary();
  const actions = createActivityAreaActions(provider);
  const reference = activityAreaReviewReference(work);
  expect(actions.update({ ...reference, label: 'Deep work' })).toMatchObject({ label: 'Deep work' });
  expect(() => actions.update({ ...reference, label: 'Stale' })).toThrow(ActivityAreaConflictError);
  expect(() => actions.create({ label: 'Deep work' })).toThrow('already exists');
});

test('archives instead of erasing an area and reports affected Activities', () => {
  const provider = boundary();
  const result = createActivityAreaActions(provider).delete(activityAreaReviewReference(work));
  expect(result).toMatchObject({ areaId: work.id, archived: true, affectedActivityCount: 1 });
  expect(provider.apply.mock.calls[0][0][0]).toMatchObject({ id: work.id, archivedAt: expect.any(String) });
});
