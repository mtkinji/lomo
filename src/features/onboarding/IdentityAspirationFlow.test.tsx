import React from 'react';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn() },
}));

jest.mock('../../services/ai', () => ({
  sendCoachChat: jest.fn(),
  generateArcBannerVibeQuery: jest.fn(),
}));

jest.mock('../../services/unsplash', () => ({
  searchUnsplashPhotos: jest.fn(),
  trackUnsplashDownload: jest.fn(),
  UnsplashError: class UnsplashError extends Error {},
  withUnsplashReferral: (url: string) => url,
}));

jest.mock('../arcs/arcBannerPrefill', () => ({
  ensureArcBannerPrefill: jest.fn(),
}));

jest.mock('../arcs/arcGuidance', () => ({
  ensureArcGuide: jest.fn(),
}));

jest.mock('../arcs/arcHeroSelector', () => ({
  pickHeroForArc: jest.fn(() => ({ image: null })),
}));

jest.mock('../../services/paywall', () => ({
  openPaywallInterstitial: jest.fn(),
}));

jest.mock('../../ui/primitives', () => {
  const actual = jest.requireActual('../../ui/primitives');
  const React = require('react');
  const { View, Text } = require('react-native');
  type MockSurveyStep = {
    title?: string;
  };
  type MockSurveyCardProps = {
    steps: MockSurveyStep[];
    currentStepIndex: number;
  };
  return {
    ...actual,
    SurveyCard: ({ steps, currentStepIndex }: MockSurveyCardProps) => (
      <View testID="mock-survey-card">
        <Text>{steps[currentStepIndex]?.title}</Text>
      </View>
    ),
  };
});

import { renderWithProviders } from '../../test/renderWithProviders';
import type { WorkflowRuntimeContextValue } from '../ai/WorkflowRuntimeContext';
import type { ChatTimelineController } from '../ai/AiChatScreen';
import { IdentityAspirationFlow } from './IdentityAspirationFlow';
import { firstTimeOnboardingWorkflow } from '../ai/workflows/firstTimeOnboardingWorkflow';

function makeRuntime(overrides: Partial<WorkflowRuntimeContextValue> = {}): WorkflowRuntimeContextValue {
  return {
    definition: firstTimeOnboardingWorkflow,
    instance: {
      id: 'ftux-test-instance',
      definitionId: 'firstTimeOnboarding',
      status: 'in_progress',
      currentStepId: 'soft_start',
      collectedData: {},
    },
    completeStep: jest.fn(),
    invokeAgentStep: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('IdentityAspirationFlow FTUX intro handoff', () => {
  it('shows the first survey card after the streamed intro finishes', async () => {
    const runtime = makeRuntime();
    const chatController: ChatTimelineController = {
      appendUserMessage: jest.fn(),
      streamAssistantReplyFromWorkflow: jest.fn((_text, _baseId, opts) => {
        opts?.onDone?.();
      }),
      getHistory: jest.fn(() => []),
      getTimeline: jest.fn(() => []),
    };

    const chatControllerRef = { current: chatController };

    const screen = renderWithProviders(
      <IdentityAspirationFlow chatControllerRef={chatControllerRef} />,
      { workflowRuntime: runtime }
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-survey-card')).toBeTruthy();
    });

    expect(screen.getByText('What kind of thing is it?')).toBeTruthy();
    expect(runtime.completeStep).toHaveBeenCalledWith('soft_start');
  });

  it('falls forward into the survey when the stream callback is delayed or dropped', async () => {
    jest.useFakeTimers();

    const runtime = makeRuntime();
    const chatController: ChatTimelineController = {
      appendUserMessage: jest.fn(),
      streamAssistantReplyFromWorkflow: jest.fn(),
      getHistory: jest.fn(() => []),
      getTimeline: jest.fn(() => []),
    };

    const chatControllerRef = { current: chatController };

    const screen = renderWithProviders(
      <IdentityAspirationFlow chatControllerRef={chatControllerRef} />,
      { workflowRuntime: runtime }
    );

    act(() => {
      jest.advanceTimersByTime(9000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('mock-survey-card')).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it('does not start a duplicate visible intro stream on rerender', async () => {
    jest.useFakeTimers();

    const runtime = makeRuntime();
    const chatController: ChatTimelineController = {
      appendUserMessage: jest.fn(),
      streamAssistantReplyFromWorkflow: jest.fn(),
      getHistory: jest.fn(() => []),
      getTimeline: jest.fn(() => []),
    };

    const screen = renderWithProviders(
      <IdentityAspirationFlow chatControllerRef={{ current: chatController }} />,
      { workflowRuntime: runtime }
    );

    screen.rerender(
      <IdentityAspirationFlow chatControllerRef={{ current: chatController }} />
    );

    expect(chatController.streamAssistantReplyFromWorkflow).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(9000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('mock-survey-card')).toBeTruthy();
    });

    jest.useRealTimers();
  });
});
