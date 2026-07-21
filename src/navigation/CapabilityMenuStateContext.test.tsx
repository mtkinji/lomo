import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import {
  CapabilityMenuStateProvider,
  useCapabilityMenuState,
} from './CapabilityMenuStateContext';

function Harness() {
  const { menuOpen, openMenu, coverMenu } = useCapabilityMenuState();
  return (
    <>
      <Text testID="state">{menuOpen ? 'open' : 'closed'}</Text>
      <Pressable testID="open" onPress={openMenu} />
      <Pressable testID="close" onPress={coverMenu} />
    </>
  );
}

describe('CapabilityMenuStateProvider', () => {
  it('owns one ephemeral open state shared by the shell and nested screens', () => {
    const onMenuOpened = jest.fn();
    const view = render(
      <CapabilityMenuStateProvider onMenuOpened={onMenuOpened}>
        <Harness />
      </CapabilityMenuStateProvider>,
    );

    expect(view.getByTestId('state').props.children).toBe('closed');
    fireEvent.press(view.getByTestId('open'));
    expect(view.getByTestId('state').props.children).toBe('open');
    expect(onMenuOpened).toHaveBeenCalledTimes(1);

    fireEvent.press(view.getByTestId('open'));
    expect(onMenuOpened).toHaveBeenCalledTimes(1);

    fireEvent.press(view.getByTestId('close'));
    expect(view.getByTestId('state').props.children).toBe('closed');
  });
});
