import type { GeneratedArc } from '../../services/ai';
import type { ActivityType, Goal, GoalForceIntent, Metric } from '../../domain/types';

export const ARC_PROPOSAL_MARKER = 'ARC_PROPOSAL_JSON:';
export const ACTIVITY_SUGGESTIONS_MARKER = 'ACTIVITY_SUGGESTIONS_JSON:';
export const ACTIVITY_PROPOSAL_MARKER = 'ACTIVITY_PROPOSAL_JSON:';
export const GOAL_PROPOSAL_MARKER = 'GOAL_PROPOSAL_JSON:';
export const AGENT_OFFERS_MARKER = 'AGENT_OFFERS_JSON:';

export type ParsedAssistantReply = {
  /**
   * Content that should be rendered in the visible transcript.
   */
  displayContent: string;
  /**
   * Optional Arc proposal parsed from a hidden JSON handoff block.
   */
  arcProposal: GeneratedArc | null;
};

export type AgentOffer = {
  id: string;
  title: string;
  userMessage: string;
};

export type ParsedAgentOffers = {
  displayContent: string;
  offers: AgentOffer[] | null;
};

export type GoalProposalDraft = {
  title: string;
  description?: string;
  status?: Goal['status'];
  /**
   * Optional Arc container for the draft (used when adopting a goal proposal while already scoped to an Arc).
   * When omitted, the caller can still infer Arc from surrounding context.
   */
  arcId?: string | null;
  /**
   * Optional priority level (1 = high, 2 = medium, 3 = low). Cascades to activity
   * recommendation scoring when the goal is adopted.
   */
  priority?: 1 | 2 | 3;
  suggestedArcName?: string | null;
  forceIntent?: GoalForceIntent;
  timeHorizon?: string;
  targetDate?: string;
  metrics?: Metric[];
  thumbnailUrl?: string;
  heroImageMeta?: Goal['heroImageMeta'];
};

export type ParsedGoalProposal = {
  displayContent: string;
  goalProposal: GoalProposalDraft | null;
};

export type ActivitySuggestion = {
  id: string;
  title: string;
  /**
   * Optional hint for what *kind* of activity artifact this should be (task vs list vs recipe).
   * If omitted, the host will default to `task`.
   */
  type?: ActivityType;
  /**
   * Optional lightweight grouping tags (e.g. "errands", "outdoors").
   * These are stored directly on the Activity as simple strings.
   */
  tags?: string[];
  why?: string;
  timeEstimateMinutes?: number;
  energyLevel?: 'light' | 'focused';
  kind?: 'setup' | 'progress' | 'maintenance' | 'stretch';
  /**
   * Optional suggestion for a location-based completion offer (geofence).
   * If present, the host app may geocode the query and attach it to the Activity.
   */
  locationOffer?: {
    /**
     * Free-text place query suitable for geocoding (e.g. "Whole Foods, Berkeley" / "Home").
     */
    placeQuery: string;
    /**
     * User-facing label override (optional). If absent, the geocoder result label is used.
     */
    label?: string;
    /**
     * Trigger semantics: notify on arriving or leaving.
     */
    trigger?: 'arrive' | 'leave';
    /**
     * Optional radius for the place boundary. If absent, a sensible default is used.
     */
    radiusM?: number;
  };
  steps?: {
    title: string;
    isOptional?: boolean;
  }[];
};

export type ParsedActivitySuggestions = {
  displayContent: string;
  suggestions: ActivitySuggestion[] | null;
};

export type ParsedActivityProposal = {
  displayContent: string;
  suggestion: ActivitySuggestion | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeActivityType(raw: unknown): ActivityType | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  if (
    value === 'task' ||
    value === 'checklist' ||
    value === 'shopping_list' ||
    value === 'instructions' ||
    value === 'plan'
  ) {
    return value;
  }
  if (value.startsWith('custom:')) {
    const label = value.slice('custom:'.length).trim();
    if (label.length === 0) return null;
    return value as ActivityType;
  }
  return null;
}

