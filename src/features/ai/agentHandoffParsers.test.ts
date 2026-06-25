import {
  extractActivityProposalFromAssistantMessage,
  extractActivitySuggestionsFromAssistantMessage,
  extractAgentOffersFromAssistantMessage,
  extractArcProposalFromAssistantMessage,
  extractGoalProposalFromAssistantMessage,
} from './agentHandoffParsers';

describe('agent handoff parsers', () => {
  it('parses a bare Arc proposal as a hidden structured card handoff', () => {
    const parsed = extractArcProposalFromAssistantMessage(
      JSON.stringify({
        name: 'The Steady Maker',
        narrative: 'You are becoming someone who returns to the work.',
        status: 'active',
      }),
    );

    expect(parsed.displayContent).toBe('');
    expect(parsed.arcProposal).toMatchObject({
      name: 'The Steady Maker',
      narrative: 'You are becoming someone who returns to the work.',
    });
  });

  it('parses a marked Goal proposal and suppresses duplicate title prose', () => {
    const parsed = extractGoalProposalFromAssistantMessage(`
Title: Build a steady writing rhythm
Description: Draft three mornings a week.

GOAL_PROPOSAL_JSON:
\`\`\`json
{
  "title": "Build a steady writing rhythm",
  "description": "Draft three mornings a week.",
  "priority": 1,
  "suggestedArcName": "The Steady Maker",
  "metrics": [{ "label": "Writing sessions", "target": 12, "unit": "sessions" }]
}
\`\`\`
`);

    expect(parsed.displayContent).toBe('');
    expect(parsed.goalProposal).toMatchObject({
      title: 'Build a steady writing rhythm',
      priority: 1,
      suggestedArcName: 'The Steady Maker',
    });
    expect(parsed.goalProposal?.metrics).toEqual([
      expect.objectContaining({
        id: 'metric-1',
        label: 'Writing sessions',
        target: 12,
        unit: 'sessions',
      }),
    ]);
  });

  it('normalizes marked Activity suggestions', () => {
    const parsed = extractActivitySuggestionsFromAssistantMessage(`
Here are two concrete next moves.

ACTIVITY_SUGGESTIONS_JSON:
{
  "suggestions": [
    {
      "id": "a1",
      "title": "Return library books",
      "type": "task",
      "tags": ["Errands", "#errands", "Library"],
      "locationOffer": {
        "placeQuery": "Library",
        "label": "Main Library",
        "trigger": "arrive",
        "radiusM": 125
      },
      "steps": [{ "title": "Put books by the door" }]
    },
    { "id": "", "title": "Ignored" }
  ]
}
`);

    expect(parsed.displayContent).toBe('Here are two concrete next moves.');
    expect(parsed.suggestions).toHaveLength(1);
    expect(parsed.suggestions?.[0]).toMatchObject({
      id: 'a1',
      title: 'Return library books',
      type: 'task',
      tags: ['Errands', 'Library'],
      locationOffer: {
        placeQuery: 'Library',
        label: 'Main Library',
        trigger: 'arrive',
        radiusM: 125,
      },
      steps: [{ title: 'Put books by the door' }],
    });
  });

  it('parses a marked single Activity proposal with trailing prose', () => {
    const parsed = extractActivityProposalFromAssistantMessage(`
This is the best next action.

ACTIVITY_PROPOSAL_JSON:
{ "id": "next", "title": "Text Sam about Saturday", "energyLevel": "light" }

Want me to add it?
`);

    expect(parsed.displayContent).toBe('This is the best next action.');
    expect(parsed.suggestion).toMatchObject({
      id: 'next',
      title: 'Text Sam about Saturday',
      energyLevel: 'light',
    });
  });

  it('parses agent offer arrays from a hidden marker', () => {
    const parsed = extractAgentOffersFromAssistantMessage(`
I can help in a few focused ways.

AGENT_OFFERS_JSON:
[
  { "title": "Shape the goal", "userMessage": "Help me shape this into a clear goal." },
  { "id": "plan", "title": "Make a plan", "userMessage": "Turn this into a simple plan." }
]
`);

    expect(parsed.displayContent).toBe('I can help in a few focused ways.');
    expect(parsed.offers).toEqual([
      { id: 'offer-1', title: 'Shape the goal', userMessage: 'Help me shape this into a clear goal.' },
      { id: 'plan', title: 'Make a plan', userMessage: 'Turn this into a simple plan.' },
    ]);
  });
});
