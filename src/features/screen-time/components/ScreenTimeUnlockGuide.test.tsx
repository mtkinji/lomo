import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { projectScreenTimeGuideActions } from '../domain/screenTimeGuideActions';
import type { ScreenTimeRule } from '../domain/screenTimeRule';
import { getScreenTimeGuideLayout, ScreenTimeUnlockGuide } from './ScreenTimeUnlockGuide';

const mockBottomDrawerProps: Array<Record<string, unknown>> = [];

jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView } = require('react-native');
  return {
    BottomDrawer: (props: { visible: boolean; children?: React.ReactNode }) => {
      mockBottomDrawerProps.push(props as Record<string, unknown>);
      return props.visible ? props.children : null;
    },
    BottomDrawerScrollView: ScrollView,
  };
});

jest.mock('../../workflow-feedback/WorkflowFeedbackInlineSlot', () => {
  const { Text } = require('react-native');
  return {
    useWorkflowFeedbackInlineSlot: (sourceKey?: string) => sourceKey ? <Text>{`Feedback ${sourceKey}`}</Text> : null,
  };
});

const familyRule: ScreenTimeRule = {
  id: 'family-a', domain: 'family', subject: { kind: 'child', membershipId: 'child-1' },
  selectionId: 'apps', title: 'Finish homework', trigger: { type: 'family_agreement', agreementId: 'a' },
  temporaryOpen: { allowed: true, durationMinutes: 20 }, active: true, desiredVersion: 1, appliedVersion: 1,
};

