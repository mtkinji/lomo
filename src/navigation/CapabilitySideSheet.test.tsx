import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { CapabilitySideSheet } from './CapabilitySideSheet';
import {
  CapabilityMenuStateProvider,
  useCapabilityMenuActions,
  useCapabilityMenuOpen,
} from './CapabilityMenuStateContext';

jest.mock('../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));
jest.mock('react-native-gesture-handler', () => {
  const gesture: Record<string, jest.Mock> = {};
  for (const method of ['manualActivation', 'onTouchesDown', 'onTouchesMove', 'onBegin', 'onUpdate', 'onEnd']) {
    gesture[method] = jest.fn(() => gesture);
  }
  return {
    Gesture: { Pan: () => gesture },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

function OpenButton() {
  const { openMenu } = useCapabilityMenuActions();
  return <Pressable testID="open-menu" onPress={openMenu} />;
}

function Menu({ onRender }: { onRender: () => void }) {
  const open = useCapabilityMenuOpen();
  if (open) onRender();
  return <Text>{open ? 'open' : 'closed'}</Text>;
}

it('starts sliding before menu bookkeeping or rendering can delay feedback to a tap', () => {
  const order: string[] = [];
  const timing = jest.spyOn(require('react-native-reanimated'), 'withTiming')
    .mockImplementation((value: unknown) => {
      order.push('animation');
      return value;
    });
  const view = render(
    <CapabilityMenuStateProvider onMenuOpened={() => order.push('bookkeeping')}>
      <CapabilitySideSheet menu={<Menu onRender={() => order.push('menu-render')} />}>
        <OpenButton />
      </CapabilitySideSheet>
    </CapabilityMenuStateProvider>,
  );
  order.length = 0;
  fireEvent.press(view.getByTestId('open-menu'));
  expect(order[0]).toBe('animation');
  expect(order).toContain('bookkeeping');
  expect(order).toContain('menu-render');
  expect(withTiming).toHaveBeenLastCalledWith(1, expect.objectContaining({ duration: 240 }));
  order.length = 0;
  fireEvent.press(view.getByTestId('capability.menu.cover'));
  expect(order[0]).toBe('animation');
  expect(withTiming).toHaveBeenLastCalledWith(0, expect.objectContaining({ duration: 240 }));
  expect(view.queryByTestId('capability.menu.cover')).toBeNull();
  fireEvent.press(view.getByTestId('open-menu'));
  expect(view.getByTestId('capability.menu.cover')).toBeTruthy();
  timing.mockRestore();
});

it('still respects Reduce Motion when opening directly from the tap handler', async () => {
  const reduceMotion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const timing = jest.spyOn(require('react-native-reanimated'), 'withTiming');
  const view = render(
    <CapabilityMenuStateProvider>
      <CapabilitySideSheet menu={<Text>Menu</Text>}>
        <OpenButton />
      </CapabilitySideSheet>
    </CapabilityMenuStateProvider>,
  );
  await waitFor(() => expect(timing).toHaveBeenLastCalledWith(0, expect.objectContaining({ duration: 0 })));
  fireEvent.press(view.getByTestId('open-menu'));
  expect(timing).toHaveBeenLastCalledWith(1, expect.objectContaining({ duration: 0 }));
  timing.mockRestore();
  reduceMotion.mockRestore();
});
