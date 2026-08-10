import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { projectScreenTimeGuideActions } from '../domain/screenTimeGuideActions';
import type { ScreenTimeRule } from '../domain/screenTimeRule';
import { ScreenTimeUnlockGuide } from './ScreenTimeUnlockGuide';

jest.mock('../../../ui/BottomGuide', () => ({
  BottomGuide: ({ visible, children }: { visible: boolean; children?: React.ReactNode }) => visible ? children : null,
}));

const familyRule: ScreenTimeRule = {
  id: 'family-a', domain: 'family', subject: { kind: 'child', membershipId: 'child-1' },
  selectionId: 'apps', title: 'Finish homework', trigger: { type: 'family_agreement', agreementId: 'a' },
  temporaryOpen: { allowed: true, durationMinutes: 20 }, active: true, desiredVersion: 1, appliedVersion: 1,
};

describe('ScreenTimeUnlockGuide', () => {
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
});