describe('ScreenTimeUnlockGuide', () => {
  beforeEach(() => mockBottomDrawerProps.splice(0));

  it('hugs ordinary content and uses a near-full scroll state for enlarged text', () => {
    expect(getScreenTimeGuideLayout(1)).toEqual({ dynamicSizing: true, snapPoints: ['72%'] });
    expect(getScreenTimeGuideLayout(1.3)).toEqual({ dynamicSizing: false, snapPoints: ['92%'] });
  });

  it('keeps the current page visible but blocks conflicting controls beneath the guide', () => {
    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[familyRule]} unresolvedCount={0}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'household_child', membershipId: 'child-1' }, activeRules: [familyRule] })}
      onDismiss={jest.fn()} onOpenRequirement={jest.fn()} onManageRules={jest.fn()}
    />);

    expect(mockBottomDrawerProps.at(-1)).toMatchObject({
      visible: true, hideBackdrop: false, presentation: 'modal',
    });
    expect(mockBottomDrawerProps.at(-1)?.snapPoints).not.toContain('100%');
    expect(mockBottomDrawerProps.at(-1)?.footer).toBeUndefined();
    expect(screen.getByTestId('bottom-drawer.header')).toBeTruthy();
  });

  it('renders feedback inline inside the existing drawer', () => {
    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[familyRule]} unresolvedCount={0}
      feedbackSourceKey="screen-time-episode"
      actions={projectScreenTimeGuideActions({ actor: { kind: 'household_caregiver', childMembershipIds: ['child-1'] }, activeRules: [familyRule] })}
      onDismiss={jest.fn()} onOpenRequirement={jest.fn()} onManageRules={jest.fn()}
    />);

    expect(screen.getByText('Feedback screen-time-episode')).toBeTruthy();
    expect(mockBottomDrawerProps).toHaveLength(1);
  });

  it('does not render a temporary bypass for a child', () => {
    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[familyRule]} unresolvedCount={0}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'household_child', membershipId: 'child-1' }, activeRules: [familyRule] })}
      onDismiss={jest.fn()} onOpenRequirement={jest.fn()} onManageRules={jest.fn()}
    />);
    expect(mockBottomDrawerProps.at(-1)?.footer).toBeUndefined();
    expect(screen.queryByText('Manage rules ›')).toBeNull();
  });

  it('offers only quiet management to an authorized caregiver for a family boundary', () => {
    const onManageRules = jest.fn();
    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[familyRule]} unresolvedCount={0}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'household_caregiver', childMembershipIds: ['child-1'] }, activeRules: [familyRule] })}
      onDismiss={jest.fn()} onOpenRequirement={jest.fn()} onManageRules={onManageRules}
    />);
    const footer = mockBottomDrawerProps.at(-1)?.footer as {
      primaryAction?: { label: string; onPress: () => void };
      secondaryAction?: { label: string; onPress: () => void; variant: string };
    };
    expect(footer.primaryAction).toBeUndefined();
    expect(footer.secondaryAction).toMatchObject({ label: 'Manage rules ›', variant: 'link' });
    footer.secondaryAction?.onPress();
    expect(onManageRules).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Open for 20/)).toBeNull();
  });

  it('pairs one exact prerequisite with quiet management for a personal rule', () => {
    const rule: ScreenTimeRule = {
      id: 'focus', domain: 'personal', subject: { kind: 'self' }, selectionId: 'focus',
      title: 'Focus first', trigger: { type: 'focus_active' },
      temporaryOpen: { allowed: true, durationMinutes: 20 }, active: true,
      desiredVersion: 1, appliedVersion: 1,
    };
    const onOpenRequirement = jest.fn();
    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[rule]} unresolvedCount={0}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'self_adult' }, activeRules: [rule] })}
      onDismiss={jest.fn()} onOpenRequirement={onOpenRequirement} onManageRules={jest.fn()}
    />);
    const footer = mockBottomDrawerProps.at(-1)?.footer as {
      primaryAction?: { label: string; onPress: () => void };
      secondaryAction?: { label: string };
    };
    expect(footer.primaryAction?.label).toBe('Return to Focus');
    expect(footer.secondaryAction?.label).toBe('Manage rules ›');
    footer.primaryAction?.onPress();
    expect(onOpenRequirement).toHaveBeenCalledTimes(1);
  });

  it('explains a personal daily limit as a limit rather than a family agreement', () => {
    const dailyRule: ScreenTimeRule = {
      id: 'daily-social', domain: 'personal', subject: { kind: 'self' },
      selectionId: 'daily-social', title: 'Daily app limit',
      trigger: { type: 'daily_usage_limit', minutes: 15, reset: 'daily' },
      temporaryOpen: { allowed: false, durationMinutes: 20 }, active: true,
      desiredVersion: 1, appliedVersion: null,
    };

    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[dailyRule]} unresolvedCount={0}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'self_adult' }, activeRules: [dailyRule] })}
      onDismiss={jest.fn()} onOpenRequirement={jest.fn()} onManageRules={jest.fn()}
    />);

    expect(screen.getByText('Wait until tomorrow or change the daily limit.')).toBeTruthy();
  });

  it('shows the native blocking details for a composite rule', () => {
    const compositeRule: ScreenTimeRule = {
      id: 'social-evening', domain: 'personal', subject: { kind: 'self' },
      selectionId: 'social-evening', title: 'Social', trigger: { type: 'composite' },
      blockingDetails: [
        "It's before 8:00 PM. Try again after 8:00 PM.",
        'Daily use reached 15 minutes. Try again tomorrow or change this rule.',
      ],
      temporaryOpen: { allowed: true, durationMinutes: 20 }, active: true,
      desiredVersion: 1, appliedVersion: null,
    };

    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[compositeRule]} unresolvedCount={0}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'self_adult' }, activeRules: [compositeRule] })}
      onDismiss={jest.fn()} onOpenRequirement={jest.fn()} onManageRules={jest.fn()}
    />);

    expect(screen.getByText("It's before 8:00 PM. Try again after 8:00 PM.")).toBeTruthy();
    expect(screen.getByText('Daily use reached 15 minutes. Try again tomorrow or change this rule.')).toBeTruthy();
    expect(screen.queryByText('Review this rule in Screen Time.')).toBeNull();
  });
});
