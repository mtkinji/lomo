import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlayerIdentityEditor } from '../PlayerIdentityEditor';

const renderEditor = (overrides: Partial<React.ComponentProps<typeof PlayerIdentityEditor>> = {}) => {
  const onSave = jest.fn();
  const screen = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, right: 0, bottom: 34, left: 0 } }}>
      <PlayerIdentityEditor
        visible
        initial={{ displayName: 'Charlie' }}
        eyebrow="REMEMBERED PLAYER"
        title="Customize Charlie"
        saveLabel="Save on this device"
        onClose={jest.fn()}
        onSave={onSave}
        onRemove={jest.fn()}
        removeLabel="Remove remembered name"
        secondaryLabel="Use these choices for my profile"
        onSecondary={jest.fn()}
        onPreviewSuccess={jest.fn()}
        onPreviewFailure={jest.fn()}
        {...overrides}
      />
    </SafeAreaProvider>,
  );
  return { screen, onSave };
};

describe('PlayerIdentityEditor', () => {
  it('pins save outside the scrollable choices and submits from the keyboard', () => {
    const { screen, onSave } = renderEditor();
    const body = screen.getByTestId('keyboard-safe-form-body');
    const footer = screen.getByTestId('keyboard-safe-form-footer');
    const input = screen.getByLabelText('Player name');

    expect(footer).toContainElement(screen.getByText('Save on this device'));
    expect(body).toContainElement(screen.getByText('Use these choices for my profile'));
    expect(body).toContainElement(screen.getByText('Remove remembered name'));
    expect(input.props.returnKeyType).toBe('done');

    fireEvent(input, 'submitEditing');
    expect(onSave).toHaveBeenCalledWith('Charlie', expect.any(Object));
  });
});
