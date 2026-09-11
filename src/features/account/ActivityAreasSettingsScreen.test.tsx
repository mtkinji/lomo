import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { Alert, Keyboard, ScrollView } from 'react-native';
import { ActivityAreasSettingsScreen } from './ActivityAreasSettingsScreen';
import { KeyboardAwareScrollView } from '../../ui/KeyboardAwareScrollView';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));
jest.mock('../../ui/primitives', () => ({
  ...jest.requireActual('../../ui/Typography'),
  Input: jest.requireActual('../../ui/Input').Input,
  HStack: jest.requireActual('react-native').View,
  VStack: jest.requireActual('react-native').View,
}));
jest.mock('../../store/useAppStore', () => ({ useAppStore: (select: any) => select({ activityAreas: [
  { id: 'work', label: 'Work', scheduling: { fallbackMode: 'work' } },
] }) }));
jest.mock('./actions/activityAreaActionsBoundary', () => ({ activityAreaActions: { create: (...args: unknown[]) => mockCreate(...args), update: (...args: unknown[]) => mockUpdate(...args), delete: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));

describe('Areas keyboard-safe editing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockReset();
    jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('gives the bottom Add area field a focus-reveal host and keeps Add tappable with the keyboard open', () => {
    const view = render(<ActivityAreasSettingsScreen />);
    const host = view.UNSAFE_getByType(KeyboardAwareScrollView);
    expect(host.findByProps({ accessibilityLabel: 'New area name' })).toBeTruthy();
    expect(view.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
    fireEvent.changeText(view.getByLabelText('New area name'), ' Church ');
    expect(mockCreate).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Add'));
    expect(mockCreate).toHaveBeenCalledWith({ label: 'Church' });
    expect(view.getByLabelText('New area name').props.value).toBe('');
  });

  it.each(['header', 'keyboard'] as const)('finishes a rename from %s Done without an inline Save button', (action) => {
    const view = render(<ActivityAreasSettingsScreen />);
    expect(view.queryByRole('button', { name: 'Done' })).toBeNull();
    fireEvent.press(view.getByLabelText('Rename Work'));
    const done = within(view.getByTestId('page.header')).getByRole('button', { name: 'Done' });
    expect(view.queryByText('Save')).toBeNull();
    const input = view.getByLabelText('Area name');
    expect(input.props.returnKeyType).toBe('done');
    expect(input.props.enablesReturnKeyAutomatically).toBe(true);
    expect(input.props.submitBehavior).toBe('submit');
    fireEvent.changeText(input, ' Studio ');
    expect(mockUpdate).not.toHaveBeenCalled();
    if (action === 'header') fireEvent.press(done);
    else fireEvent(input, 'submitEditing');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ label: 'Studio' }));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(view.queryByLabelText('Area name')).toBeNull();
    expect(view.queryByRole('button', { name: 'Done' })).toBeNull();
  });

  it.each(['', '   '])('keeps an invalid rename draft open instead of treating Done as success: %p', (draft) => {
    const view = render(<ActivityAreasSettingsScreen />);
    fireEvent.press(view.getByLabelText('Rename Work'));
    fireEvent.changeText(view.getByLabelText('Area name'), draft);
    const done = view.getByRole('button', { name: 'Done' });
    expect(done).toBeDisabled();
    fireEvent.press(done);
    fireEvent(view.getByLabelText('Area name'), 'submitEditing');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(Keyboard.dismiss).not.toHaveBeenCalled();
    expect(view.getByLabelText('Area name').props.value).toBe(draft);
  });

  it('keeps the draft and keyboard available if renaming fails', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUpdate.mockImplementationOnce(() => { throw new Error('An area already has that name.'); });
    const view = render(<ActivityAreasSettingsScreen />);
    fireEvent.press(view.getByLabelText('Rename Work'));
    fireEvent.changeText(view.getByLabelText('Area name'), 'Home');
    fireEvent(view.getByLabelText('Area name'), 'submitEditing');
    expect(Alert.alert).toHaveBeenCalledWith('Unable to rename area', 'An area already has that name.');
    expect(view.getByLabelText('Area name').props.value).toBe('Home');
    expect(Keyboard.dismiss).not.toHaveBeenCalled();
  });
});
