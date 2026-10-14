import { act } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { activityFixture, resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import * as recommendations from '../activities/activitySearchAlgorithm';
import * as catalog from '../../capabilities/recipes/data/starterRecipeCatalog';
import { GlobalSearchDrawer } from './GlobalSearchDrawer';

jest.mock('../../ui/BottomDrawer', () => ({
  BottomDrawer: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? children : null,
}));
jest.mock('../../services/chapters', () => ({ fetchMyChapters: jest.fn(async () => []) }));

it('does no inventory or recipe work while Search is closed, including after a previous visit', () => {
  resetAllStores();
  const recommend = jest.spyOn(recommendations, 'getRecommendedActivities');
  const inventory = jest.spyOn(catalog, 'buildRecipeLibraryInventory');
  const view = renderWithProviders(<GlobalSearchDrawer />);
  act(() => { useAppStore.setState({ activities: [activityFixture({ title: 'Walk outdoors' })] }); });
  expect(recommend).not.toHaveBeenCalled();
  expect(inventory).not.toHaveBeenCalled();
  act(() => { useAppStore.getState().openGlobalSearch({ initialScope: 'activities' }); });
  expect(view.getByText('Walk outdoors')).toBeTruthy();
  expect(recommend).toHaveBeenCalled();
  act(() => { useAppStore.getState().closeGlobalSearch(); });
  recommend.mockClear();
  inventory.mockClear();
  act(() => { useAppStore.setState({ activities: [activityFixture({ title: 'Updated to-do' })] }); });
  expect(recommend).not.toHaveBeenCalled();
  expect(inventory).not.toHaveBeenCalled();
  act(() => { useAppStore.getState().openGlobalSearch({ initialScope: 'activities' }); });
  expect(view.getByText('Updated to-do')).toBeTruthy();
  recommend.mockRestore();
  inventory.mockRestore();
});
