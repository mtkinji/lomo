import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import {
  CapabilityMenuStateProvider,
  useCapabilityMenuActions,
  useCapabilityMenuState,
} from './CapabilityMenuStateContext';
import { HapticsService } from '../services/HapticsService';

jest.mock('../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));

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

function ActionOnlyHarness({ onRender }: { onRender: () => void }) {
  onRender();
  const { openMenu, coverMenu } = useCapabilityMenuActions();
  return (
    <>
      <Pressable testID="action-open" onPress={openMenu} />
      <Pressable testID="action-close" onPress={coverMenu} />
    </>
  );
}

describe('CapabilityMenuStateProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    expect(HapticsService.trigger).toHaveBeenCalledWith('shell.nav.open');

    fireEvent.press(view.getByTestId('open'));
    expect(onMenuOpened).toHaveBeenCalledTimes(1);
    expect(HapticsService.trigger).toHaveBeenCalledTimes(1);

    fireEvent.press(view.getByTestId('close'));
    expect(view.getByTestId('state').props.children).toBe('closed');
    expect(HapticsService.trigger).toHaveBeenLastCalledWith('shell.nav.close');

    fireEvent.press(view.getByTestId('close'));
    expect(HapticsService.trigger).toHaveBeenCalledTimes(2);
  });

  it('does not rerender action-only capability consumers when visibility changes', () => {
    const onRender = jest.fn();
    const view = render(
      <CapabilityMenuStateProvider>
        <ActionOnlyHarness onRender={onRender} />
      </CapabilityMenuStateProvider>,
    );

    expect(onRender).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByTestId('action-open'));
    fireEvent.press(view.getByTestId('action-close'));
    expect(onRender).toHaveBeenCalledTimes(1);
  });
});
