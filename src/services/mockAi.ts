import { Arc } from '../domain/types';

type GenerateArcParams = {
  prompt: string;
  timeHorizon?: string;
  additionalContext?: string;
};

type GeneratedArc = Pick<
  Arc,
  'name' | 'narrative' | 'northStar' | 'status'
> & { suggestedForces: string[] };

const arcTemplates: GeneratedArc[] = [
  {
    name: '♾️ Discipleship',
    northStar: 'Quietly reflect Christ’s character in every sphere of influence.',
    narrative:
      'Shape your daily habits around gentleness, courage, humility, and charity so discipleship becomes lived experience at work and home.',
    status: 'active',
    suggestedForces: ['✨ Spirituality', '🤝 Connection'],
  },
  {
    name: '🏡 Family Stewardship',
    northStar: 'Create a home where everyone feels safe, known, and lifted.',
    narrative:
      'Lead with patience, listen with attention, form traditions, and build emotional safety so that family life reflects warmth and generosity.',
    status: 'active',
    suggestedForces: ['🤝 Connection', '🏃 Activity'],
  },
  {
    name: '🧠 Craft & Contribution',
    northStar: 'Build product work marked by clarity, compassion, and craftsmanship.',
    narrative:
      'See complexity clearly, name problems honestly, and ship solutions oriented toward real human good while mentoring others generously.',
    status: 'active',
    suggestedForces: ['🧠 Mastery', '🤝 Connection'],
  },
  {
    name: '🪚 Making & Embodied Creativity',
    northStar: 'Stay grounded through patient, hands-on making.',
    narrative:
      'Use woodworking and embodied craft as a spiritual counterweight to digital life—creating durable, beautiful things with care.',
    status: 'active',
    suggestedForces: ['🏃 Activity', '🧠 Mastery'],
  },
];

export async function mockGenerateArcs(
  params: GenerateArcParams
): Promise<GeneratedArc[]> {
  // Simulate a thoughtful AI pause
  await new Promise((resolve) => setTimeout(resolve, 700));

  const emphasis = params.prompt.toLowerCase();
  const filtered = arcTemplates.filter((template) =>
    template.narrative.toLowerCase().includes('family')
      ? emphasis.includes('family')
      : true
  );

  return (filtered.length ? filtered : arcTemplates).slice(0, 3);
}


