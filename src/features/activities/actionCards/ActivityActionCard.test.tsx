import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ActivityActionCard } from './ActivityActionCard';
import type { ActivityActionCardProjection } from './activityActionCardTypes';

const ready: ActivityActionCardProjection = {
  providerId: 'meal_planning', projectionKind: 'choice_round', state: 'ready', eyebrow: 'Meal Planning',
  title: 'What sounds good?', detail: 'Choose up to three meals.', freshnessLabel: 'Open now',
  primaryAction: { id: 'choose_meals', label: 'Choose meals', accessibilityLabel: 'Choose meals for this plan' },
  secondaryAction: { id: 'pass', label: 'Pass' },
};

describe('ActivityActionCard', () => {
  it('renders a ready projection and only invokes listed actions', () => {
    const invoke = jest.fn();
    const { getByRole, queryByText } = render(
      <ActivityActionCard projection={ready} loading={false} invoking={false} onInvoke={invoke} onRetry={jest.fn()} />,
    );
    fireEvent.press(getByRole('button', { name: 'Choose meals for this plan' }));
    expect(invoke).toHaveBeenCalledWith('choose_meals');
    expect(queryByText(/resourceRef/i)).toBeNull();
    expect(queryByText(/round-1/i)).toBeNull();
  });

  it('suppresses double taps while an invocation is pending', () => {
    const invoke = jest.fn();
    const { getByRole } = render(
      <ActivityActionCard projection={ready} loading={false} invoking onInvoke={invoke} onRetry={jest.fn()} />,
    );
    fireEvent.press(getByRole('button', { name: 'Choose meals for this plan' }));
    expect(invoke).not.toHaveBeenCalled();
    expect(getByRole('button', { name: 'Choose meals for this plan' })).toBeDisabled();
  });

  it('renders finite loading, disconnected, unauthorized, stale, completed, and unavailable states', () => {
    const { getByText, rerender } = render(
      <ActivityActionCard projection={null} loading invoking={false} onInvoke={jest.fn()} onRetry={jest.fn()} />,
    );
    expect(getByText('Loading connected action…')).toBeTruthy();
    for (const state of ['disconnected', 'unauthorized', 'stale', 'completed', 'unavailable'] as const) {
      rerender(<ActivityActionCard projection={{ ...ready, state, primaryAction: null, secondaryAction: null }} loading={false} invoking={false} onInvoke={jest.fn()} onRetry={jest.fn()} />);
      expect(getByText('What sounds good?')).toBeTruthy();
    }
  });

  it('offers retry after a failed resolution', () => {
    const retry = jest.fn();
    const { getByRole } = render(
      <ActivityActionCard projection={{ ...ready, state: 'failed', primaryAction: null, secondaryAction: null }} loading={false} invoking={false} onInvoke={jest.fn()} onRetry={retry} />,
    );
    fireEvent.press(getByRole('button', { name: 'Try connected action again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when there is no binding or resolution work', () => {
    const { toJSON } = render(
      <ActivityActionCard projection={null} loading={false} invoking={false} onInvoke={jest.fn()} onRetry={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });
});
