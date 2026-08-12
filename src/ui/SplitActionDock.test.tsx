import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';

import { SplitActionDock } from './SplitActionDock';

const mockActionDock = jest.fn((props: { leftContent?: React.ReactNode }) => (
  <View testID="canonical-action-dock">{props.leftContent}</View>
));

jest.mock('./ActionDock', () => ({
  ActionDock: (props: { leftContent?: React.ReactNode }) => mockActionDock(props),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('./ActionDockSplitContent', () => {
  const ReactNative = require('react-native');
  return {
    ActionDockSplitContent: () => <ReactNative.View testID="split-action-content" />,
  };
});

describe('SplitActionDock', () => {
  beforeEach(() => {
    mockActionDock.mockClear();
  });

  it('uses the canonical left-anchored ActionDock shell', () => {
    const screen = render(
      <SplitActionDock
        recommendedAction={{ id: 'plan', icon: 'plus', label: 'Add to Meal Plan', accessibilityLabel: 'Add this Meal to the Meal Plan' }}
        menuActions={[]}
        onActionPress={() => undefined}
        menuAccessibilityLabel="Show other Meal actions"
      />,
    );

    expect(screen.getByTestId('canonical-action-dock')).toBeTruthy();
    expect(screen.getByTestId('split-action-content')).toBeTruthy();
    expect(mockActionDock.mock.calls[0][0]).toMatchObject({
      insetX: 24,
      insetBottom: 16,
      safeAreaLift: 'half',
    });
    expect(mockActionDock.mock.calls[0][0].leftContent).toBeTruthy();
  });
});
