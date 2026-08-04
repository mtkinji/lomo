import { BUTTON_VARIANT_TOKENS } from './buttonTokens';

describe('button color accessibility contract', () => {
  it('uses dark text on the turmeric background', () => {
    expect(BUTTON_VARIANT_TOKENS.turmeric.textTone).toBe('default');
  });
});
