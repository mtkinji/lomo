import type {
  AgentJudgmentConstraint,
  AgentJudgmentExecutionMode,
} from './agentJudgment';
import type { UnifiedChatCapabilityId } from './requestPolicy';

export type AgentJudgmentEvalCase = {
  id: string;
  prompt: string;
  expectedExecutionMode: AgentJudgmentExecutionMode;
  expectedCapabilities: UnifiedChatCapabilityId[];
  expectedToolIds: string[];
  expectedConstraintKinds: AgentJudgmentConstraint['kind'][];
  expectedClarification: boolean;
};

const c = (
  id: string,
  prompt: string,
  expectedExecutionMode: AgentJudgmentExecutionMode,
  expectedCapabilities: UnifiedChatCapabilityId[],
  expectedToolIds: string[],
  expectedConstraintKinds: AgentJudgmentConstraint['kind'][],
  expectedClarification = false,
): AgentJudgmentEvalCase => ({
  id,
  prompt,
  expectedExecutionMode,
  expectedCapabilities,
  expectedToolIds,
  expectedConstraintKinds,
  expectedClarification,
});

const explicitActivityDates = [
  c('date-absolute-aug-5', 'Add Call the dentist on August 5.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-absolute-iso', 'Create a To-do called Renew passport for 2026-08-28.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-weekday', 'Add Pick up dry cleaning next Thursday.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-today', 'Add Buy milk for today.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-tomorrow', 'Remember to call Mom tomorrow.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-end-month', 'Add Submit expense report for the last day of this month.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-next-monday', 'Create Pack lunches for next Monday.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-month-day', 'Add Order birthday cake on September 12.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-this-friday', 'Add Send the proposal this Friday.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
  c('date-weekend', 'Create Clean the garage for this Saturday.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date']),
];

