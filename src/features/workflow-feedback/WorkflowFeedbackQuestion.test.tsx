import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getWorkflowFeedbackPrompt } from './workflowFeedbackRegistry';
import { WorkflowFeedbackQuestion } from './WorkflowFeedbackQuestion';

describe('WorkflowFeedbackQuestion', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders one question with five accessible categorical choices and no text input', () => {
    const result = render(<WorkflowFeedbackQuestion
      prompt={getWorkflowFeedbackPrompt('money_rebalance_satisfaction_v1')}
      onSubmit={jest.fn()}
      onReason={jest.fn()}
      onDismiss={jest.fn()}
      onComplete={jest.fn()}
    />);

    expect(screen.getByRole('header', { name: 'How satisfied are you with this spending plan?' })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(result.UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  });

  it('acknowledges a positive response and completes after a short delay', () => {
    const onSubmit = jest.fn();
    const onComplete = jest.fn();
    render(<WorkflowFeedbackQuestion
      prompt={getWorkflowFeedbackPrompt('money_rebalance_satisfaction_v1')}
      onSubmit={onSubmit}
      onReason={jest.fn()}
      onDismiss={jest.fn()}
      onComplete={onComplete}
    />);

    fireEvent.press(screen.getByRole('button', { name: 'Very satisfied' }));
    expect(onSubmit).toHaveBeenCalledWith(5);
    expect(screen.getByText('Thanks — that helps.')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(500); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('offers only bounded reasons after a low or mixed response', () => {
    const onSubmit = jest.fn();
    const onReason = jest.fn();
    const onComplete = jest.fn();
    render(<WorkflowFeedbackQuestion
      prompt={getWorkflowFeedbackPrompt('money_rebalance_satisfaction_v1')}
      onSubmit={onSubmit}
      onReason={onReason}
      onDismiss={jest.fn()}
      onComplete={onComplete}
    />);

    fireEvent.press(screen.getByRole('button', { name: 'Neutral' }));
    expect(onSubmit).toHaveBeenCalledWith(3);
    expect(screen.getByText('What made it feel that way?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: "I couldn't tell what changed" }));
    expect(onReason).toHaveBeenCalledWith('result_unclear');
    fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('lets the customer skip the optional reason', () => {
    const onComplete = jest.fn();
    render(<WorkflowFeedbackQuestion
      prompt={getWorkflowFeedbackPrompt('money_transaction_correction_ease_v1')}
      onSubmit={jest.fn()}
      onReason={jest.fn()}
      onDismiss={jest.fn()}
      onComplete={onComplete}
    />);
    fireEvent.press(screen.getByRole('button', { name: 'Difficult' }));
    fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
