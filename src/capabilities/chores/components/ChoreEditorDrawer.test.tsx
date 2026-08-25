import * as React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { createChoreDraft } from '../domain/choreCreation';
import { createChoreLearningRecord } from '../domain/choreLearning';
import { BottomDrawer } from '../../../ui/BottomDrawer';
import { ChoreEditorDrawer } from './ChoreEditorDrawer';

describe('ChoreEditorDrawer', () => {
  const record = createChoreLearningRecord();
  const draft = createChoreDraft('Sweep the porch', record.members);

  it('is the immediately editable chore drawer and shows non-blocking AI progress', () => {
    const onChange = jest.fn();
    const screen = renderWithProviders(
      <ChoreEditorDrawer
        visible
        draft={draft}
        members={record.members}
        tokensEnabled={false}
        enriching
        mode="create"
        onChange={onChange}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const editorDrawer = screen.UNSAFE_getAllByType(BottomDrawer)
      .find((drawer) => drawer.props.visible);

    expect(editorDrawer?.props.snapPoints).toEqual(['100%']);
    expect(editorDrawer?.props.keyboardBehavior).toBe('resize');
    expect(editorDrawer?.props.footer).toMatchObject({
      primaryAction: {
        label: 'Add chore',
      },
    });
    expect(screen.getByText('New chore')).toBeTruthy();
    expect(screen.getByLabelText('Adding details')).toBeTruthy();
    expect(screen.getByLabelText('Chore').props.editable).not.toBe(false);
    expect(screen.getByLabelText('Chore').props.autoFocus).toBe(true);
    expect(screen.getByLabelText('Add chore')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Chore'), 'Sweep both porches');
    expect(onChange).toHaveBeenCalledWith('title', 'Sweep both porches');
  });

  it('presents the same form as root-chore management when editing', () => {
    const screen = renderWithProviders(
      <ChoreEditorDrawer
        visible
        draft={draft}
        members={record.members}
        tokensEnabled={false}
        enriching={false}
        mode="edit"
        onChange={jest.fn()}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Edit chore')).toBeTruthy();
    expect(screen.getByLabelText('Save chore')).toBeTruthy();
    expect(screen.getByLabelText('Chore').props.autoFocus).toBe(false);
    expect(screen.queryByText('New chore')).toBeNull();
  });

  it('keeps single-line controls in compact rows while the finish line stays stacked', () => {
    const screen = renderWithProviders(
      <ChoreEditorDrawer
        visible
        draft={draft}
        members={record.members}
        tokensEnabled
        enriching={false}
        mode="edit"
        onChange={jest.fn()}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const compactLabelStyle = StyleSheet.flatten(screen.getByText('For').props.style);

    for (const label of ['Repeats', 'Reward']) {
      const labelStyle = StyleSheet.flatten(screen.getByText(label).props.style);
      expect(labelStyle).toMatchObject({
        fontFamily: compactLabelStyle.fontFamily,
        fontSize: compactLabelStyle.fontSize,
        lineHeight: compactLabelStyle.lineHeight,
        color: compactLabelStyle.color,
      });
      expect(labelStyle.fontWeight).toBe(compactLabelStyle.fontWeight);
    }

    expect(screen.getByText('What done looks like')).toBeTruthy();
    for (const label of ['Require a photo', 'Require approval']) {
      const labelStyle = StyleSheet.flatten(screen.getByText(label).props.style);
      expect(labelStyle).toMatchObject({
        fontFamily: compactLabelStyle.fontFamily,
        fontSize: compactLabelStyle.fontSize,
        lineHeight: compactLabelStyle.lineHeight,
        color: compactLabelStyle.color,
      });
    }
  });

  it('presents photo and caregiver approval as independent root-chore policies', () => {
    const onChange = jest.fn();
    const screen = renderWithProviders(
      <ChoreEditorDrawer
        visible
        draft={draft}
        members={record.members}
        tokensEnabled={false}
        enriching={false}
        mode="edit"
        onChange={onChange}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const photoSwitch = screen.getByLabelText('Require a photo');
    const approvalSwitch = screen.getByLabelText('Require approval');

    expect(photoSwitch.props.accessibilityState).toMatchObject({ checked: false });
    expect(approvalSwitch.props.accessibilityState).toMatchObject({ checked: false });

    fireEvent.press(photoSwitch);
    fireEvent.press(approvalSwitch);

    expect(onChange).toHaveBeenCalledWith('photoPolicy', 'required');
    expect(onChange).toHaveBeenCalledWith('reviewPolicy', 'caregiver_review');
  });

  it('keeps editable field labels neutral while focused', () => {
    const screen = renderWithProviders(
      <ChoreEditorDrawer
        visible
        draft={draft}
        members={record.members}
        tokensEnabled
        enriching={false}
        mode="edit"
        onChange={jest.fn()}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const doneInput = screen.getByLabelText('What done looks like');
    const labelBeforeFocus = StyleSheet.flatten(screen.getByText('What done looks like').props.style);

    fireEvent(doneInput, 'focus', { nativeEvent: {} });

    const labelWhileFocused = StyleSheet.flatten(screen.getByText('What done looks like').props.style);
    expect(labelWhileFocused.color).toBe(labelBeforeFocus.color);
  });

  it('keeps token reward absent until the household enables tokens', () => {
    const common = {
      visible: true,
      draft,
      members: record.members,
      enriching: false,
      mode: 'create' as const,
      onChange: jest.fn(),
      onAdd: jest.fn(),
      onClose: jest.fn(),
    };
    const { queryByLabelText, rerender } = renderWithProviders(
      <ChoreEditorDrawer {...common} tokensEnabled={false} />,
    );

    expect(queryByLabelText('Token reward')).toBeNull();
    rerender(<ChoreEditorDrawer {...common} tokensEnabled />);
    expect(queryByLabelText('Token reward')).toBeTruthy();
  });

  it('reuses the full to-do repeat picker while calling no repeat one time', () => {
    const onChange = jest.fn();
    const screen = renderWithProviders(
      <ChoreEditorDrawer
        visible
        draft={draft}
        members={record.members}
        tokensEnabled={false}
        enriching={false}
        mode="create"
        onChange={onChange}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByDisplayValue('One time')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Edit repeat schedule, one time'));
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('Yearly')).toBeTruthy();
    expect(screen.getByText('Custom...')).toBeTruthy();

    fireEvent.press(screen.getByTestId('e2e.activityDetail.repeat.daily'));
    expect(onChange).toHaveBeenCalledWith('repeatRule', 'daily');
    expect(onChange).toHaveBeenCalledWith('repeatCustom', undefined);
  });

  it('reveals what happens when repeating work is missed', () => {
    const onChange = jest.fn();
    const screen = renderWithProviders(
      <ChoreEditorDrawer
        visible
        draft={{ ...draft, repeatRule: 'weekly', repeatBasis: 'scheduled' }}
        members={record.members}
        tokensEnabled={false}
        enriching={false}
        mode="edit"
        onChange={onChange}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('What happens if this chore is missed?')).toBeTruthy();
    expect(screen.getByDisplayValue('Start fresh next time')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('What happens if this chore is missed?'));
    fireEvent.press(screen.getByText('Keep open until done'));
    expect(onChange).toHaveBeenCalledWith('repeatBasis', 'after_completion');
  });

  it('keeps miss behavior absent for one-time chores', () => {
    const screen = renderWithProviders(
      <ChoreEditorDrawer
        visible
        draft={draft}
        members={record.members}
        tokensEnabled={false}
        enriching={false}
        mode="create"
        onChange={jest.fn()}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('What happens if this chore is missed?')).toBeNull();
  });
});