function normalizeActivitySuggestion(raw: unknown): ActivitySuggestion | null {
  const maybe = asRecord(raw);
  if (!maybe) return null;

  if (typeof maybe.id !== 'string' || maybe.id.trim().length === 0) return null;
  if (typeof maybe.title !== 'string' || maybe.title.trim().length === 0) return null;

  const normalized: ActivitySuggestion = {
    id: maybe.id.trim(),
    title: maybe.title.trim(),
  };

  const normalizedType = normalizeActivityType(maybe.type);
  if (normalizedType) {
    normalized.type = normalizedType;
  }

  if (Array.isArray(maybe.tags)) {
    const seen = new Set<string>();
    const tags = maybe.tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .map((tag) => (tag.startsWith('#') ? tag.slice(1).trim() : tag))
      .filter((tag) => tag.length > 0)
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);

    if (tags.length > 0) {
      normalized.tags = tags;
    }
  }

  if (typeof maybe.why === 'string' && maybe.why.trim().length > 0) {
    normalized.why = maybe.why.trim();
  }

  if (typeof maybe.timeEstimateMinutes === 'number' && Number.isFinite(maybe.timeEstimateMinutes)) {
    normalized.timeEstimateMinutes = maybe.timeEstimateMinutes;
  }

  if (maybe.energyLevel === 'light' || maybe.energyLevel === 'focused') {
    normalized.energyLevel = maybe.energyLevel;
  }

  if (
    maybe.kind === 'setup' ||
    maybe.kind === 'progress' ||
    maybe.kind === 'maintenance' ||
    maybe.kind === 'stretch'
  ) {
    normalized.kind = maybe.kind;
  }

  if (Array.isArray(maybe.steps)) {
    const steps = maybe.steps
      .map((step) => {
        const record = asRecord(step);
        if (!record || typeof record.title !== 'string') return null;
        const title = record.title.trim();
        if (!title) return null;
        const isOptional = typeof record.isOptional === 'boolean' ? record.isOptional : undefined;
        return { title, ...(typeof isOptional === 'boolean' ? { isOptional } : {}) };
      })
      .filter((step): step is { title: string; isOptional?: boolean } => Boolean(step));

    if (steps.length > 0) {
      normalized.steps = steps;
    }
  }

  const rawLocationOffer = asRecord(maybe.locationOffer);
  if (rawLocationOffer) {
    const placeQuery = typeof rawLocationOffer.placeQuery === 'string' ? rawLocationOffer.placeQuery.trim() : '';
    if (placeQuery.length > 0) {
      const label = typeof rawLocationOffer.label === 'string' ? rawLocationOffer.label.trim() : undefined;
      const trigger =
        rawLocationOffer.trigger === 'arrive' || rawLocationOffer.trigger === 'leave'
          ? rawLocationOffer.trigger
          : undefined;
      const radiusM =
        typeof rawLocationOffer.radiusM === 'number' && Number.isFinite(rawLocationOffer.radiusM)
          ? rawLocationOffer.radiusM
          : undefined;

      normalized.locationOffer = {
        placeQuery,
        ...(label && label.length > 0 ? { label } : null),
        ...(trigger ? { trigger } : null),
        ...(typeof radiusM === 'number' ? { radiusM } : null),
      };
    }
  }

  return normalized;
}

export function normalizeGoalTargetDate(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const startOfToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  };
  const defaultFutureTarget = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    date.setHours(23, 0, 0, 0);
    return date;
  };

  // Prefer a local end-of-day interpretation for YYYY-MM-DD inputs.
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const date = new Date(year, month - 1, day, 23, 0, 0, 0);
      const normalized = date < startOfToday() ? defaultFutureTarget() : date;
      return normalized.toISOString();
    }
  }

  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return undefined;
  const date = new Date(ms);
  // Normalize to local end-of-day so "today" doesn't appear as already past.
  date.setHours(23, 0, 0, 0);
  const normalized = date < startOfToday() ? defaultFutureTarget() : date;
  return normalized.toISOString();
}

function normalizeGoalMetric(raw: unknown, fallbackIndex: number): Metric | null {
  const maybe = asRecord(raw);
  if (!maybe) return null;

  const label = typeof maybe.label === 'string' ? maybe.label.trim() : '';
  if (!label) return null;

  const id =
    typeof maybe.id === 'string' && maybe.id.trim().length > 0
      ? maybe.id.trim()
      : `metric-${fallbackIndex + 1}`;

  const rawKind = typeof maybe.kind === 'string' ? maybe.kind.trim() : '';
  const normalizedKind: Metric['kind'] =
    rawKind === 'count' || rawKind === 'threshold' || rawKind === 'event_count' || rawKind === 'milestone'
      ? rawKind
      : rawKind === 'event-count'
        ? 'event_count'
        : undefined;

  const baseline = typeof maybe.baseline === 'number' && Number.isFinite(maybe.baseline) ? maybe.baseline : undefined;
  const target = typeof maybe.target === 'number' && Number.isFinite(maybe.target) ? maybe.target : undefined;
  const unit = typeof maybe.unit === 'string' && maybe.unit.trim().length > 0 ? maybe.unit.trim() : undefined;

  const completedAtRaw = typeof maybe.completedAt === 'string' ? maybe.completedAt.trim() : '';
  const completedAtMs = completedAtRaw ? Date.parse(completedAtRaw) : NaN;
  const completedAt = Number.isFinite(completedAtMs) ? new Date(completedAtMs).toISOString() : undefined;

  return {
    id,
    ...(normalizedKind ? { kind: normalizedKind } : null),
    label,
    ...(typeof baseline === 'number' ? { baseline } : null),
    ...(typeof target === 'number' ? { target } : null),
    ...(unit ? { unit } : null),
    ...(completedAt ? { completedAt } : null),
  };
}

