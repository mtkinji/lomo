import { act, render } from '@testing-library/react-native';
import { createRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Coachmark } from './Coachmark';
import { PortalHost } from './Portal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('./hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => ({ keyboardHeight: 0 }),
}));

describe('Coachmark', () => {
  it('stacks above inline BottomDrawers so drawer controls can be taught', async () => {
    jest.useFakeTimers();
    const targetRef = createRef<View>();
    targetRef.current = {
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => {
        callback(20, 20, 100, 44);
      },
    } as View;

    const screen = render(
      <>
        <Coachmark
          visible
          targetRef={targetRef}
          body={null}
          onDismiss={jest.fn()}
        />
        <PortalHost />
      </>,
    );
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(StyleSheet.flatten(screen.getByTestId('coachmark-overlay').props.style)).toMatchObject({
      zIndex: 3000,
      elevation: 3000,
    });
    screen.unmount();
    jest.useRealTimers();
  });
});
