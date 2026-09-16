import React from 'react';
import { act } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { PortalHost } from '../../../ui/Portal';
import { WorkflowFeedbackProvider } from '../../workflow-feedback/workflowFeedbackRuntime';
import { projectScreenTimeGuideActions } from '../domain/screenTimeGuideActions';
import { ScreenTimeUnlockGuide } from './ScreenTimeUnlockGuide';

jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView } = require('react-native');
  const { Portal } = require('../../../ui/Portal');
  return {
    BottomDrawer: ({ visible, children, presentation }: {
      visible: boolean; children: React.ReactNode; presentation: string;
    }) => visible
      ? presentation === 'inline' ? <Portal name="screen-time-test">{children}</Portal> : children
      : null,
    BottomDrawerScrollView: ScrollView,
  };
});

jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));
jest.mock('../../../services/analytics/useFeatureFlag', () => ({
  useFeatureFlag: () => false,
}));

it('keeps inline feedback usable when the guide portal sits outside the feedback provider', async () => {
  const view = renderWithProviders(<>
    <WorkflowFeedbackProvider>
      <ScreenTimeUnlockGuide
        visible rules={[]} unresolvedCount={1} result={null} busy={false}
        feedbackSourceKey="screen-time-episode"
        actions={projectScreenTimeGuideActions({ actor: { kind: 'self_adult' }, activeRules: [] })}
        onDismiss={jest.fn()} onDoThisFirst={jest.fn()} onOpenTemporarily={jest.fn()}
      />
    </WorkflowFeedbackProvider>
    <PortalHost />
  </>);

  await act(async () => { await Promise.resolve(); });

  expect(view.getByText('Another Screen Time rule')).toBeTruthy();
  expect(view.getByLabelText('Close Screen Time guide')).toBeTruthy();
});
