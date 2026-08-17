import { getKwiltGenerationJobContract } from '@kwilt/agent-runtime';

export type OnDeviceBenchmarkVariant =
  | 'batch_cold'
  | 'batch_prewarmed'
  | 'stream_cold'
  | 'stream_prewarmed';

export type OnDeviceBenchmarkCase = {
  id: string;
  prompt: string;
  instructions: string;
  maximumResponseTokens: number;
};

const SHORTEN_SOURCE = `I wanted to reach out and let you know that I am currently on my way, but traffic has been moving much more slowly than I originally expected. At this point, I think I will probably arrive about fifteen minutes later than the time we discussed. I am sorry for the inconvenience and for not realizing sooner that the drive would take longer. There is no need to change any of the plans on my account, and I will come directly inside as soon as I arrive. I just wanted to make sure you had an update instead of wondering where I was.`;

const SUMMARY_SOURCE = `The neighborhood picnic committee met Tuesday evening to decide how to handle this year's event. Attendance at last year's picnic was strong, but families reported that the food line was too long and that activities ended before many older children arrived. The committee agreed to keep the event at Cedar Park because it has shade, accessible paths, restrooms, and enough parking. The available Saturdays are June 14 and June 21. June 14 conflicts with the community swim meet, while June 21 conflicts with only one small baseball practice. The committee therefore selected June 21 from noon until four.

The group approved a potluck format but decided to provide the main dishes centrally. Jordan will request prices from two local restaurants for vegetarian, chicken, and gluten-free options by Friday. Priya will create a sign-up form for sides, desserts, drinks, setup, and cleanup. The form should open next Monday and close one week before the event. To shorten the food line, volunteers will create two serving stations with identical menus and a separate table for allergy-friendly food.

The activities plan includes lawn games throughout the afternoon, crafts from noon until two, and a family relay at three. Older children asked for something less structured, so the basketball court will remain open rather than hosting another scheduled contest. The committee still needs two volunteers certified in first aid and someone to borrow or rent an additional canopy. The approved spending limit is eight hundred dollars, including food, paper goods, permits, and any rental. The next meeting is May 28, when the committee will confirm restaurant costs, volunteer coverage, and the rain plan.`;

const CASES: OnDeviceBenchmarkCase[] = [
  {
    id: 'proofread',
    prompt: `Proofread this message: Hi everyone i wanted to check whether were still meeting at the library on thursday. I can bring the notes from last weeks discussion, but I wont be able to stay past eight. please let me know if the room or time has changed`,
    instructions: 'Correct grammar, spelling, capitalization, and punctuation while preserving meaning and voice. Return only the corrected text.',
    maximumResponseTokens: getKwiltGenerationJobContract('chat_proofread').local!.maximumResponseTokens,
  },
  {
    id: 'rewrite',
    prompt: `Rewrite this message to sound warm and considerate without changing its meaning: I cannot attend dinner tonight. I have too much work left and need to cancel. We can try another day.`,
    instructions: 'Rewrite as requested while preserving every fact. Return only the rewritten text.',
    maximumResponseTokens: getKwiltGenerationJobContract('chat_rewrite').local!.maximumResponseTokens,
  },
  {
    id: 'shorten',
    prompt: `Shorten this message while preserving the important facts:\n\n${SHORTEN_SOURCE}`,
    instructions: 'Make the supplied text meaningfully shorter while preserving important facts and intent. Return only the shortened text.',
    maximumResponseTokens: getKwiltGenerationJobContract('chat_shorten').local!.maximumResponseTokens,
  },
  {
    id: 'summarize',
    prompt: `Summarize this committee update with the decision, assignments, budget, unresolved needs, and next meeting:\n\n${SUMMARY_SOURCE}`,
    instructions: 'Summarize only the supplied text. Preserve decisions, owners, limits, unresolved items, and dates. Add no facts.',
    maximumResponseTokens: getKwiltGenerationJobContract('chat_summarize').local!.maximumResponseTokens,
  },
  {
    id: 'brainstorm',
    prompt: 'Brainstorm five distinct names for a monthly family recipe night. Each name must be two to four words, welcoming rather than competitive, and no two names may share the same main noun.',
    instructions: 'Return five genuinely distinct ideas that satisfy every constraint. Do not repeat names or merely renumber the same idea.',
    maximumResponseTokens: getKwiltGenerationJobContract('chat_brainstorm').local!.maximumResponseTokens,
  },
  {
    id: 'thread_title',
    prompt: 'User: How can I make Saturday feel calm while still getting groceries and preparing dinner?\nAssistant: Start by protecting a quiet morning, then group groceries and dinner preparation into one afternoon block.',
    instructions: 'Return only a specific three-to-six-word thread title under 36 characters, with no punctuation or generic chat label.',
    maximumResponseTokens: getKwiltGenerationJobContract('thread_title').local!.maximumResponseTokens,
  },
];

type OnDeviceBenchmarkOptions = {
  repetitions?: number;
  variants?: OnDeviceBenchmarkVariant[];
  caseIds?: string[];
};

export function buildOnDeviceGenerationBenchmarkPayload(
  input: number | OnDeviceBenchmarkOptions = 2,
) {
  const options = typeof input === 'number' ? { repetitions: input } : input;
  const selectedCaseIds = options.caseIds ? new Set(options.caseIds) : null;
  return {
    repetitions: options.repetitions ?? 2,
    prewarmDelayMs: 250,
    variants: options.variants ?? [
      'batch_cold',
      'batch_prewarmed',
      'stream_cold',
      'stream_prewarmed',
    ] as OnDeviceBenchmarkVariant[],
    cases: selectedCaseIds
      ? CASES.filter((benchmarkCase) => selectedCaseIds.has(benchmarkCase.id))
      : CASES,
  };
}

export function buildOnDeviceTitleGateBenchmarkPayload() {
  return buildOnDeviceGenerationBenchmarkPayload({
    repetitions: 30,
    variants: ['batch_cold', 'batch_prewarmed'],
    caseIds: ['thread_title'],
  });
}
