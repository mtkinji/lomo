import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { HiddenMealsDrawer } from './HiddenMealsDrawer';

describe('Hidden Meals drawer', () => {
  const renderDrawer = (children: ReactElement) => render(
    <SafeAreaProvider initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, right: 0, bottom: 34, left: 0 },
    }}>
      {children}
    </SafeAreaProvider>,
  );

  it('shows hidden meals and restores one directly', () => {
    const onRestore = jest.fn();
    const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };
    const screen = renderDrawer(
      <HiddenMealsDrawer visible recipes={[projection]} onClose={jest.fn()} onRestore={onRestore} />,
    );

    expect(screen.getByText('Hidden meals')).toBeTruthy();
    expect(screen.getByText("Grandma Ruth's Cake")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Show Grandma Ruth's Cake again"));
    expect(onRestore).toHaveBeenCalledWith(projection);
  });

  it('explains when every hidden meal has already been restored', () => {
    const screen = renderDrawer(
      <HiddenMealsDrawer visible recipes={[]} onClose={jest.fn()} onRestore={jest.fn()} />,
    );

    expect(screen.getByText('Nothing is hidden.')).toBeTruthy();
  });
});