function normalizeGoalMetrics(raw: unknown): Metric[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const metrics = raw
    .map((entry, idx) => normalizeGoalMetric(entry, idx))
    .filter((entry): entry is Metric => Boolean(entry))
    .slice(0, 3);
  return metrics.length > 0 ? metrics : undefined;
}

function extractJsonCandidateFromHandoffBlock(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;

  // Strip a single outer code-fence wrapper if present.
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z0-9]*\s*/, '').trim();
    text = text.replace(/```$/, '').trim();
  }

  // Prefer the first "paragraph" only to avoid trailing assistant commentary.
  const [firstBlock] = text.split(/\n\s*\n/);
  text = (firstBlock ?? '').trim();
  if (!text) return null;

  // If the model emitted prose before the JSON, try to skip forward to the first JSON token.
  const firstJsonIdx = text.search(/[\{\[]/);
  if (firstJsonIdx === -1) return null;
  text = text.slice(firstJsonIdx).trim();

  // If there is trailing prose after the JSON, trim to the last closing brace/bracket.
  const lastCloseIdx = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (lastCloseIdx !== -1 && lastCloseIdx < text.length - 1) {
    text = text.slice(0, lastCloseIdx + 1).trim();
  }

  const looksLikeJsonObject = text.startsWith('{') && text.endsWith('}');
  const looksLikeJsonArray = text.startsWith('[') && text.endsWith(']');
  if (!looksLikeJsonObject && !looksLikeJsonArray) return null;

  return text;
}

function normalizeAgentOffer(raw: unknown, fallbackIndex: number): AgentOffer | null {
  const maybe = asRecord(raw);
  if (!maybe) return null;
  const title = typeof maybe.title === 'string' ? maybe.title.trim() : '';
  const userMessage = typeof maybe.userMessage === 'string' ? maybe.userMessage.trim() : '';
  if (!title || !userMessage) return null;
  const id =
    typeof maybe.id === 'string' && maybe.id.trim().length > 0
      ? maybe.id.trim()
      : `offer-${fallbackIndex + 1}`;
  return { id, title, userMessage };
}

export function extractAgentOffersFromAssistantMessage(content: string): ParsedAgentOffers {
  const markerIndex = content.indexOf(AGENT_OFFERS_MARKER);
  if (markerIndex === -1) {
    return { displayContent: content, offers: null };
  }

  const visiblePart = content.slice(0, markerIndex).trim();
  const afterMarker = content.slice(markerIndex + AGENT_OFFERS_MARKER.length).trim();
  if (!afterMarker) {
    return { displayContent: visiblePart || content, offers: null };
  }

  const jsonText = extractJsonCandidateFromHandoffBlock(afterMarker);
  if (!jsonText) {
    return { displayContent: visiblePart || content, offers: null };
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(parsed)) {
      return { displayContent: visiblePart || content, offers: null };
    }
    const offers = parsed
      .map((entry, idx) => normalizeAgentOffer(entry, idx))
      .filter((entry): entry is AgentOffer => Boolean(entry))
      .slice(0, 5);
    return { displayContent: visiblePart || content, offers: offers.length > 0 ? offers : null };
  } catch {
    return { displayContent: visiblePart || content, offers: null };
  }
}

export function extractFocusedActivityTitleFromLaunchContext(launchContext: string | undefined): string | null {
  if (!launchContext) return null;
  const match = launchContext.match(/FOCUSED ACTIVITY[\s\S]*?\n-\s*([^\n]+?)\s*\(status:/i);
  const title = match?.[1]?.trim();
  return title && title.length > 0 ? title : null;
}

export function extractFocusedGoalTitleFromLaunchContext(launchContext: string | undefined): string | null {
  if (!launchContext) return null;
  const match = launchContext.match(/FOCUSED GOAL[\s\S]*?\n-\s*([^\n]+?)\s*\(status:/i);
  const title = match?.[1]?.trim();
  return title && title.length > 0 ? title : null;
}

export function extractFocusedArcNameFromLaunchContext(launchContext: string | undefined): string | null {
  if (!launchContext) return null;
  const match = launchContext.match(/FOCUSED ARC[\s\S]*?\n-\s*([^\n]+?)\s*\(status:/i);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : null;
}

export function extractArcProposalFromAssistantMessage(content: string): ParsedAssistantReply {
  const markerIndex = content.indexOf(ARC_PROPOSAL_MARKER);

  if (markerIndex === -1) {
    // Fallback: some prompts still instruct the model to return plain JSON
    // without the ARC_PROPOSAL_JSON marker. When we receive what looks like a
    // bare JSON object, treat it as a proposal and keep it out of the visible
    // transcript so the user only sees the structured Arc card.
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as GeneratedArc;
        return {
          // Empty display content means we won't render a separate assistant
          // bubble for this turn; the "Proposed Arc" card becomes the visible
          // representation instead of a raw JSON blob.
          displayContent: '',
          arcProposal: parsed,
        };
      } catch {
        return { displayContent: content, arcProposal: null };
      }
    }

    return {
      displayContent: content,
      arcProposal: null,
    };
  }

  const afterMarker = content.slice(markerIndex + ARC_PROPOSAL_MARKER.length).trim();

  if (!afterMarker) {
    return {
      displayContent: content,
      arcProposal: null,
    };
  }

  // Instructed format is a single JSON object on the next line. We still
  // defensively stop at the first blank line or EOF.
  const [firstLine] = afterMarker.split(/\n\s*\n/);
  const jsonText = firstLine.trim();

  try {
    const parsed = JSON.parse(jsonText) as GeneratedArc;
    return {
      // The proposal card is the visible response for Arc creation, so hide
      // any model-generated preface instead of duplicating the Arc narrative.
      displayContent: '',
      arcProposal: parsed,
    };
  } catch {
    return {
      displayContent: content,
      arcProposal: null,
    };
  }
}

export function extractFocusedArcIdFromLaunchContext(launchContext: string | undefined): string | null {
  if (!launchContext) return null;
  // Examples we emit today:
  // - "Focused entity: arc#<id>."
  // - "Object: arc#<id>."
  const focusedMatch = launchContext.match(/Focused entity:\s*arc#([^\s.]+)(?:\.|$)/i);
  if (focusedMatch?.[1]) return focusedMatch[1];
  const objectMatch = launchContext.match(/Object:\s*arc#([^\s.]+)(?:\.|$)/i);
  if (objectMatch?.[1]) return objectMatch[1];
  return null;
}

export function extractGoalProposalFromAssistantMessage(content: string): ParsedGoalProposal {
  const markerIndex = content.indexOf(GOAL_PROPOSAL_MARKER);
  if (markerIndex === -1) {
    // Fallback: if the model returns a bare JSON object (without the marker),
    // treat it as a goal proposal so we can still render the proposal card.
    // This mirrors the Arc proposal fallback behavior.
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as GoalProposalDraft;
        if (parsed && typeof parsed === 'object' && typeof parsed.title === 'string' && parsed.title.trim()) {
          return {
            displayContent: '',
            goalProposal: parsed,
          };
        }
      } catch {
        // fall through
      }
    }

    // Fallback: sometimes the model replies with "Title: ..." / "Description: ..." prose.
    // Convert that into a proposal so we still render a card.
    const titleMatch = content.match(/(?:^|\n)\s*title\s*:\s*(.+)\s*$/im);
    const descriptionMatch = content.match(/(?:^|\n)\s*description\s*:\s*([\s\S]+)$/im);
    if (titleMatch?.[1]) {
      const rawTitle = titleMatch[1].trim();
      const rawDescription = descriptionMatch?.[1]?.trim() ?? '';
      const stripQuotes = (value: string) => value.replace(/^[“"']+/, '').replace(/[”"']+$/, '').trim();
      const title = stripQuotes(rawTitle);
      const description = rawDescription ? stripQuotes(rawDescription) : '';
      if (title.length > 0) {
        const strippedLeadIn = content
          .split('\n')
          .filter((line) => !/^\s*(title|description|time\s*horizon)\s*:/i.test(line))
          .join('\n')
          .trim();
        return {
          displayContent: strippedLeadIn.length > 240 ? '' : strippedLeadIn,
          goalProposal: {
            title,
            description: description.length ? description : undefined,
          },
        };
      }
    }
    return { displayContent: content, goalProposal: null };
  }

  const visiblePart = content.slice(0, markerIndex).trim();
  const afterMarker = content.slice(markerIndex + GOAL_PROPOSAL_MARKER.length).trim();
  if (!afterMarker) {
    return { displayContent: content, goalProposal: null };
  }

  const jsonText = extractJsonCandidateFromHandoffBlock(afterMarker);
  if (!jsonText) {
    return { displayContent: visiblePart || content, goalProposal: null };
  }

  try {
    const parsed = JSON.parse(jsonText) as GoalProposalDraft;
    if (!parsed || typeof parsed !== 'object') {
      return { displayContent: visiblePart || content, goalProposal: null };
    }
    if (!parsed.title || typeof parsed.title !== 'string') {
      return { displayContent: visiblePart || content, goalProposal: null };
    }

    const rawSuggestedArcName = (parsed as Record<string, unknown>).suggestedArcName;
    const suggestedArcName =
      typeof rawSuggestedArcName === 'string' && rawSuggestedArcName.trim().length > 0
        ? rawSuggestedArcName.trim()
        : rawSuggestedArcName === null
          ? null
          : undefined;

    const targetDate = normalizeGoalTargetDate((parsed as Record<string, unknown>).targetDate);
    const metrics = normalizeGoalMetrics((parsed as Record<string, unknown>).metrics);

    const goalProposalNormalized: GoalProposalDraft = {
      ...parsed,
      suggestedArcName,
      ...(targetDate ? { targetDate } : null),
      ...(metrics ? { metrics } : null),
    };
    // Avoid showing the goal twice (once in assistant prose, once in the proposal card).
    // Keep a short, non-duplicative lead-in only.
    const strippedLeadIn = visiblePart
      .split('\n')
      .filter((line) => !/^\s*(title|description|time\s*horizon)\s*:/i.test(line))
      .join('\n')
      .trim();
    const shouldSuppressLeadIn =
      /(title\s*:|description\s*:|time\s*horizon\s*:)/i.test(visiblePart) || strippedLeadIn.length > 240;
    return {
      displayContent: shouldSuppressLeadIn ? '' : strippedLeadIn,
      goalProposal: goalProposalNormalized,
    };
  } catch {
    return { displayContent: visiblePart || content, goalProposal: null };
  }
}

export function extractActivityProposalFromAssistantMessage(content: string): ParsedActivityProposal {
  const markerIndex = content.indexOf(ACTIVITY_PROPOSAL_MARKER);
  if (markerIndex === -1) {
    return { displayContent: content, suggestion: null };
  }

  const visiblePart = content.slice(0, markerIndex).trim();
  const afterMarker = content.slice(markerIndex + ACTIVITY_PROPOSAL_MARKER.length).trim();
  if (!afterMarker) {
    return { displayContent: content, suggestion: null };
  }

  const jsonText = extractJsonCandidateFromHandoffBlock(afterMarker);
  if (!jsonText) {
    return { displayContent: visiblePart || content, suggestion: null };
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    const suggestion = normalizeActivitySuggestion(parsed);
    return { displayContent: visiblePart || content, suggestion };
  } catch {
    return { displayContent: visiblePart || content, suggestion: null };
  }
}

export function extractActivitySuggestionsFromAssistantMessage(content: string): ParsedActivitySuggestions {
  const markerIndex = content.indexOf(ACTIVITY_SUGGESTIONS_MARKER);
  if (markerIndex === -1) {
    return {
      displayContent: content,
      suggestions: null,
    };
  }

  const visiblePart = content.slice(0, markerIndex).trim();
  const afterMarker = content.slice(markerIndex + ACTIVITY_SUGGESTIONS_MARKER.length).trim();

  if (!afterMarker) {
    return {
      displayContent: content,
      suggestions: null,
    };
  }

  const jsonText = extractJsonCandidateFromHandoffBlock(afterMarker);
  if (!jsonText) {
    // Marker exists but the payload isn't usable JSON; fail quietly to avoid noisy warnings.
    return {
      displayContent: visiblePart || content,
      suggestions: null,
    };
  }

  try {
    const parsed = asRecord(JSON.parse(jsonText));
    const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : null;
    const suggestions =
      rawSuggestions?.map(normalizeActivitySuggestion).filter((entry): entry is ActivitySuggestion => Boolean(entry)) ??
      null;

    const resolved = suggestions && suggestions.length > 0 ? suggestions : null;
    return {
      displayContent: visiblePart || content,
      suggestions: resolved,
    };
  } catch {
    return {
      displayContent: visiblePart || content,
      suggestions: null,
    };
  }
}
