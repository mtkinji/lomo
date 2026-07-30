import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { FamilyScreenTimeAgreementCard } from './FamilyScreenTimeAgreementCard';
import type { FamilyScreenTimeAgreementSummary } from './familyScreenTimePresentation';

const appliedSummary: FamilyScreenTimeAgreementSummary = {
  childMembershipId: 'child-1',
  childDisplayName: 'Charlie',
  targetLabel: 'Games',
  scheduleLabel: 'Weekdays, 4–7 PM',
  limitLabel: '30 min/day',
  responsibilityLabel: null,
  childExplanation: 'Games open at 4:00 PM.',
  lifecycle: 'applied',
  nextAction: 'edit',
  issue: null,
};

describe('FamilyScreenTimeAgreementCard', () => {
  it('shows the agreement once with one action and no administrative footer', () => {
    const onAction = jest.fn();
    const { getAllByRole, getAllByText, getByText, queryByText } = renderWithProviders(
      <FamilyScreenTimeAgreementCard summary={appliedSummary} onAction={onAction} />,
    );

    expect(getAllByText('Games')).toHaveLength(1);
    expect(getByText('Weekdays, 4–7 PM · 30 min/day')).toBeTruthy();
    expect(getByText('Games open at 4:00 PM.')).toBeTruthy();
    expect(getByText('Edit')).toBeTruthy();
    expect(getAllByRole('button')).toHaveLength(1);
    expect(queryByText(/authorization|simulated|delivery/i)).toBeNull();

    fireEvent.press(getByText('Edit'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('uses the actionable issue and recovery action when attention is needed', () => {
    const summary: FamilyScreenTimeAgreementSummary = {
      ...appliedSummary,
      lifecycle: 'needs_attention',
      nextAction: 'recover',
      issue: 'Charlie’s iPhone needs attention.',
    };
    const { getAllByRole, getByText } = renderWithProviders(
      <FamilyScreenTimeAgreementCard summary={summary} onAction={jest.fn()} />,
    );

    expect(getByText('Charlie’s iPhone needs attention.')).toBeTruthy();
    expect(getByText('Fix device')).toBeTruthy();
    expect(getAllByRole('button')).toHaveLength(1);
  });
});
