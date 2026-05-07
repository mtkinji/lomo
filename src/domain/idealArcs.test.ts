import {
  IDEAL_ARC_TEMPLATES,
  getIdealArcTemplateById,
  listIdealArcTemplates,
  scoreArcNarrative,
} from './idealArcs';

describe('IDEAL_ARC_TEMPLATES', () => {
  it('contains the documented set of templates with stable ids', () => {
    const ids = IDEAL_ARC_TEMPLATES.map((t) => t.id).sort();
    expect(ids).toEqual(
      [
        'craft_contribution',
        'discipleship',
        'family_stewardship',
        'making_embodied_creativity',
        'venture_entrepreneurship',
      ].sort(),
    );
  });

  it('every template has a non-empty narrative and at least one force emphasis', () => {
    IDEAL_ARC_TEMPLATES.forEach((t) => {
      expect(t.narrative.length).toBeGreaterThan(0);
      expect(t.forceEmphasis.length).toBeGreaterThan(0);
    });
  });
});

describe('getIdealArcTemplateById / listIdealArcTemplates', () => {
  it('returns a template by id', () => {
    expect(getIdealArcTemplateById('discipleship')?.id).toBe('discipleship');
  });

  it('returns undefined for unknown ids', () => {
    expect(getIdealArcTemplateById('not-a-template' as any)).toBeUndefined();
  });

  it('listIdealArcTemplates returns the same array', () => {
    expect(listIdealArcTemplates()).toBe(IDEAL_ARC_TEMPLATES);
  });
});

describe('scoreArcNarrative', () => {
  it('returns zero for empty inputs', () => {
    const zero = scoreArcNarrative({ name: '', narrative: '' });
    expect(zero.score).toBe(0);
    expect(zero.components.narrativeLength).toBe(0);
    expect(zero.components.identityLanguage).toBe(0);
    expect(zero.components.structure).toBe(0);
  });

  it('clamps the total score to the 0-10 range', () => {
    IDEAL_ARC_TEMPLATES.forEach((template) => {
      const judgement = scoreArcNarrative({
        name: template.name,
        narrative: template.narrative,
      });
      expect(judgement.score).toBeGreaterThanOrEqual(0);
      expect(judgement.score).toBeLessThanOrEqual(10);
    });
  });

  it('rewards "I want" identity language with the max identityLanguage score', () => {
    const judgement = scoreArcNarrative({
      name: 'Health',
      narrative: 'I want to be present. I want to move every day.',
    });
    expect(judgement.components.identityLanguage).toBe(3);
  });

  it('falls back to "become/becoming" identity language when "I want" is absent', () => {
    const judgement = scoreArcNarrative({
      name: 'Mastery',
      narrative: 'I am becoming patient. I am steady.',
    });
    expect(judgement.components.identityLanguage).toBe(2);
  });

  it('rewards three-sentence structure with the max structure score', () => {
    const judgement = scoreArcNarrative({
      name: 'Test',
      narrative: 'One sentence here. Another sentence here. Closing thought here.',
    });
    expect(judgement.components.structure).toBe(3);
  });

  it('only assigns 1 point of structure for a single-sentence narrative', () => {
    const judgement = scoreArcNarrative({
      name: 'Test',
      narrative: 'I want to grow',
    });
    expect(judgement.components.structure).toBe(1);
  });

  it('produces a higher score for an idealized narrative than for a one-liner', () => {
    const long = scoreArcNarrative({
      name: 'Health',
      narrative: IDEAL_ARC_TEMPLATES[0]!.narrative,
    });
    const short = scoreArcNarrative({
      name: 'Health',
      narrative: 'Be healthy',
    });
    expect(long.score).toBeGreaterThan(short.score);
  });
});
