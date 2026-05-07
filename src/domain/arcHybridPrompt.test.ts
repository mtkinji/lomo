import {
  buildHybridArcGuidelinesBlock,
  HYBRID_ARC_NAME_RESONANCE_RULES,
  HYBRID_ARC_RESONANCE_REQUIREMENTS,
} from './arcHybridPrompt';

describe('arcHybridPrompt', () => {
  it('forces a resonance anchor and growth tension before drafting', () => {
    expect(HYBRID_ARC_RESONANCE_REQUIREMENTS).toContain('resonance anchor');
    expect(HYBRID_ARC_RESONANCE_REQUIREMENTS).toContain('growth tension');
    expect(HYBRID_ARC_RESONANCE_REQUIREMENTS).toContain('Do NOT try to mention every input');
  });

  it('pushes names toward people-in-formation instead of generic labels', () => {
    expect(HYBRID_ARC_NAME_RESONANCE_RULES).toContain('kind of person');
    expect(HYBRID_ARC_NAME_RESONANCE_RULES).toContain('Identity Growth');
  });

  it('includes the resonance sections in the shared prompt block', () => {
    const block = buildHybridArcGuidelinesBlock();
    expect(block).toContain('Resonance requirements:');
    expect(block).toContain('Arc name resonance:');
    expect(block).toContain('You are becoming');
  });
});
