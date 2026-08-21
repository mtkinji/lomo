import { act, fireEvent } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { renderWithProviders } from '../../../test/renderWithProviders';
import { KWILT_REFRESH_COMPLETION_MS, KwiltLoader } from '../../../ui/KwiltLoader';
import {
  buildMoneyOnboardingAssessment,
  buildMoneyOnboardingTargetGuidance,
  MONEY_ONBOARDING_DEMO_EVIDENCE,
} from '../domain/moneyOnboardingAssessment';
import {
  MONEY_ANALYSIS_LOGO_DWELL_MS,
  MONEY_ANALYSIS_SPIN_MS,
  MoneyLivingTargetSlider,
  MoneyAnalysisStatus,
  MoneyPlanningIntentScreen,
  MoneySetupIntroduction,
  MoneySetupStepInterstitial,
  MoneyTargetScreen,
} from './MoneySetupScreen';

jest.mock('../native/moneyPlaidLink', () => ({
  startMoneyPlaidLink: jest.fn(),
}));

describe('MoneySetupIntroduction', () => {
  it('reuses the shared illustrated Money door instead of the native setup card', () => {
    const onNotNow = jest.fn();
    const onStart = jest.fn();
    const screen = renderWithProviders(
      <MoneySetupIntroduction onNotNow={onNotNow} onStart={onStart} />,
    );

    expect(screen.getByRole('header', { name: 'Know where you stand before you spend' })).toBeTruthy();
    expect(screen.getByLabelText('Money brought into one clear monthly view')).toBeTruthy();
    expect(screen.queryByText('First-time setup')).toBeNull();
    expect(screen.queryByText('Money setup step 1 of 4')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Set up Money' }));
    expect(onStart).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Leave Money setup for now' }));
    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  it('keeps setup steps inside the full-screen onboarding surface', () => {
    const screen = renderWithProviders(
      <MoneySetupStepInterstitial
        action={<Text>Continue setting up Money</Text>}
        currentStep={2}
        onNotNow={jest.fn()}
        title="Choose a monthly living target"
        visual={null}
      >
        <Text>Target guidance</Text>
      </MoneySetupStepInterstitial>,
    );

    expect(screen.getByTestId('capabilityOnboarding.step')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Choose a monthly living target' })).toBeTruthy();
    expect(screen.getByLabelText('Money setup step 2 of 4')).toBeTruthy();
    expect(screen.getByText('2 of 4')).toBeTruthy();
    expect(screen.queryByTestId('moneySetup.progressTrack')).toBeNull();
    expect(screen.queryByText('Money')).toBeNull();
    expect(screen.getByLabelText('Close Money setup')).toBeTruthy();
    expect(screen.getByTestId('capabilityOnboarding.step.actionDock')).toBeTruthy();
    expect(screen.getByText('Target guidance')).toBeTruthy();
    expect(screen.getByText('Continue setting up Money')).toBeTruthy();

    expect(StyleSheet.flatten(screen.getByTestId('capabilityOnboarding.step.titleSlot').props.style)).toMatchObject({
      minHeight: 112,
      justifyContent: 'center',
    });
    expect(StyleSheet.flatten(screen.getByRole('header').props.style)).toMatchObject({
      fontSize: 24,
      lineHeight: 28,
    });
    expect(StyleSheet.flatten(screen.getByTestId('capabilityOnboarding.step.illustrationSlot').props.style)).toMatchObject({
      alignItems: 'center',
      height: 232,
      justifyContent: 'center',
    });
    expect(StyleSheet.flatten(screen.getByTestId('capabilityOnboarding.step.decisionSlot').props.style)).toMatchObject({
      flexGrow: 1,
      justifyContent: 'center',
    });
    expect(StyleSheet.flatten(screen.getByTestId('capabilityOnboarding.step.decisionSlot').props.style).marginTop).toBeUndefined();
  });

  it('uses one adjustable 50 to 100 percent target instead of preset choices', () => {
    const onChange = jest.fn();
    const screen = renderWithProviders(
      <MoneyLivingTargetSlider onChange={onChange} recommendedValue={70} value={70} />,
    );

    const slider = screen.getByRole('adjustable', { name: 'Monthly living target' });
    expect(slider.props.accessibilityValue).toEqual({ min: 50, max: 100, now: 70, text: '70%' });
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByLabelText('70% recommended')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();

    fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('removes the step counter when budgets are ready', () => {
    const screen = renderWithProviders(
      <MoneySetupStepInterstitial title="Your budgets are ready" visual={null}>
        <Text>Continue to Budgets</Text>
      </MoneySetupStepInterstitial>,
    );

    expect(screen.queryByLabelText(/Money setup step/)).toBeNull();
    expect(screen.queryByText(/of 4/)).toBeNull();
  });
});

describe('MoneyAnalysisStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves the spinner back into the logo while keeping copy tied to the active work phase', () => {
    const screen = renderWithProviders(<MoneyAnalysisStatus phase="transfers" />);

    expect(screen.UNSAFE_getByType(KwiltLoader).props).toMatchObject({
      phase: 'idle',
      resolvedOpacity: 1,
      size: 64,
    });
    expect(screen.getByText('Separating transfers from everyday spending')).toBeTruthy();

    act(() => jest.advanceTimersByTime(MONEY_ANALYSIS_LOGO_DWELL_MS));
    expect(screen.UNSAFE_getByType(KwiltLoader).props.phase).toBe('loading');

    act(() => jest.advanceTimersByTime(MONEY_ANALYSIS_SPIN_MS));
    expect(screen.UNSAFE_getByType(KwiltLoader).props.phase).toBe('completing');
    expect(screen.getByText('Separating transfers from everyday spending')).toBeTruthy();

    act(() => jest.advanceTimersByTime(KWILT_REFRESH_COMPLETION_MS));
    expect(screen.UNSAFE_getByType(KwiltLoader).props.phase).toBe('idle');
    expect(screen.getByText('Separating transfers from everyday spending')).toBeTruthy();
  });
});

describe('Money planning decisions', () => {
  const assessment = buildMoneyOnboardingAssessment(MONEY_ONBOARDING_DEMO_EVIDENCE);

  it('proves what Kwilt learned before asking for spending intent', () => {
    const onContinue = jest.fn();
    const onSelect = jest.fn();
    const screen = renderWithProviders(
      <MoneyPlanningIntentScreen
        assessment={assessment}
        coverageConfidence="complete"
        onClose={jest.fn()}
        onContinue={onContinue}
        onSelect={onSelect}
        selectedIntent="recommend"
      />,
    );

    expect(screen.getByText('$9,500')).toBeTruthy();
    expect(screen.getByText('$6,380')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Should this plan reflect how you spend now—or help you spend less?' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);

    fireEvent.press(screen.getByRole('radio', { name: 'Spend less each month' }));
    expect(onSelect).toHaveBeenCalledWith('reduce');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('shows one synchronized percent and dollar target with spending context', () => {
    const guidance = buildMoneyOnboardingTargetGuidance(assessment, 'complete', 'reduce');
    if (!guidance) throw new Error('Expected supported demo guidance.');
    const screen = renderWithProviders(
      <MoneyTargetScreen
        assessment={assessment}
        busy={false}
        coverageConfidence="complete"
        guidance={guidance}
        message={null}
        onAccept={jest.fn()}
        onClose={jest.fn()}
        onLivingPercentChange={jest.fn()}
        selectedLivingPercent={65}
      />,
    );

    expect(screen.getByRole('header', { name: 'What share of dependable income should the monthly plan use?' })).toBeTruthy();
    expect(screen.getAllByText('65%')).toHaveLength(2);
    expect(screen.getByText('$6,175 per month')).toBeTruthy();
    expect(screen.getByText('$205 below recent spending in these accounts')).toBeTruthy();
    expect(screen.getByText('$3,325 outside the monthly plan')).toBeTruthy();
    expect(screen.getByLabelText('65% suggested reduction')).toBeTruthy();
    expect(screen.queryByText('Committed')).toBeNull();
    expect(screen.queryByText('Flexible')).toBeNull();
  });

  it('labels incomplete coverage as a starting point rather than a recommendation', () => {
    const guidance = buildMoneyOnboardingTargetGuidance(assessment, 'partial', 'recommend');
    if (!guidance) throw new Error('Expected supported demo guidance.');
    const screen = renderWithProviders(
      <MoneyTargetScreen
        assessment={assessment}
        busy={false}
        coverageConfidence="partial"
        guidance={guidance}
        message={null}
        onAccept={jest.fn()}
        onClose={jest.fn()}
        onLivingPercentChange={jest.fn()}
        selectedLivingPercent={70}
      />,
    );

    expect(screen.getByText('Starting point based only on the accounts shown')).toBeTruthy();
    expect(screen.queryByLabelText(/recommended/)).toBeNull();
  });

  it('stops calling the current value a suggested reduction after the user adjusts it', () => {
    const guidance = buildMoneyOnboardingTargetGuidance(assessment, 'complete', 'reduce');
    if (!guidance) throw new Error('Expected supported demo guidance.');
    const screen = renderWithProviders(
      <MoneyTargetScreen
        assessment={assessment}
        busy={false}
        coverageConfidence="complete"
        guidance={guidance}
        message={null}
        onAccept={jest.fn()}
        onClose={jest.fn()}
        onLivingPercentChange={jest.fn()}
        selectedLivingPercent={70}
      />,
    );

    expect(screen.getByText('Your adjusted target')).toBeTruthy();
    expect(screen.queryByText('Suggested reduction from recent spending')).toBeNull();
  });
});
