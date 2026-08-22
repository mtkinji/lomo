import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const legalUrlModule = "from '../paywall/SubscriptionLegalLinks'";

describe('canonical legal URLs', () => {
  it('keeps account, onboarding, Games, and Phone Agent on one legal origin', () => {
    const onboarding = readFileSync(resolve(process.cwd(), 'src/features/onboarding/SignInInterstitial.tsx'), 'utf8');
    const games = readFileSync(resolve(process.cwd(), 'src/capabilities/games/features/auth/AuthScreen.tsx'), 'utf8');
    const phoneAgent = readFileSync(resolve(process.cwd(), 'src/features/account/PhoneAgentSettingsScreen.tsx'), 'utf8');

    expect(onboarding).toContain(legalUrlModule);
    expect(phoneAgent).toContain(legalUrlModule);
    expect(games).toContain("from '@/src/features/paywall/SubscriptionLegalLinks'");

    for (const source of [onboarding, games, phoneAgent]) {
      expect(source).not.toMatch(/const (TERMS|PRIVACY)(_URL)? = ['"]https:\/\/(www\.)?kwilt\.app/);
    }
  });

  it('keeps store disclosure terminology platform-correct', () => {
    const apple = readFileSync(resolve(process.cwd(), 'docs/app-store/privacy-disclosures-1.0.104.md'), 'utf8');
    const google = readFileSync(resolve(process.cwd(), 'docs/google-play/data-safety-1.0.104.md'), 'utf8');

    expect(apple).not.toMatch(/Developer Communications|Account Management|Fraud Prevention\/Security/);
    expect(apple).toContain("Developer's Advertising or Marketing");
    expect(google).toContain('Required/automatic when analytics is enabled in the submitted build');
    expect(google).toContain('Google Play/RevenueCat');
    expect(google).toContain('https://www.kwilt.app/delete-account');
  });

  it('does not send routine app state to unexplained public utility endpoints', () => {
    const ai = readFileSync(resolve(process.cwd(), 'src/services/ai.ts'), 'utf8');

    expect(ai).not.toContain('picsum.photos/seed');
  });
});