const remindersAndRecurrence = [
  c('repeat-tuesday-8', 'Remind me every Tuesday at 8 PM to take out the trash.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'time', 'recurrence']),
  c('repeat-weekdays-730', 'Every weekday at 7:30 AM remind me to pack lunch.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'time', 'recurrence']),
  c('repeat-monthly-1st', 'Remind me on the first of every month at 9 AM to review the budget.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'time', 'recurrence']),
  c('repeat-daily-6', 'Add a daily 6 PM reminder to take my walk.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'time', 'recurrence']),
  c('repeat-weekly-sun', 'Every Sunday at noon remind me to plan meals.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'time', 'recurrence']),
  c('repeat-vague-night', 'Remind me every Tuesday night to take out the trash.', 'clarify', ['todos'], [], ['title', 'recurrence'], true),
  c('repeat-vague-morning', 'Every morning remind me to stretch.', 'clarify', ['todos'], [], ['title', 'recurrence'], true),
  c('repeat-biweekly', 'Every other Friday at 4 PM remind me to submit my timesheet.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'time', 'recurrence']),
  c('repeat-monthly-last', 'At 5 PM on the last weekday each month remind me to close the books.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'time', 'recurrence']),
  c('repeat-yearly', 'Remind me every year on October 1 at 10 AM to renew the pass.', 'single_tool', ['todos'], ['activities.capture'], ['title', 'date', 'time', 'recurrence']),
];

const planQuestionsAndMutations = [
  c('plan-read-tomorrow', "What's officially on my Plan tomorrow?", 'single_tool', ['plan'], ['plan.read_day_context'], ['date']),
  c('plan-read-today', 'What is actually on my Plan today?', 'single_tool', ['plan'], ['plan.read_day_context'], ['date']),
  c('plan-recommend-tomorrow', 'What should I add to my Plan tomorrow?', 'single_tool', ['plan'], ['plan.recommend_day'], ['date']),
  c('plan-schedule-school', 'Put the school call on my Plan tomorrow at 9 AM.', 'multi_tool', ['todos', 'plan'], ['plan.read_day_context', 'plan.schedule_activity'], ['title', 'date', 'time']),
  c('plan-reschedule-later', 'Move the school call thirty minutes later.', 'single_tool', ['todos', 'plan'], ['plan.reschedule_activity'], ['title', 'time']),
  c('plan-remove', "Take the school call off tomorrow's Plan.", 'single_tool', ['todos', 'plan'], ['plan.remove_activity'], ['title', 'date']),
  c('plan-afternoon', 'Schedule my dentist call tomorrow afternoon.', 'multi_tool', ['todos', 'plan'], ['plan.read_day_context', 'plan.schedule_activity'], ['title', 'date', 'time']),
  c('plan-followup-thursday', 'Actually, make that Thursday.', 'single_tool', ['todos', 'plan'], ['plan.reschedule_activity'], ['date']),
  c('plan-read-friday', 'Show me what is already placed on Friday.', 'single_tool', ['plan'], ['plan.read_day_context'], ['date']),
  c('plan-recommend-light', 'Could tomorrow feel less crowded?', 'single_tool', ['plan'], ['plan.recommend_day'], ['date']),
];

const multiToolJobs = [
  c(
    'multi-furnace-filter-calendar',
    'Remind me to replace the furnace air filter in 10 months, and put it on my calendar.',
    'single_tool',
    ['todos', 'plan'],
    ['activities.capture'],
    ['title', 'date'],
  ),
  c('multi-dentist', 'Help me make room for the dentist next week and remind me to call first.', 'multi_tool', ['todos', 'plan'], ['plan.read_day_context', 'activities.capture', 'plan.schedule_activity'], ['date', 'other']),
  c('multi-goal-walk', 'Create a Goal to walk every day next week and add the daily To-do.', 'multi_tool', ['goals', 'todos'], ['goals.create', 'activities.capture'], ['title', 'date', 'recurrence']),
  c('multi-plan-capture', 'Check tomorrow, then add Buy groceries if it is not already there.', 'multi_tool', ['todos', 'plan'], ['plan.read_day_context', 'activities.capture'], ['title', 'date', 'other']),
  c('multi-read-place', 'Read Friday and place my school call in an open morning slot.', 'multi_tool', ['todos', 'plan'], ['plan.read_day_context', 'plan.schedule_activity'], ['title', 'date', 'time']),
  c(
    'multi-bulk-clear-past-due-scheduling',
    'Look through all my past-due to-dos and remove their due dates and reminders.',
    'single_tool',
    ['todos'],
    ['activities.update'],
    ['date', 'other'],
  ),
  c('multi-relationship-correct', "Check what you remember about Lily's birthday, then correct it to October 12.", 'multi_tool', ['relationships'], ['relationships.read', 'relationships.correct'], ['person', 'date']),
  c('multi-plan-goal', 'Review tomorrow against my Goals and suggest the best realistic Plan.', 'multi_tool', ['goals', 'plan'], ['goals.read', 'plan.read_day_context', 'plan.recommend_day'], ['date']),
  c('multi-read-reschedule', 'See what is on Tuesday, then move the dentist call after lunch.', 'multi_tool', ['todos', 'plan'], ['plan.read_day_context', 'plan.reschedule_activity'], ['title', 'date', 'time']),
  c('multi-goal-followup', 'Make learning watercolor a Goal and create a weekly practice To-do.', 'multi_tool', ['goals', 'todos'], ['goals.create', 'activities.capture'], ['title', 'recurrence']),
];

const noToolRequests = [
  c('none-leaves', 'Why do leaves change color?', 'direct_answer', [], [], []),
  c('none-poem', 'Write a short poem about rain.', 'direct_answer', [], [], []),
  c('none-recipe', 'Give me a simple pancake recipe.', 'direct_answer', [], [], []),
  c('none-draft-email', 'Draft a polite email declining a meeting.', 'direct_answer', [], [], []),
  c('none-explain-tides', 'Explain tides to a ten-year-old.', 'direct_answer', [], [], []),
  c('none-brainstorm', 'Brainstorm five rainy-day family activities.', 'direct_answer', [], [], []),
  c('none-reflect', 'Help me reflect on why starting feels hard without using my Kwilt data.', 'direct_answer', [], [], []),
  c('none-summary', 'Summarize this sentence: Small steps build trust.', 'direct_answer', [], [], []),
  c('none-joke', 'Tell me a gentle calendar joke.', 'direct_answer', [], [], []),
  c('none-current-weather', 'What is the weather in Denver tomorrow?', 'direct_answer', [], [], ['date']),
];

const boundariesAndAmbiguity = [
  c('boundary-money-transfer', 'Transfer $500 from checking to savings.', 'boundary', [], [], ['amount']),
  c('boundary-medical', 'Diagnose this chest pain for me.', 'boundary', [], [], []),
  c('boundary-legal', 'Tell me the legal strategy I should use in court.', 'boundary', [], [], []),
  c('boundary-tax-file', 'File my taxes for me.', 'boundary', [], [], []),
  c('boundary-screen-time', 'Turn on Brawl Stars for Charlie without asking Apple.', 'boundary', ['screenTime'], [], ['person', 'other']),
  c('clarify-missing-target', 'Move it to tomorrow.', 'clarify', ['todos', 'plan'], [], ['date'], true),
  c('clarify-conflicting-dates', 'Add Call Mom tomorrow, actually next Friday.', 'clarify', ['todos'], [], ['title', 'date'], true),
  c('clarify-missing-person', 'Remember that they love dragons.', 'clarify', ['relationships'], [], ['other'], true),
  c('clarify-missing-time', 'Schedule the school call tomorrow sometime.', 'clarify', ['todos', 'plan'], [], ['title', 'date'], true),
  c('boundary-provider', 'Book and pay for a dentist appointment next week.', 'boundary', [], [], ['date']),
];

export const AGENT_JUDGMENT_EVAL_CASES: readonly AgentJudgmentEvalCase[] = [
  ...explicitActivityDates,
  ...remindersAndRecurrence,
  ...planQuestionsAndMutations,
  ...multiToolJobs,
  ...noToolRequests,
  ...boundariesAndAmbiguity,
];
