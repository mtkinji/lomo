import {
  calendarDateInTimeZone,
  normalizeIanaTimeZone,
  type AgentToolDefinition,
} from '@kwilt/agent-runtime';
import type { CoachChatTurn } from '../../services/ai';
import type { SemanticRouterVisibleContext } from './semanticRequestRouter';

const MAX_PROMPT_LENGTH = 12_000;

function compactText(value: string, limit: number): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= limit ? compact : `${compact.slice(0, Math.max(0, limit - 1))}…`;
}

function localTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

function renderTool(tool: AgentToolDefinition): string {
  return [
    `- ${compactText(tool.id, 120)}`,
    `capability=${compactText(tool.capabilityId, 60)}`,
    `purpose=${compactText(tool.purpose, 140)}`,
    `effect=${tool.effect}`,
    `consequence=${tool.consequence}`,
    `confirmation=${tool.confirmation}`,
    `providers=${tool.providers.join(',') || 'none'}`,
  ].join(' | ');
}

export function buildAgentJudgmentPrompt(input: {
  prompt: string;
  now: Date;
  timeZone: string;
  visibleContext: readonly SemanticRouterVisibleContext[];
  recentTurns: readonly CoachChatTurn[];
  pendingWorkSummary: string | null;
  tools: readonly AgentToolDefinition[];
}): string {
  const timeZone = normalizeIanaTimeZone(input.timeZone) ?? 'UTC';
  const rules = [
    'Infer the practical job the user is trying to complete.',
    'Choose the smallest tool set that can achieve the desired outcome.',
    'Use direct_answer when no Kwilt data or action is needed.',
    'Use multi_tool only when multiple dependent operations materially help.',
    'Preserve every explicit date, time, recurrence, amount, title, and named target as a constraint.',
    'Ask one question only when a missing answer blocks safe progress.',
    'Treat clear acceptance of concrete suggestions from the recent dialogue as an action request.',
    'Questions, recommendations, hypotheticals, reviews, and suggestions have authorization=none and must use only read tools.',
    'Use authorization=explicit_request only for an explicit instruction to change something.',
    'Use authorization=accepted_prior_suggestion only when the recent dialogue contains a concrete suggestion that the user clearly accepts.',
    'Use evidenceScope=none without private context and evidenceScope=focused for a specific object or narrow question.',
    'Use evidenceScope=broad for a system review or pattern comparison that needs more than a few matching records.',
    'Use responseContract=evidence_linked whenever private evidence materially supports the answer.',
    'Use responseContract=direct when private evidence does not materially support the answer.',
    'Expose conclusions, material observations, inference, and limits in the answer, never private scratchpad or chain-of-thought.',
    'Do not claim or perform an action.',
  ].join('\n');
  const context = input.visibleContext
    .slice(0, 8)
    .map((item) => `- ${item.capabilityId}/${compactText(item.objectType, 60)}: ${compactText(item.label, 160)}`)
    .join('\n') || '- none';
  const recentTurns = input.recentTurns
    .slice(-6)
    .map((turn) => `${turn.role}: ${compactText(turn.content, 500)}`)
    .join('\n') || '- none';
  const tools = input.tools.map(renderTool).join('\n') || '- none';

  return [
    'Produce one strict Kwilt agent judgment artifact. This is interpretation and planning only.',
    rules,
    `Current local date: ${calendarDateInTimeZone(input.now, timeZone)}`,
    `Current local time: ${localTime(input.now, timeZone)}`,
    `Time zone: ${timeZone}`,
    `Current request:\n${compactText(input.prompt, 1_500)}`,
    `Visible in-app context (labels only; record ids are intentionally omitted):\n${context}`,
    `Pending work summary (label-level only):\n${input.pendingWorkSummary ? compactText(input.pendingWorkSummary, 700) : '- none'}`,
    `Recent dialogue (at most six turns):\n${recentTurns}`,
    [
      'Available tools. Select only these exact ids. Tool schemas are intentionally withheld until bounded execution:',
      tools,
    ].join('\n'),
  ].join('\n\n').slice(0, MAX_PROMPT_LENGTH);
}
