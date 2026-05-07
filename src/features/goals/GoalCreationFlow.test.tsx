import { act } from '@testing-library/react-native';

jest.mock('../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn() },
}));

jest.mock('../../ui/SurveyCard', () => {
  const React = require('react');
  const { View, Pressable, Text } = require('react-native');
  const SurveyCard = ({ steps, currentStepIndex }: any) =>
    React.createElement(
      View,
      { testID: 'mock-survey-card', accessibilityHint: `step:${currentStepIndex}` },
      React.createElement(Text, null, `survey-step-${currentStepIndex}`),
      React.createElement(
        Pressable,
        { accessibilityLabel: 'Render step', testID: 'render-step' },
        steps[currentStepIndex]?.render?.() ?? null,
      ),
    );
  return { SurveyCard, default: SurveyCard };
});

jest.mock('../../ui/primitives', () => {
  const actual = jest.requireActual('../../ui/primitives');
  const React = require('react');
  const { View } = require('react-native');
  return {
    ...actual,
    SurveyCard: ({ steps, currentStepIndex }: any) =>
      React.createElement(
        View,
        { testID: 'mock-survey-card', accessibilityHint: `step:${currentStepIndex}` },
        steps[currentStepIndex]?.render?.() ?? null,
      ),
  };
});

import { renderWithProviders } from '../../test/renderWithProviders';
import { GoalCreationFlow } from './GoalCreationFlow';
import type { WorkflowRuntimeContextValue } from '../ai/WorkflowRuntimeContext';

function makeRuntime(overrides: Partial<WorkflowRuntimeContextValue> = {}): WorkflowRuntimeContextValue {
  return {
    definition: {
      id: 'goalCreation',
      label: 'Goal creation',
      version: 1,
      chatMode: 'goalCreation',
      systemPrompt: '',
      tools: [],
      autoStart: false,
    } as any,
    instance: {
      id: 'inst-1',
      definitionId: 'goalCreation',
      status: 'in_progress',
      currentStepId: 'context_collect',
      collectedData: {},
    } as any,
    completeStep: jest.fn(),
    invokeAgentStep: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('GoalCreationFlow', () => {
  it('renders no goal-creation surface when there is no workflow runtime', () => {
    const { queryByTestId, queryByText } = renderWithProviders(<GoalCreationFlow />);
    expect(queryByTestId('mock-survey-card')).toBeNull();
    expect(queryByText('Recommend a goal')).toBeNull();
    expect(queryByText('Describe my goal')).toBeNull();
  });

  it('renders nothing user-facing when the workflow is not on context_collect', () => {
    const runtime = makeRuntime({
      instance: {
        id: 'inst-1',
        definitionId: 'goalCreation',
        status: 'in_progress',
        currentStepId: 'agent_generate_goals',
        collectedData: {},
      } as any,
    });
    const { queryByTestId, queryByText } = renderWithProviders(<GoalCreationFlow />, {
      workflowRuntime: runtime,
    });
    expect(queryByTestId('mock-survey-card')).toBeNull();
    expect(queryByText('Recommend a goal')).toBeNull();
  });

  it('lands on the describe survey when autoRecommendOnMount is false', () => {
    const runtime = makeRuntime();
    const { getByTestId } = renderWithProviders(
      <GoalCreationFlow autoRecommendOnMount={false} />,
      { workflowRuntime: runtime },
    );
    expect(getByTestId('mock-survey-card')).toBeTruthy();
  });

  it('shows the recommend/describe choice buttons when autoRecommendOnMount is true', async () => {
    jest.useFakeTimers();
    try {
      const runtime = makeRuntime();
      const { findByText, queryByTestId } = renderWithProviders(
        <GoalCreationFlow autoRecommendOnMount />,
        { workflowRuntime: runtime },
      );
      // Survey not yet rendered (we're still in choice phase)
      expect(queryByTestId('mock-survey-card')).toBeNull();
      // Advance past the 300ms timeout that reveals choice buttons
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(await findByText('Recommend a goal')).toBeTruthy();
      expect(await findByText('Describe my goal')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
