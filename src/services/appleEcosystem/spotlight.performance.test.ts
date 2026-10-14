const mockIndex = jest.fn(async (_json: string): Promise<void> => undefined);
const mockClear = jest.fn(async () => undefined);
jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, NativeModules: { KwiltSpotlight: {
  indexActivitiesJson: (json: string) => mockIndex(json), clearActivities: () => mockClear(),
} } }));
import { indexActivitiesForSpotlight, clearSpotlightActivities } from './spotlight';
import type { Activity } from '../../domain/types';

it('does not repeatedly rebuild the native search index for edits outside its visible payload', async () => {
  const items = [{ id: 'a', title: 'Walk', status: 'planned' }] as Activity[];
  await indexActivitiesForSpotlight(items);
  expect(mockIndex).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 20; i++) await indexActivitiesForSpotlight([{ ...items[0], notes: `Note ${i}` }]);
  expect(mockIndex).toHaveBeenCalledTimes(1);
  await indexActivitiesForSpotlight([{ ...items[0], title: 'Run' }]);
  expect(mockIndex).toHaveBeenCalledTimes(2);
  await clearSpotlightActivities();
  await indexActivitiesForSpotlight([{ ...items[0], title: 'Run' }]);
  expect(mockIndex).toHaveBeenCalledTimes(3);
  mockIndex.mockRejectedValueOnce(new Error('native failure'));
  expect(await indexActivitiesForSpotlight(items)).toBe(false);
  expect(await indexActivitiesForSpotlight(items)).toBe(true);
  expect(mockIndex).toHaveBeenCalledTimes(5);
});

it('serializes indexing and clearing so an older in-flight write cannot restore cleared results', async () => {
  await clearSpotlightActivities();
  mockIndex.mockClear();
  mockClear.mockClear();
  let finish!: () => void;
  mockIndex.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const first = indexActivitiesForSpotlight([{ id: 'a', title: 'Walk', status: 'planned' }] as Activity[]);
  await Promise.resolve();
  const clear = clearSpotlightActivities();
  await Promise.resolve();
  expect(mockClear).not.toHaveBeenCalled();
  finish();
  await Promise.all([first, clear]);
  expect(mockClear).toHaveBeenCalledTimes(1);
  await indexActivitiesForSpotlight([{ id: 'a', title: 'Walk', status: 'planned' }] as Activity[]);
  expect(mockIndex).toHaveBeenCalledTimes(2);
});
