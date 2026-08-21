import { act, fireEvent } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { renderWithProviders } from '../../../test/renderWithProviders';
import { KWILT_REFRESH_COMPLETION_MS, KwiltLoader } from '../../../ui/KwiltLoader';
import { buildMoneyOnboardingFollowThrough } from '../domain/moneyOnboardingFollowThrough';
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
  MoneyPlanBuildStatus,
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
    expect(StyleSheet.flatten(screen.getByText('Separating transfers from everyday spending').props.style)).toMatchObject({
      fontSize: 28,
      lineHeight: 34,
    });

    act(() => jest.advanceTimersByTime(MONEY_ANALYSIS_LOGO_DWELL_MS));
    expect(screen.UNSAFE_getByType(KwiltLoader).props.phase).toBe('loading');

    act(() => jest.advanceTimersByTime(MONEY_ANALYSIS_SPIN_MS));
    expect(screen.UNSAFE_getByType(KwiltLoader).props.phase).toBe('completing');
    expect(screen.getByText('Separating transfers from everyday spending')).toBeTruthy();

    act(() => jest.advanceTimersByTime(KWILT_REFRESH_COMPLETION_MS));
    expect(screen.UNSAFE_getByType(KwiltLoader).props.phase).toBe('idle');
    expect(screen.getByText('Separating transfers from everyday spending')).toBeTruthy();
  });

  it('truthfully names the durable follow-through being created after plan acceptance', () => {
    const followThrough = buildMoneyOnboardingFollowThrough({
      createdAtIso: '2026-08-21T18:00:00.000Z',
      evidenceScope: 'household',
      observedMonthlySpendingCents: 638_000,
      selectedPlanCents: 617_500,
    });
    const screen = renderWithProviders(<MoneyPlanBuildStatus followThrough={followThrough} phase="goal" />);

    expect(screen.getByText('Creating your goal to spend $205 less each month')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('header', { name: /Money setup/i })).toBeNull();
  });
});

describe('Money planning decisions', () => {
  const assessment = buildMoneyOnboardingAssessment(MONEY_ONBOARDING_DEMO_EVIDENCE);

  it('turns the analysis result into three guided value offers without a second confirmation action', () => {
    const onAddInstitution = jest.fn();
    const onChoose = jest.fn();
    const onExploreSpending = jest.fn();
    const screen = renderWithProviders(
      <MoneyPlanningIntentScreen
        assessment={assessment}
        coverageConfidence="complete"
        onAddInstitution={onAddInstitution}
        onChoose={onChoose}
        onClose={jest.fn()}
        onExploreSpending={onExploreSpending}
      />,
    );

    expect(screen.getByText('YOUR RECENT SPENDING')).toBeTruthy();
    expect(screen.getByText('$6,380 a month')).toBeTruthy();
    expect(screen.getByText('Average from May–July 2026 across 3 connected Chase accounts')).toBeTruthy();
    expect(screen.queryByText('$9,500')).toBeNull();
    expect(screen.getByRole('header', {
      name: 'Now that we have a picture of your spending, which of these would you like to prioritize?',
    })).toBeTruthy();
    expect(screen.queryByText("Here's how Kwilt can help")).toBeNull();
    expect(screen.getByText('See your spending broken down by category.')).toBeTruthy();
    expect(screen.getByText('See realistic changes and how much they could save.')).toBeTruthy();
    expect(screen.getByText('Start with suggested categories and monthly amounts.')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.queryByTestId('moneyOnboarding.intent.actionDock')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'See where your money is going' }));
    expect(onExploreSpending).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole('button', { name: 'Find ways to save money' }));
    expect(onChoose).toHaveBeenCalledWith('reduce');
    fireEvent.press(screen.getByRole('button', { name: 'Get a suggested budget' }));
    expect(onChoose).toHaveBeenCalledWith('recommend');
    fireEvent.press(screen.getByRole('button', { name: 'Connect more accounts' }));
    expect(onAddInstitution).toHaveBeenCalledTimes(1);
  });

  it('shows one synchronized percent and dollar target with spending context', () => {
    const guidance = buildMoneyOnboardingTargetGuidance(assessment, 'complete', 'reduce');
    if (!guidance) throw new Error('Expected supported demo guidance.');
    const onChangeGoal = jest.fn();
    const screen = renderWithProviders(
      <MoneyTargetScreen
        assessment={assessment}
        busy={false}
        coverageConfidence="complete"
        guidance={guidance}
        message={null}
        onAccept={jest.fn()}
        onChangeGoal={onChangeGoal}
        onClose={jest.fn()}
        onLivingPercentChange={jest.fn()}
        planningIntent="reduce"
        selectedLivingPercent={65}
      />,
    );

    expect(screen.getByRole('header', { name: 'A realistic first step' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Save money' })).toBeTruthy();
    expect(screen.queryByText('Your choice: Spend less')).toBeNull();
    expect(screen.queryByText('KWILT’S RECOMMENDATION')).toBeNull();
    expect(screen.getByText('$6,175')).toBeTruthy();
    expect(screen.getByText('per month')).toBeTruthy();
    expect(screen.getByText('$205 below your recent pace')).toBeTruthy();
    expect(screen.getByText('$4,780 committed · $1,395 flexible')).toBeTruthy();
    expect(screen.getByText('Kwilt will build your budgets and turn this into a goal with two first steps.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Build a $6,175 plan' })).toBeTruthy();
    expect(screen.getByLabelText('Recent $6,380')).toBeTruthy();
    expect(screen.queryByText('65%')).toBeNull();
    expect(screen.queryByText('65% of $9,500 dependable income · $3,325 remains outside the plan')).toBeNull();
    expect(screen.getByRole('button', { name: 'How we got this' })).toBeTruthy();
    expect(screen.queryByText('Committed')).toBeNull();
    expect(screen.queryByText('Flexible')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Change planning goal' }));
    expect(onChangeGoal).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'How we got this' }));
    expect(screen.getByText('65% of $9,500 dependable income · $3,325 remains outside the plan')).toBeTruthy();
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
        onChangeGoal={jest.fn()}
        onClose={jest.fn()}
        onLivingPercentChange={jest.fn()}
        planningIntent="recommend"
        selectedLivingPercent={70}
      />,
    );

    expect(screen.getByText('$270 above your recent pace in these accounts')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Suggested budget' })).toBeTruthy();
    expect(screen.queryByText('Your choice: Choose for me')).toBeNull();
    expect(screen.queryByText('KWILT’S RECOMMENDATION')).toBeNull();
    expect(screen.queryByLabelText(/recommended/)).toBeNull();
    expect(screen.queryByText(/turn this into a goal/i)).toBeNull();
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
        onChangeGoal={jest.fn()}
        onClose={jest.fn()}
        onLivingPercentChange={jest.fn()}
        planningIntent="reduce"
        selectedLivingPercent={70}
      />,
    );

    expect(screen.queryByText('Suggested reduction from recent spending')).toBeNull();
  });
});
