import { render } from '@testing-library/react-native';

import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { useRecipeCookSession } from '../runtime/useRecipeCookSession';
import { RecipeCookModeExperience } from './RecipeCookModeScreen';

jest.mock('../runtime/useRecipeCookSession');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('../voice/cookVoiceTransport', () => ({
  cookVoiceTransport: {
    start: jest.fn(),
    stopAndTranscribe: jest.fn(),
    cancel: jest.fn(),
  },
}));
jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));

const mockUseRecipeCookSession = useRecipeCookSession as jest.MockedFunction<typeof useRecipeCookSession>;

describe('RecipeCookModeExperience', () => {
  it('keeps a stable hook tree while a saved cook session restores', () => {
    const start = jest.fn();
    mockUseRecipeCookSession.mockReturnValue({
      restoring: true,
      session: null,
      cues: [],
      start,
    } as never);

    const projection = {
      recipe: recipeContractFixture(),
      currentVersion: recipeVersionContractFixture(),
    };
    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
    } as never;
    const screen = render(
      <RecipeCookModeExperience projection={projection} servings={4} landscape={false} navigation={navigation} />,
    );

    mockUseRecipeCookSession.mockReturnValue({
      restoring: false,
      session: {
        id: 'session-1',
        currentCueIndex: 0,
        cueCount: 1,
        status: 'active',
        timers: [],
      },
      cues: [{
        id: 'cue-1',
        displayText: 'Mix the ingredients.',
        ingredientReferences: [],
        timerSuggestions: [],
      }],
      start,
      send: jest.fn(),
      startTimer: jest.fn(),
    } as never);

    expect(() => screen.rerender(
      <RecipeCookModeExperience projection={projection} servings={4} landscape={false} navigation={navigation} />,
    )).not.toThrow();
  });
});
