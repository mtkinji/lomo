import { Arc, GoalDraft } from '../domain/types';

type GenerateArcParams = {
  prompt: string;
  timeHorizon?: string;
  additionalContext?: string;
};

type GeneratedArc = Pick<Arc, 'name' | 'narrative' | 'status'> & {
  suggestedForces: string[];
};

const arcTemplates: GeneratedArc[] = [
  {
    name: '♾️ Discipleship',
    narrative:
      'Shape your daily habits around gentleness, courage, humility, and charity so discipleship becomes lived experience at work and home.',
    status: 'active',
    suggestedForces: ['✨ Spirituality', '🤝 Connection'],
  },
  {
    name: '🏡 Family Stewardship',
    narrative:
      'Lead with patience, listen with attention, form traditions, and build emotional safety so that family life reflects warmth and generosity.',
    status: 'active',
    suggestedForces: ['🤝 Connection', '🏃 To-do'],
  },
  {
    name: '🧠 Craft & Contribution',
    narrative:
      'See complexity clearly, name problems honestly, and ship solutions oriented toward real human good while mentoring others generously.',
    status: 'active',
    suggestedForces: ['🧠 Mastery', '🤝 Connection'],
  },
  {
    name: '🪚 Making & Embodied Creativity',
    narrative:
      'Use woodworking and embodied craft as a spiritual counterweight to digital life—creating durable, beautiful things with care.',
    status: 'active',
    suggestedForces: ['🏃 To-do', '🧠 Mastery'],
  },
];

export async function mockGenerateArcs(
  params: GenerateArcParams
): Promise<GeneratedArc[]> {
  // Simulate a thoughtful AI pause
  await new Promise((resolve) => setTimeout(resolve, 700));

  const emphasis = params.prompt.toLowerCase();
  const filtered = arcTemplates.filter((template) => {
    const narrative = template.narrative ?? '';
    return narrative.toLowerCase().includes('family') ? emphasis.includes('family') : true;
  });

  return (filtered.length ? filtered : arcTemplates).slice(0, 3);
}

type GenerateGoalParams = {
  arcName: string;
  arcNarrative?: string;
  prompt?: string;
  timeHorizon?: string;
  constraints?: string;
};

const goalTemplates: GoalDraft[] = [
  {
    title: 'Weekly Hospitality Night',
    description: 'Host a simple meal or tea with one family or neighbor every week to practice generosity.',
    status: 'planned',
    forceIntent: {
      'force-activity': 1,
      'force-connection': 3,
      'force-mastery': 0,
      'force-spirituality': 2,
    },
    suggestedActivities: [
      'Plan guest list and reach out on Sundays',
      'Prep a simple repeatable menu',
      'Reflect afterward with quick gratitude notes',
    ],
  },
  {
    title: 'Craft of Encouragement Letters',
    description:
      'Write and mail three intentional letters each month to encourage teammates or family members.',
    status: 'planned',
    forceIntent: {
      'force-activity': 0,
      'force-connection': 2,
      'force-mastery': 1,
      'force-spirituality': 2,
    },
    suggestedActivities: [
      'Collect stories or highlights in a running note',
      'Schedule a 30-minute writing block each week',
    ],
  },
  {
    title: 'Strengthen Morning Rule of Life',
    description: 'Design and keep a 45-minute morning rhythm anchoring prayer, scripture, and silence.',
    status: 'planned',
    forceIntent: {
      'force-activity': 1,
      'force-connection': 0,
      'force-mastery': 1,
      'force-spirituality': 3,
    },
    suggestedActivities: [
      'Define the sequence and write it as a card',
      'Prep physical space the night before',
      'Track completion in a simple log',
    ],
  },
];

export async function mockGenerateGoals(
  params: GenerateGoalParams
): Promise<GoalDraft[]> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const emphasis = `${params.prompt ?? ''} ${params.arcNarrative ?? ''}`.toLowerCase();
  const filtered = goalTemplates.filter((template) => {
    if (template.title.toLowerCase().includes('morning')) {
      return emphasis.includes('morning') || emphasis.includes('discipline');
    }
    if (template.title.toLowerCase().includes('hospitality')) {
      return emphasis.includes('family') || emphasis.includes('community');
    }
    return true;
  });

  return (filtered.length ? filtered : goalTemplates).slice(0, 3);
}


