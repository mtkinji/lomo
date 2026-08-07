import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FoodHomeScreen } from './FoodHomeScreen';

jest.mock('../../capabilities/meal-planning/data/mealPlanningRepository',()=>({createMealPlanningRepository:()=>({list:jest.fn().mockResolvedValue([])})}));
jest.mock('../../capabilities/groceries/data/groceryRepository',()=>({createGroceryRepository:()=>({list:jest.fn().mockResolvedValue([])})}));
jest.mock('../../capabilities/recipes/runtime/useRecipeStore',()=>({useRecipeStore:(selector:any)=>selector({recipes:[],status:'ready'})}));
jest.mock('../../capabilities/recipes/data/recipeCookRepository',()=>({createRecipeCookRepository:()=>({listRecent:jest.fn().mockResolvedValue([])})}));
jest.mock('../../store/useAppStore',()=>({useAppStore:(selector:any)=>selector({authIdentity:null})}));

describe('Food home', () => {
  it('leads with continuation without exposing Meal Plan or Groceries as separate destinations', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const screen = render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><FoodHomeScreen navigation={navigation as never} route={{} as never} /></SafeAreaProvider>);
    await waitFor(()=>expect(screen.getByText('Start planning')).toBeTruthy());
    fireEvent.press(screen.getByText('Add a recipe'));
    expect(screen.queryByText('Meal Plan')).toBeNull();
    expect(screen.queryByText('Groceries')).toBeNull();
    expect(navigation.navigate.mock.calls).toEqual([['RecipeLibrary']]);
  });
});
