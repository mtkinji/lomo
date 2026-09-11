import {resolveInputAppearance, getInputTextViewport} from './inputAppearance';

describe('input appearance migration', () => {
  it('defaults to filled flat material while preserving explicit editorial variants', () => {
    expect(resolveInputAppearance({})).toMatchObject({variant: 'filled', elevation: 'flat', accentLabelOnFocus: false});
    expect(resolveInputAppearance({variant: 'inline'}).variant).toBe('inline');
    expect(resolveInputAppearance({variant: 'plain'}).variant).toBe('plain');
  });
  it('bounds text after intrinsic frame and footer space once, without another keyboard offset', () => {
    expect(getInputTextViewport({viewportHeight: 180, frameInset: 32, footerHeight: 44})).toBe(104);
    expect(getInputTextViewport({viewportHeight: 50, frameInset: 32, footerHeight: 44})).toBe(0);
    expect(getInputTextViewport({frameInset: 32, footerHeight: 44})).toBe(Infinity);
  });
});
