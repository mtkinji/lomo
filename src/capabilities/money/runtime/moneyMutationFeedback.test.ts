import { HapticsService } from '../../../services/HapticsService';
import { signalMoneyChoice, signalMoneyMutationOutcome, signalMoneyToggle } from './moneyMutationFeedback';

jest.mock('../../../services/HapticsService', () => ({
  HapticsService: { trigger: jest.fn(async () => undefined) },
}));

describe('money mutation feedback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses a light selection response when a direct choice begins', () => {
    signalMoneyChoice();
    expect(HapticsService.trigger).toHaveBeenCalledWith('canvas.selection');
  });

  it.each([
    ['succeeded', 'outcome.success'],
    ['failed', 'outcome.error'],
  ] as const)('maps %s writes to the semantic %s response', (outcome, event) => {
    signalMoneyMutationOutcome(outcome);
    expect(HapticsService.trigger).toHaveBeenCalledWith(event);
  });

  it.each([
    [true, 'canvas.toggle.on'],
    [false, 'canvas.toggle.off'],
  ] as const)('maps a %s settings choice to %s', (enabled, event) => {
    signalMoneyToggle(enabled);
    expect(HapticsService.trigger).toHaveBeenCalledWith(event);
  });
});
