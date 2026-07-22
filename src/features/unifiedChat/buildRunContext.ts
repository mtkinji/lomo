import type {
  BuiltRunContext,
  CapabilityEvidenceFreshness,
  CapabilityEvidenceSource,
  EvidenceOmission,
  EvidenceRefDraft,
} from './capabilityContracts';
import type { UnifiedChatRequestPolicy } from './requestPolicy';

const STOP_WORDS = new Set([
  'and',
  'are',
  'chapters',
  'for',
  'from',
  'given',
  'goals',
  'has',
  'have',
  'helped',
  'into',
  'my',
  'that',
  'the',
  'this',
  'todos',
  'to-dos',
  'what',
  'which',
  'with',
]);

function normalizeToken(token: string): string {
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .map(normalizeToken)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );
}

function freshness(observedAt: string | null | undefined, now: Date): CapabilityEvidenceFreshness {
  if (!observedAt) return 'unknown';
  const observed = new Date(observedAt);
  if (Number.isNaN(observed.getTime())) return 'unknown';
  const ageDays = Math.max(0, now.getTime() - observed.getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays <= 7) return 'current';
  if (ageDays <= 90) return 'recent';
  return 'stale';
}

function overlapCount(promptTokens: Set<string>, source: CapabilityEvidenceSource): number {
  const sourceTokens = tokens(`${source.object.label} ${source.searchableText}`);
  let count = 0;
  for (const token of promptTokens) if (sourceTokens.has(token)) count += 1;
  return count;
}

export function buildRunContext({
  prompt,
  policy,
  sources,
  explicitContextObjectIds = [],
  maxEvidence = 6,
  maxPerCapability = 3,
  now = new Date(),
}: {
  prompt: string;
  policy: UnifiedChatRequestPolicy;
  sources: readonly CapabilityEvidenceSource[];
  explicitContextObjectIds?: readonly string[];
  maxEvidence?: number;
  maxPerCapability?: number;
  now?: Date;
}): BuiltRunContext {
  if (!policy.usePrivateContext) {
    return {
      evidence: [],
      omissions: [],
      coverage: {
        sufficient: true,
        consideredCount: 0,
        includedCount: 0,
        omittedCount: 0,
        note: 'Private Kwilt context was not needed for this request.',
      },
    };
  }

  const participating = new Set(policy.participatingCapabilities);
  const explicit = new Set(explicitContextObjectIds);
  const promptTokens = tokens(prompt);
  const considered = sources.filter((source) => participating.has(source.capabilityId));
  const ranked = considered.map((source) => {
    const isExplicit = explicit.has(source.object.id);
    const overlap = overlapCount(promptTokens, source);
    return {
      source,
      isExplicit,
      overlap,
      score: (isExplicit ? 1000 : 0) + overlap,
      observedAtMs: source.observedAt ? new Date(source.observedAt).getTime() || 0 : 0,
    };
  });

  ranked.sort(
    (left, right) =>
      right.score - left.score ||
      right.observedAtMs - left.observedAtMs ||
      left.source.object.id.localeCompare(right.source.object.id),
  );

  const evidence: EvidenceRefDraft[] = [];
  const omissions: EvidenceOmission[] = [];
  const perCapability = new Map<string, number>();

  for (const candidate of ranked) {
    const { source } = candidate;
    const capabilityCount = perCapability.get(source.capabilityId) ?? 0;
    if (!candidate.isExplicit && candidate.overlap === 0) {
      omissions.push({
        capabilityId: source.capabilityId,
        objectType: source.object.type,
        objectId: source.object.id,
        label: source.object.label,
        authority: source.authority,
        freshness: freshness(source.observedAt, now),
        observedAt: source.observedAt ?? null,
        reason: 'No material request-term match.',
      });
      continue;
    }
    if (evidence.length >= Math.max(0, maxEvidence)) {
      omissions.push({
        capabilityId: source.capabilityId,
        objectType: source.object.type,
        objectId: source.object.id,
        label: source.object.label,
        authority: source.authority,
        freshness: freshness(source.observedAt, now),
        observedAt: source.observedAt ?? null,
        reason: 'Evidence budget reached.',
      });
      continue;
    }
    if (!candidate.isExplicit && capabilityCount >= Math.max(1, maxPerCapability)) {
      omissions.push({
        capabilityId: source.capabilityId,
        objectType: source.object.type,
        objectId: source.object.id,
        label: source.object.label,
        authority: source.authority,
        freshness: freshness(source.observedAt, now),
        observedAt: source.observedAt ?? null,
        reason: 'Capability evidence budget reached.',
      });
      continue;
    }

    perCapability.set(source.capabilityId, capabilityCount + 1);
    evidence.push({
      id: `${source.capabilityId}:${source.object.type}:${source.object.id}`,
      capabilityId: source.capabilityId,
      object: source.object,
      summary: source.summary,
      authority: source.authority,
      freshness: freshness(source.observedAt, now),
      observedAt: source.observedAt ?? null,
      includedBecause: candidate.isExplicit
        ? 'Visible context explicitly attached to this request.'
        : `Matched ${candidate.overlap} material request ${candidate.overlap === 1 ? 'term' : 'terms'}.`,
      sufficient: true,
    });
  }

  const sufficient = evidence.length > 0;
  return {
    evidence: evidence.map((item) => ({ ...item, sufficient })),
    omissions,
    coverage: {
      sufficient,
      consideredCount: considered.length,
      includedCount: evidence.length,
      omittedCount: omissions.length,
      note: sufficient
        ? `Selected ${evidence.length} of ${considered.length} bounded Kwilt records.`
        : 'Kwilt did not find relevant evidence in the participating capabilities.',
    },
  };
}
