import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { CheckinDraft } from '../../services/checkinDrafts';
import { PendingCheckinDraftCard } from './PendingCheckinDraftCard';

const draft: CheckinDraft = {
  id: 'draft-1', goalId: 'goal-1', partnerCircleKey: 'partners', items: [],
  draftText: 'Original progress.', status: 'active',
  createdAt: '2026-09-10T12:00:00Z', updatedAt: '2026-09-10T12:00:00Z',
  lastPromptedAt: null, lastDismissedAt: null, sentAt: null, skippedAt: null, needsReapprovalAt: null,
};

it('retains edited text through Done and reopening, and sends only on Send', () => {
  const send = jest.fn();
  const { getByLabelText, getByText } = renderWithProviders(
    <PendingCheckinDraftCard draft={draft} partnerNames={['Pat']} onSend={send} onSkip={jest.fn()} onRemoveItem={jest.fn()} />,
  );
  fireEvent.press(getByLabelText('Edit check-in'));
  fireEvent.changeText(getByLabelText('Edit check-in message'), 'Revised progress.\nReady for review.');
  fireEvent.press(getByLabelText('Finish editing'));
  expect(send).not.toHaveBeenCalled();
  expect(getByText('Revised progress.\nReady for review.')).toBeTruthy();
  fireEvent.press(getByLabelText('Edit check-in'));
  expect(getByLabelText('Edit check-in message').props.value).toBe('Revised progress.\nReady for review.');
  fireEvent.press(getByLabelText('Finish editing'));
  fireEvent.press(getByLabelText('Send check-in'));
  expect(send).toHaveBeenCalledWith('Revised progress.\nReady for review.');
});

it('uses an updated parent draft instead of sending text from the previous draft', () => {
  const send = jest.fn();
  const props = { partnerNames: ['Pat'], onSend: send, onSkip: jest.fn(), onRemoveItem: jest.fn() };
  const { getByLabelText, rerender } = renderWithProviders(<PendingCheckinDraftCard {...props} draft={draft} />);
  fireEvent.press(getByLabelText('Edit check-in'));
  fireEvent.changeText(getByLabelText('Edit check-in message'), 'Unsent local wording.');
  rerender(<PendingCheckinDraftCard {...props} draft={{ ...draft, id: 'draft-2', draftText: 'New collected progress.' }} />);
  expect(getByLabelText('Edit check-in message').props.value).toBe('New collected progress.');
  fireEvent.press(getByLabelText('Send check-in'));
  expect(send).toHaveBeenCalledWith('New collected progress.');
});
