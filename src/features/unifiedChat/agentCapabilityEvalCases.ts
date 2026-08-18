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
    | 'create-reminded-calendar-activity'
    | 'bulk-clean-past-due-activities'
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
    id: 'furnace-filter-calendar-primary', scenarioId: 'create-reminded-calendar-activity',
    prompt: 'Remind me to replace the furnace air filter in 10 months, and put it on my calendar.',
    expectedOperations: ['activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'furnace-filter-calendar-paraphrase', scenarioId: 'create-reminded-calendar-activity',
    prompt: 'In ten months, remind me to change the furnace filter and add it to my calendar.',
    expectedOperations: ['activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'air-filter-calendar-paraphrase', scenarioId: 'create-reminded-calendar-activity',
    prompt: 'Make a to-do to replace the air filter ten months from now, with a reminder and calendar placement.',
    expectedOperations: ['activities.capture'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'past-due-cleanup-primary', scenarioId: 'bulk-clean-past-due-activities',
    prompt: 'Look through all my past-due to-dos and remove their due dates and reminders.',
    expectedOperations: ['activities.update'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'past-due-cleanup-paraphrase', scenarioId: 'bulk-clean-past-due-activities',
    prompt: 'Clear the dates and reminders from every overdue to-do.',
    expectedOperations: ['activities.update'],
    expectedOutcome: 'proposal_or_receipt',
  },
  {
    id: 'overdue-cleanup-paraphrase', scenarioId: 'bulk-clean-past-due-activities',
    prompt: 'For all overdue tasks, remove both their due date and any reminder.',
    expectedOperations: ['activities.update'],
    expectedOutcome: 'proposal_or_receipt',
  },
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
  languageCase('money.read', 'Am I within my income spending limit?'),
  languageCase('money.review_transaction', 'Move my last Costco transaction to groceries.'),
  languageCase('money.category.create', 'Create a gifts category with $100 a month.'),
  languageCase('money.category.rename', 'Add an emoji directly to each Money category name that does not have one.'),
  languageCase('money.category.update', 'Raise my groceries plan to $700 a month.'),
  languageCase('money.app_control.review', 'Pause Amazon for me when my Shopping budget is running hot.'),
  languageCase('money.privacy.configure', 'Turn on Face ID for my Money details.'),
  languageCase('money.connection.connect', 'Connect my bank account to Money.'),
  languageCase('money.connection.sync', 'Sync my connected bank accounts now.'),
  languageCase('explore.open', undefined, 'Explore opens from the native capability menu; Chat does not receive or control precise location history.'),
  languageCase('games.open', undefined, 'Games opens from the native capability menu; Chat does not yet start sessions, seat players, or act on game state.'),
  languageCase('account.show_up_status', 'How is my show-up streak doing?'),
  languageCase('account.settings.open', 'Open my account settings.'),
  languageCase('account.subscription.manage', 'Let me manage my subscription.'),
  languageCase('account.delete', 'Delete my Kwilt account.'),
  languageCase('screen_time.read', 'What Screen Time rules are active for Charlie?'),
  languageCase('screen_time.personal.setup.open', 'Set up Screen Time controls for me on this phone.'),
  languageCase('screen_time.personal.limit.open', 'Let me use Instagram for 10 minutes each day before it pauses.'),
  languageCase('screen_time.agreement.create', 'On school nights, block Charlie\'s saved Games selection after 8 PM.'),
  languageCase('screen_time.agreement.update', 'Change Charlie\'s school-night game cutoff to 7:30 PM.'),
  languageCase('screen_time.agreement.deactivate', 'Turn off Charlie\'s recurring school-night game rule.'),
  languageCase('screen_time.override.block', 'Turn off Brawl Stars for Charlie and Grant for the next three hours.'),
  languageCase('screen_time.override.allow', 'Let Charlie use Brawl Stars for the next 30 minutes.'),
  languageCase('screen_time.override.cancel', 'Cancel the temporary Brawl Stars block for Charlie.'),
  languageCase('screen_time.request.decide', 'Approve Charlie\'s request for 20 minutes of Brawl Stars.'),
  languageCase('screen_time.selection.open', 'Choose Brawl Stars on Charlie\'s device for Screen Time.'),
  languageCase('screen_time.device.setup.open', 'Set up Charlie\'s phone for family Screen Time.'),
  languageCase('screen_time.device.release.open', 'Remove Kwilt Screen Time management from Charlie\'s phone.'),
  languageCase('screen_time.configure', 'Turn on Brawl Stars for Charlie.'),
  languageCase('recipes.search', 'Find the lemon pasta recipe we liked.'),
  languageCase('recipes.read', 'Show me the ingredients for our lemon pasta.'),
  languageCase('recipes.create', 'Create a private recipe called Sunday Waffles.'),
  languageCase('recipes.import.prepare', 'Turn this photo of Grandma\'s recipe card into a draft.'),
  languageCase('recipes.import.approve', 'Save the recipe draft exactly as I reviewed it.'),
  languageCase('recipes.update', 'Change the private note on Sunday Waffles.'),
  languageCase('recipes.scale.preview', 'Show me what this recipe needs for eight servings.'),
  languageCase('recipes.fork', 'Make my own editable copy of Alex\'s soup recipe.'),
  languageCase('recipes.share_copy.prepare', 'Prepare a copy of Sunday Waffles to share with Alex.'),
  languageCase('recipes.collaborator.invite', 'Invite Alex to help edit Sunday Waffles.'),
  languageCase('recipes.publication.prepare', 'Preview how my lemon pasta would look if I published it.'),
  languageCase('recipes.publication.publish', 'Publish the exact recipe version and destinations I just reviewed.'),
  languageCase('recipes.publication.attest_rights', undefined, 'Only the person can attest ownership or permission for recipe text and media.'),
  languageCase('recipes.delete', 'Delete my private Sunday Waffles recipe after showing me what depends on it.'),
  languageCase('meal_planning.plan.create', 'Start a meal plan for our next grocery trip.'),
  languageCase('meal_planning.plan.update', 'Change this meal plan to cover five dinners.'),
  languageCase('meal_planning.candidate.add', 'Add lemon pasta as an option for this meal plan.'),
  languageCase('meal_planning.candidate.remove', 'Remove tacos from this week\'s choices.'),
  languageCase('meal_planning.round.open', 'Ask the kids which of these meals they want.'),
  languageCase('meal_planning.round.close', 'Close the family meal vote and show me the totals.'),
  languageCase('meal_planning.response.submit', 'Vote for tacos and lemon pasta for me.'),
  languageCase('meal_planning.response.withdraw', 'Withdraw my meal choices while voting is still open.'),
  languageCase('meal_planning.plan.finalize', 'Finalize these four dinners for our next shop.'),
  languageCase('meal_planning.plan.revise', 'Reopen the finalized meal plan so I can replace Tuesday dinner.'),
  languageCase('meal_planning.candidates.prepare', 'Plan four cheap dinners everyone likes using what we already have.'),
  languageCase('food_budget.read', 'How much room is left in our food plan and what is the target for this trip?'),
  languageCase('food_stock.read', 'What can I cook with what we have?'),
  languageCase('food_stock.observe', 'I checked and we have two cans of black beans.'),
  languageCase('food_stock.deplete', 'We used the last of the rice.'),
  languageCase('groceries.compile', 'Build a grocery list from this finalized meal plan.'),
  languageCase('groceries.item.add', 'Add dishwasher tablets as a manual staple on this list.'),
  languageCase('groceries.item.update', 'Change canned tomatoes to two 28-ounce cans.'),
  languageCase('groceries.item.set_state', 'Mark olive oil as already at home.'),
  languageCase('groceries.list.review', 'Show me what we need and which recipes each item came from.'),
  languageCase('groceries.product_match.prepare', 'Find current product options for these canned tomatoes at my selected store.'),
  languageCase('groceries.product_match.confirm', 'Use the 28-ounce store-brand tomatoes I just reviewed.'),
  languageCase('groceries.handoff.prepare', 'Prepare this reviewed list for the selected retailer.'),
  languageCase('groceries.handoff.open', 'Open this reviewed grocery handoff in the retailer app.'),
  languageCase('groceries.checkout', undefined, 'Checkout, substitutions, delivery slots, and order submission remain retailer-owned.'),
  languageCase('groceries.payment', undefined, 'Kwilt does not autonomously execute grocery payment.'),
  languageCase('store_opportunity.capture', 'Chicken is $1.49 a pound at the store—save that price for review.'),
  languageCase('food_scenario.prepare', 'Should I buy the sale chicken and change this plan?'),
  languageCase('food_scenario.accept', 'Use the reviewed sale-chicken scenario.'),
  languageCase('savings.review', 'Show me current verified savings and the tradeoffs for this basket.'),
  languageCase('savings.accept', 'Accept the two current offers I just reviewed.'),
  languageCase('savings.coupon.apply_unsupported', undefined, 'Kwilt cannot claim a coupon was applied without provider activation acknowledgement.'),
  languageCase('savings.coupon.open', 'Open this coupon in the retailer app so I can activate it.'),
  languageCase('receipt.extract', 'Extract a private draft from this grocery receipt photo.'),
  languageCase('receipt.reconcile', 'Match these reviewed receipt lines and calculate what we actually saved.'),
  languageCase('cook_session.read', 'What step am I on and what is next?'),
  languageCase('cook_session.start', 'Start cooking this recipe for six people.'),
  languageCase('cook_session.control', 'Next step—and set a ten minute timer.'),
  languageCase('cook_session.complete', 'We finished dinner and I would make it again.'),
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
