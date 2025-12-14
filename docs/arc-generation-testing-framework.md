# Arc Generation Testing Framework

This document describes the testing framework for comparing different prompting paradigms used in Arc generation.

## Overview

The framework allows you to test multiple prompt variations against synthetic questionnaire responses to identify which approaches produce the highest quality Arcs.

## Components

### 1. Synthetic Questionnaire Responses (`SYNTHETIC_RESPONSES`)

10 diverse synthetic responses covering different personas:
- **craftsperson** - Woodworker who wants to build a small honest studio
- **entrepreneur** - Tech founder focused on building Kwilt lifestyle app
- **family_steward** - Parent focused on creating a nurturing home environment
- **creative_explorer** - Artist exploring new creative mediums
- **spiritual_seeker** - Person deepening their faith practice
- **problem_solver** - Engineer who wants to solve meaningful problems
- **community_builder** - Person focused on bringing people together
- **health_warrior** - Person rebuilding physical strength and energy
- **maker_creator** - Person who loves hands-on making and physical creation
- **learner_teacher** - Educator focused on mastery and sharing knowledge

Each response includes all the fields collected in the IdentityAspirationFlow:
- Domain, motivation, signature trait, growth edge, proud moment
- Meaning, impact, values, philosophy, vocation
- Optional: why now, big dreams, nickname

### 2. Prompt Paradigms (`PROMPT_PARADIGMS`)

10 different prompting approaches:

1. **Baseline (Current System)** - The existing prompt structure from IdentityAspirationFlow
2. **Narrative-First Approach** - Frames inputs as a cohesive story of becoming
3. **Identity Spine Approach** - Emphasizes finding ONE clear identity through-line
4. **Dream-Anchor Approach** - Prioritizes big dreams as the primary naming/narrative anchor
5. **Minimalist Approach** - Uses only domain, vibe, proud moment, and big dreams
6. **Question-Answer Format** - Presents inputs as answers to identity-discovery questions
7. **Contrast-Based Approach** - Frames identity in terms of moving away from X and toward Y
8. **Values-First Approach** - Starts with values and meaning, then builds identity direction
9. **Archetype/Emulation Approach** - Infers identity direction from role models and admired qualities (asks: "What kind of people do you look up to?", "Any specific people?", "What about them do you admire?")
10. **Hybrid: Minimalist + Archetype** - Combines Minimalist's survey ease with Archetype's personalization potential. See [hybrid-paradigm-testing-results.md](./hybrid-paradigm-testing-results.md) for detailed testing documentation.

### 3. Testing Functions

- `runSingleTest(paradigm, response)` - Test one paradigm against one response
- `testAllParadigmsForResponse(response)` - Test all paradigms against one response
- `runFullTestSuite()` - Test all paradigms against all responses
- `formatTestResults(comparison)` - Format results for human review

## Usage

### Via Dev Tools Screen

1. Open the app in development mode
2. Navigate to **Dev Mode** → **Arc Testing** tab
3. Choose an action:
   - **Run Full Test Suite** - Tests all paradigms against all 10 responses (90 total tests: 9 paradigms × 10 responses)
   - **Test This Response** - Tests all paradigms against a specific response
4. Review results in the output panel

### Programmatic Usage

```typescript
import {
  SYNTHETIC_RESPONSES,
  PROMPT_PARADIGMS,
  runFullTestSuite,
  testAllParadigmsForResponse,
  runSingleTest,
} from '../features/arcs/arcGenerationTesting';

// Run full test suite
const results = await runFullTestSuite();

// Test all paradigms for one response
const response = SYNTHETIC_RESPONSES[0];
const comparison = await testAllParadigmsForResponse(response);

// Test one paradigm against one response
const paradigm = PROMPT_PARADIGMS[0];
const testResult = await runSingleTest(paradigm, response);
```

## Interpreting Results

When reviewing test results, look for:

1. **Arc Name Quality**
   - Is it identity-oriented (not task-based)?
   - Does it feel stable over years?
   - Does it use the user's language?

2. **Narrative Quality**
   - Does it start with "I want..."?
   - Is it 3 sentences, 40-120 words?
   - Is it grounded and personal?
   - Does it avoid guru-speak and corporate language?

3. **Alignment with Inputs**
   - Does it reflect the user's domain, vibe, and values?
   - Are big dreams woven in naturally (if present)?
   - Does it capture the "why now" (if provided)?

4. **Distinctiveness**
   - Do different paradigms produce meaningfully different Arcs?
   - Which paradigm produces the most resonant results?

## Adding New Paradigms

To add a new prompt paradigm:

1. Create a new `PromptParadigm` object in `arcGenerationTesting.ts`:

```typescript
const paradigm9_YourApproach: PromptParadigm = {
  id: 'your_approach',
  name: 'Your Approach Name',
  description: 'Description of what makes this approach unique',
  buildPrompt: (response) => {
    // Build your prompt from the response
    return {
      prompt: 'Your prompt here',
      timeHorizon: 'optional',
      additionalContext: 'optional',
    };
  },
};
```

2. Add it to the `PROMPT_PARADIGMS` array

## Adding New Synthetic Responses

To add a new synthetic response:

1. Create a new `SyntheticQuestionnaireResponse` object:

```typescript
{
  id: 'unique_id',
  description: 'Human-readable description',
  domain: 'Domain value',
  motivation: 'Motivation value',
  // ... other required fields
  bigDreams: [], // optional
  nickname: undefined, // optional
  // Archetype/emulation fields (optional, for testing paradigm 9):
  roleModelType: 'Kind of people they look up to',
  specificRoleModels: ['Person 1', 'Person 2'],
  admiredQualities: ['Quality 1', 'Quality 2'],
}
```

2. Add it to the `SYNTHETIC_RESPONSES` array

**Note:** Some responses already include role model data to test the Archetype/Emulation paradigm. Responses without role model data will fall back to the baseline paradigm when using that approach.

## Best Practices

1. **Run tests with API key** - The framework falls back to mock data if no API key is present, but real tests require an OpenAI API key
2. **Review systematically** - Compare paradigms side-by-side for the same response
3. **Look for patterns** - Which paradigms consistently produce better results?
4. **Consider edge cases** - Test responses with and without big dreams, nicknames, etc.
5. **Document findings** - Keep notes on which paradigms work best for which types of responses

## Files

- `src/features/arcs/arcGenerationTesting.ts` - Core testing framework
- `src/features/dev/ArcGenerationTestingScreen.tsx` - UI for running tests
- `src/features/dev/DevToolsScreen.tsx` - Dev tools integration

