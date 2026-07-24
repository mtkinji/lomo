import {
  CHAT_CAPABILITY_COVERAGE,
  type ChatCapabilityCoverageState,
  type ChatCapabilityMobileOutcome,
  type ChatCapabilityPhoneOutcome,
} from './chatCapabilityCoverage';
import type { KwiltOperationId } from '../../capabilities/operations';

export type AgentCapabilityEvalCase = {
  id: string;
  operationId: string;
  mobileState: ChatCapabilityCoverageState;
  phoneState: ChatCapabilityCoverageState;
  toolIds: readonly string[];
  expectedMobileOutcome: ChatCapabilityMobileOutcome;
  expectedPhoneOutcome: ChatCapabilityPhoneOutcome;
};

export type AppControlEvalCase = {
  id: string;
  scenarioId:
    | 'create-recurring-reminded-activity'
    | 'read-tomorrow-plan'
    | 'create-walking-goal-and-routine'
    | 'future-screen-time-control';
  prompt: string;
  expectedOperations: readonly KwiltOperationId[];
  expectedOutcome: 'answer' | 'proposal_or_receipt' | 'native_review' | 'honest_boundary';
};

const standingCases = <const Cases extends readonly AppControlEvalCase[]>(cases: Cases) => cases;

/** The small, user-facing command matrix that defines the conversational-control MVP. */
export const APP_CONTROL_EVAL_CASES = standingCases([
  {
    id: 'trash-reminder-primary', scenarioId: 'create-recurring-reminded-activity',
    prompt: 'Create a to-do called Take out the trash and remind me every Tuesday at 8 PM.',
    expectedOperations: ['activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'trash-reminder-paraphrase', scenarioId: 'create-recurring-reminded-activity',
    prompt: 'Every Tuesday evening at eight, remind me to take out the trash.',
    expectedOperations: ['activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'bins-reminder-paraphrase', scenarioId: 'create-recurring-reminded-activity',
    prompt: 'Add taking the bins out as a weekly Tuesday 8 PM task with a reminder.',
    expectedOperations: ['activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'tomorrow-plan-primary', scenarioId: 'read-tomorrow-plan',
    prompt: "What's officially on my Plan tomorrow?",
    expectedOperations: ['plan.read_day_context'], expectedOutcome: 'answer',
  },
  {
    id: 'tomorrow-plan-paraphrase', scenarioId: 'read-tomorrow-plan',
    prompt: 'Show me what I already have planned and scheduled for tomorrow.',
    expectedOperations: ['plan.read_day_context'], expectedOutcome: 'answer',
  },
  {
    id: 'tomorrow-plan-placed-paraphrase', scenarioId: 'read-tomorrow-plan',
    prompt: 'Do I have anything actually placed on tomorrow yet?',
    expectedOperations: ['plan.read_day_context'], expectedOutcome: 'answer',
  },
  {
    id: 'walking-goal-primary', scenarioId: 'create-walking-goal-and-routine',
    prompt: 'Create a Goal to go on a walk every day for the next week and help me remember it.',
    expectedOperations: ['goals.create', 'activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'walking-goal-paraphrase', scenarioId: 'create-walking-goal-and-routine',
    prompt: 'I want a seven-day daily walking goal with a repeating to-do to keep me on track.',
    expectedOperations: ['goals.create', 'activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'daily-walk-paraphrase', scenarioId: 'create-walking-goal-and-routine',
    prompt: 'Set up a goal for walking each day next week, then add the daily routine for it.',
    expectedOperations: ['goals.create', 'activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'screen-time-primary', scenarioId: 'future-screen-time-control',
    prompt: 'Turn on Brawl Stars for Charlie.',
    expectedOperations: ['screen_time.configure'], expectedOutcome: 'honest_boundary',
  },
  {
    id: 'screen-time-paraphrase', scenarioId: 'future-screen-time-control',
    prompt: 'Let Charlie use Brawl Stars now.',
    expectedOperations: ['screen_time.configure'], expectedOutcome: 'honest_boundary',
  },
  {
    id: 'screen-time-access-paraphrase', scenarioId: 'future-screen-time-control',
    prompt: 'Enable Charlie\'s access to Brawl Stars.',
    expectedOperations: ['screen_time.configure'], expectedOutcome: 'honest_boundary',
  },
] as const);

export type OperationLanguageCase = {
  operationId: KwiltOperationId;
  prompt?: string;
  boundaryReason?: string;
};

const languageCase = (
  operationId: KwiltOperationId,
  prompt?: string,
  boundaryReason?: string,
): OperationLanguageCase => ({ operationId, prompt, boundaryReason });

/** One ordinary-language example or explicit boundary for every product-owned operation. */
export const OPERATION_LANGUAGE_CASES: readonly OperationLanguageCase[] = [
  languageCase('general.answer', 'Why do leaves change color?'),
  languageCase('general.answer_with_context', 'Given everything in Kwilt, what should I focus on?'),
  languageCase('relationships.read', 'What do you remember about Charlie?'),
  languageCase('relationships.remember', 'Remember that Charlie loves Brawl Stars.'),
  languageCase('relationships.correct', "Actually, Charlie's favorite game is Minecraft."),
  languageCase('relationships.forget', "Forget Charlie's favorite game."),
  languageCase('relationships.forget_person', undefined, 'Whole-person forgetting requires a complete dependency review and restore path.'),
  languageCase('profile.read', 'What name and preferences do you have saved for me?'),
  languageCase('profile.update', 'Call me Andy from now on.'),
  languageCase('arcs.list', 'Show me my Arcs.'),
  languageCase('arcs.get', 'Tell me about my Steady Parent Arc.'),
  languageCase('arcs.create', 'Create an Arc for becoming a steadier parent.'),
  languageCase('arcs.update', 'Rename my Parenting Arc to Steady Parent.'),
  languageCase('arcs.delete', 'Delete my old Marathon Arc.'),
  languageCase('goals.list', 'What Goals am I working on?'),
  languageCase('goals.get', 'How is my Daily Walk Goal going?'),
  languageCase('goals.create', 'Create a Goal to walk every day next week.'),
  languageCase('goals.update', 'Move my Daily Walk Goal deadline to Friday.'),
  languageCase('goals.delete', 'Delete my old Daily Walk Goal.'),
  languageCase('goals.check_in', 'Tell my Goal partners we made progress this week.'),
  languageCase('goals.share', 'Share my Daily Walk Goal with Alex.'),
  languageCase('activities.list', 'What to-dos are still open?'),
  languageCase('activities.get', 'Show me the Take out the trash to-do.'),
  languageCase('activities.search', 'Find my school-call to-do.'),
  languageCase('activities.capture', 'Add a to-do called Take out the trash.'),
  languageCase('activities.update', 'Rename Take out the trash to Put the bins out.'),
  languageCase('activities.complete', 'Mark Take out the trash complete.'),
  languageCase('activities.delete', 'Delete the Take out the trash to-do.'),
  languageCase('activities.steps.create', 'Add Buy trash bags as a step.'),
  languageCase('activities.steps.update', 'Rename the first step to Buy large trash bags.'),
  languageCase('activities.steps.complete', 'Mark Buy trash bags done.'),
  languageCase('activities.steps.delete', 'Remove the Buy trash bags step.'),
  languageCase('activities.steps.reorder', 'Move Buy trash bags to the top.'),
  languageCase('activities.focus.open', 'Start a focus session for writing the proposal.'),
  languageCase('activities.focus_today', 'Make the school call a focus for today.'),
  languageCase('activities.schedule', 'Schedule the school call tomorrow at two.'),
  languageCase('activities.reminder.update', 'Remind me about the trash at 8 PM.'),
  languageCase('activities.repeat.update', 'Make the trash to-do repeat every Tuesday.'),
  languageCase('activities.location.update', 'Run this to-do when I arrive at Costco.'),
  languageCase('activities.attachments.update', 'Attach this receipt to the Costco to-do.'),
  languageCase('activities.share', 'Share the Costco to-do with Alex.'),
  languageCase('plan.schedule_chunks', 'Split this project into three blocks on my Plan.'),
  languageCase('plan.read_day_context', "What's officially on my Plan tomorrow?"),
  languageCase('plan.recommend_day', 'What should I add to my Plan tomorrow?'),
  languageCase('plan.schedule_activity', 'Put the school call on my Plan tomorrow afternoon.'),
  languageCase('plan.reschedule_activity', 'Move the school call thirty minutes later.'),
  languageCase('plan.remove_activity', 'Take the school call off tomorrow\'s Plan.'),
  languageCase('plan.preferences.open', 'Open my Plan preferences.'),
  languageCase('chapters.list', 'Show me my recent Chapters.'),
  languageCase('chapters.get', 'Open my latest weekly Chapter.'),
  languageCase('chapters.reflect', 'What patterns have I been learning lately?'),
  languageCase('chapters.note.update', 'Add a note to my latest Chapter that sleep mattered.'),
  languageCase('account.show_up_status', 'How is my show-up streak doing?'),
  languageCase('account.settings.open', 'Open my account settings.'),
  languageCase('account.subscription.manage', 'Let me manage my subscription.'),
  languageCase('account.delete', 'Delete my Kwilt account.'),
  languageCase('screen_time.configure', 'Turn on Brawl Stars for Charlie.'),
  languageCase('notifications.configure', 'Open notification settings so I can change reminders.'),
  languageCase('search.open', 'Search all of Kwilt for school.'),
  languageCase('channel.phone.continue_run', 'Continue this conversation on my phone.'),
];

// Channel behavior comes from the executable capability manifest. This file deliberately
// contains no second allowlist that can drift from provider availability.
export const AGENT_CAPABILITY_EVAL_CASES: readonly AgentCapabilityEvalCase[] =
  CHAT_CAPABILITY_COVERAGE.map((row) => ({
    id: `manifest:${row.id}`,
    operationId: row.id,
    mobileState: row.channels.mobile.state,
    phoneState: row.channels.phone.state,
    toolIds: row.toolIds,
    expectedMobileOutcome: row.channels.mobile.outcome,
    expectedPhoneOutcome: row.channels.phone.outcome,
  }));
