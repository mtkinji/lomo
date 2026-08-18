import { act, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ExploreNavigator } from './ExploreNavigator';
import { useExploreStore } from '../runtime/useExploreStore';

jest.mock('../screens/ExploreMapScreen', () => ({
  ExploreMapScreen: () => {
    const { Text } = require('react-native');
    return <Text>Explore map ready</Text>;
  },
}));

describe('ExploreNavigator hydration', () => {
  it('keeps Explore behind its own loader until its history has hydrated', async () => {
    let finishHydration: (() => void) | null = null;
    const hasHydrated = jest.spyOn(useExploreStore.persist, 'hasHydrated').mockReturnValue(false);
    const rehydrate = jest.spyOn(useExploreStore.persist, 'rehydrate').mockImplementation(
      () => new Promise<void>((resolve) => { finishHydration = resolve; }),
    );

    const screen = render(
      <NavigationContainer>
        <ExploreNavigator />
      </NavigationContainer>,
    );

    expect(rehydrate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Explore map ready')).toBeNull();

    hasHydrated.mockReturnValue(true);
    await act(async () => finishHydration?.());
    await waitFor(() => expect(screen.getByText('Explore map ready')).toBeTruthy());
  });
});
