import { fireEvent, render } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { MealSetupDrawer } from './MealSetupDrawer';

jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView, View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: any) => visible ? <View>{children}</View> : null,
    BottomDrawerScrollView: ({ children }: any) => <ScrollView>{children}</ScrollView>,
  };
});

describe('Meal setup drawer', () => {
  it('inherits the compact standard drawer title', () => {
    const source = readFileSync(path.join(__dirname, 'MealSetupDrawer.tsx'), 'utf8');

    expect(source).not.toContain('titleVariant="md"');
  });

  it('offers only the two useful setup choices and remains skippable', () => {
    const onOpenDiners = jest.fn();
    const onOpenFoodNeeds = jest.fn();
    const onDone = jest.fn();
    const onNotNow = jest.fn();
    const screen = render(<MealSetupDrawer
      visible dinerSummary="Everyone" foodNeedsSummary="Add"
      onOpenDiners={onOpenDiners} onOpenFoodNeeds={onOpenFoodNeeds}
      onDone={onDone} onNotNow={onNotNow}
    />);

    expect(screen.getByText('Make recipes fit your household')).toBeTruthy();
    expect(screen.queryByText(/two quick choices|useful quantities/i)).toBeNull();
    fireEvent.press(screen.getByText('Usually cooking for'));
    fireEvent.press(screen.getByText('Food needs'));
    fireEvent.press(screen.getByText('Done'));
    fireEvent.press(screen.getByText('Not now'));
    expect(onOpenDiners).toHaveBeenCalled();
    expect(onOpenFoodNeeds).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
    expect(onNotNow).toHaveBeenCalled();
    expect(screen.queryByText(/diet|dislike|reminder|notification|adult serving|kid serving/i)).toBeNull();
  });
});
