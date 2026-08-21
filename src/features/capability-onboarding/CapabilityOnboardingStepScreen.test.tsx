import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { renderWithProviders } from '../../test/renderWithProviders';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Typography';
import {
  CAPABILITY_ONBOARDING_STEP_GEOMETRY,
  CapabilityOnboardingStepScreen,
} from './CapabilityOnboardingStepScreen';

describe('CapabilityOnboardingStepScreen', () => {
  it('owns the canonical title, illustration, decision, and action geometry', () => {
    const onClose = jest.fn();
    const onContinue = jest.fn();
    const screen = renderWithProviders(
      <CapabilityOnboardingStepScreen
        action={<Button fullWidth onPress={onContinue} size="lg">Continue</Button>}
        closeAccessibilityLabel="Close Money setup"
        currentStep={2}
        illustration={<View accessibilityLabel="A grounded onboarding scene" />}
        onClose={onClose}
        progressAccessibilityLabel="Money setup step 2 of 4"
        title="Choose a monthly living target"
      >
        <Text>One decision for this step</Text>
      </CapabilityOnboardingStepScreen>,
    );

    expect(screen.getByTestId('capabilityOnboarding.step')).toBeTruthy();
    expect(screen.getByLabelText('Money setup step 2 of 4')).toBeTruthy();
    expect(screen.getByText('2 of 4')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('capabilityOnboarding.step.titleSlot').props.style)).toMatchObject({
      minHeight: CAPABILITY_ONBOARDING_STEP_GEOMETRY.titleSlotMinHeight,
      justifyContent: 'center',
    });
    expect(StyleSheet.flatten(screen.getByRole('header').props.style)).toMatchObject({
      fontSize: 24,
      lineHeight: 28,
      textAlign: 'center',
    });
    expect(StyleSheet.flatten(screen.getByTestId('capabilityOnboarding.step.illustrationSlot').props.style)).toMatchObject({
      height: CAPABILITY_ONBOARDING_STEP_GEOMETRY.illustrationSize,
      justifyContent: 'center',
    });
    expect(StyleSheet.flatten(screen.getByTestId('capabilityOnboarding.step.decisionSlot').props.style)).toMatchObject({
      flexGrow: 1,
      justifyContent: 'center',
    });
    expect(screen.getByTestId('capabilityOnboarding.step.actionDock')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Close Money setup' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('removes progress and the action dock for a terminal passive state', () => {
    const screen = renderWithProviders(
      <CapabilityOnboardingStepScreen
        illustration={<View accessibilityLabel="Ready scene" />}
        title="Your budgets are ready"
      >
        <Text>Ready</Text>
      </CapabilityOnboardingStepScreen>,
    );

    expect(screen.queryByText(/of 4/)).toBeNull();
    expect(screen.queryByTestId('capabilityOnboarding.step.actionDock')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('capabilityOnboarding.step.scroll').props.contentContainerStyle)).toMatchObject({
      paddingBottom: expect.any(Number),
    });
  });

  it('reserves the same dock clearance while a transient state has no action', () => {
    const withAction = renderWithProviders(
      <CapabilityOnboardingStepScreen
        action={<Button fullWidth onPress={jest.fn()} size="lg">Continue</Button>}
        illustration={<View />}
        title="Connect accounts"
      >
        <Text>Ready</Text>
      </CapabilityOnboardingStepScreen>,
    );
    const actionPadding = StyleSheet.flatten(
      withAction.getByTestId('capabilityOnboarding.step.scroll').props.contentContainerStyle,
    ).paddingBottom;
    withAction.unmount();

    const withoutAction = renderWithProviders(
      <CapabilityOnboardingStepScreen illustration={<View />} title="Finishing your connection">
        <Text>Exchanging</Text>
      </CapabilityOnboardingStepScreen>,
    );
    const transientPadding = StyleSheet.flatten(
      withoutAction.getByTestId('capabilityOnboarding.step.scroll').props.contentContainerStyle,
    ).paddingBottom;

    expect(transientPadding).toBe(actionPadding);
  });
});
