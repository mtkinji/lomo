import * as React from 'react';
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
        onChange={onChange}
        onAdd={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const editorDrawer = screen.UNSAFE_getAllByType(BottomDrawer)
      .find((drawer) => drawer.props.visible);

    expect(editorDrawer?.props.snapPoints).toEqual(['100%']);
    expect(screen.getByText('New chore')).toBeTruthy();
    expect(screen.getByLabelText('Adding details')).toBeTruthy();
    expect(screen.getByLabelText('Chore').props.editable).not.toBe(false);
    expect(screen.getByLabelText('Add chore')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Chore'), 'Sweep both porches');
    expect(onChange).toHaveBeenCalledWith('title', 'Sweep both porches');
  });

  it('keeps token reward absent until the household enables tokens', () => {
    const common = {
      visible: true,
      draft,
      members: record.members,
      enriching: false,
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
});
