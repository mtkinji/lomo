import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../../../test/renderWithProviders';
import { createChoreLearningRecord, type ChoreOccurrence } from '../domain/choreLearning';
import { ChoreCorrectionDrawer } from './ChoreCorrectionDrawer';

describe('ChoreCorrectionDrawer', () => {
  const record = createChoreLearningRecord();
  const member = record.members.find((candidate) => candidate.id === 'member-charlie')!;
  const current = record.occurrences.find(
    (occurrence) => occurrence.activitySeriesId === 'activity-series-feed-scout',
  )!;
  const candidate = (scheduledDate: string): ChoreOccurrence => ({
    ...current,
    activityOccurrenceId: `feed-scout-${scheduledDate}`,
    scheduledDate,
    state: 'missed',
  });

  it('preselects one eligible yesterday and keeps today explicitly open', () => {
    const onSubmit = jest.fn();
    const screen = renderWithProviders(
      <ChoreCorrectionDrawer
        visible
        currentOccurrence={current}
        candidates={[candidate('2026-08-19')]}
        member={member}
        now={new Date('2026-08-20T15:00:00.000Z')}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('Count an earlier chore')).toBeTruthy();
    expect(screen.getByLabelText('Yesterday, Wednesday, Aug 19').props.accessibilityState)
      .toEqual({ checked: true });
    expect(screen.getByText("A caregiver will confirm it. Today’s chore stays open.")).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Ask caregiver to count it'));
    expect(onSubmit).toHaveBeenCalledWith(['feed-scout-2026-08-19']);
  });

  it('supports selecting several missed dates in one request', () => {
    const onSubmit = jest.fn();
    const screen = renderWithProviders(
      <ChoreCorrectionDrawer
        visible
        currentOccurrence={current}
        candidates={[candidate('2026-08-19'), candidate('2026-08-18')]}
        member={member}
        now={new Date('2026-08-20T15:00:00.000Z')}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Ask caregiver to count earlier chores')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Yesterday, Wednesday, Aug 19'));
    fireEvent.press(screen.getByLabelText('Tuesday, Aug 18'));
    expect(screen.getByLabelText('Ask caregiver to count 2 days')).toBeEnabled();
    fireEvent.press(screen.getByLabelText('Ask caregiver to count 2 days'));
    expect(onSubmit).toHaveBeenCalledWith([
      'feed-scout-2026-08-19',
      'feed-scout-2026-08-18',
    ]);
  });
});
