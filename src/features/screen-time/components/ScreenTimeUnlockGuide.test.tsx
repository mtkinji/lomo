import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { projectScreenTimeGuideActions } from '../domain/screenTimeGuideActions';
import type { ScreenTimeRule } from '../domain/screenTimeRule';
import { ScreenTimeUnlockGuide } from './ScreenTimeUnlockGuide';

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

const familyRule: ScreenTimeRule = {
  id: 'family-a', domain: 'family', subject: { kind: 'child', membershipId: 'child-1' },
  selectionId: 'apps', title: 'Finish homework', trigger: { type: 'family_agreement', agreementId: 'a' },
  temporaryOpen: { allowed: true, durationMinutes: 20 }, active: true, desiredVersion: 1, appliedVersion: 1,
};

describe('ScreenTimeUnlockGuide', () => {
  beforeEach(() => mockBottomDrawerProps.splice(0));

  it('uses the standard full-width drawer chrome', () => {
    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[familyRule]} unresolvedCount={0} result={null} busy={false}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'household_child', membershipId: 'child-1' }, activeRules: [familyRule] })}
      onDismiss={jest.fn()} onDoThisFirst={jest.fn()} onOpenTemporarily={jest.fn()}
    />);

    expect(mockBottomDrawerProps.at(-1)).toMatchObject({ visible: true, snapPoints: ['55%'] });
    expect(mockBottomDrawerProps.at(-1)).not.toHaveProperty('sheetStyle');
    expect(screen.getByTestId('bottom-drawer.header')).toBeTruthy();
  });

  it('does not render a temporary bypass for a child', () => {
    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[familyRule]} unresolvedCount={0} result={null} busy={false}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'household_child', membershipId: 'child-1' }, activeRules: [familyRule] })}
      onDismiss={jest.fn()} onDoThisFirst={jest.fn()} onOpenTemporarily={jest.fn()}
    />);
    expect(screen.getByText('Do this first')).toBeTruthy();
    expect(screen.queryByText('Open for 20 min')).toBeNull();
  });

  it('offers one 20 minute action to an authorized caregiver', () => {
    const onOpenTemporarily = jest.fn();
    renderWithProviders(<ScreenTimeUnlockGuide
      visible rules={[familyRule]} unresolvedCount={0} result={null} busy={false}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'household_caregiver', childMembershipIds: ['child-1'] }, activeRules: [familyRule] })}
      onDismiss={jest.fn()} onDoThisFirst={jest.fn()} onOpenTemporarily={onOpenTemporarily}
    />);
    fireEvent.press(screen.getByText('Open for 20 min'));
    expect(onOpenTemporarily).toHaveBeenCalledTimes(1);
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
      visible rules={[dailyRule]} unresolvedCount={0} result={null} busy={false}
      actions={projectScreenTimeGuideActions({ actor: { kind: 'self_adult' }, activeRules: [dailyRule] })}
      onDismiss={jest.fn()} onDoThisFirst={jest.fn()} onOpenTemporarily={jest.fn()}
    />);

    expect(screen.getByText('Wait until tomorrow or change the daily limit.')).toBeTruthy();
  });
});
