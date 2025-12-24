import type { Arc } from '../../domain/types';
import { listIdealArcTemplates, type IdealArcTemplate } from '../../domain/idealArcs';
import { buildUserProfileSummary, sendCoachChat, type CoachChatTurn, type CoachChatOptions } from '../../services/ai';
import { useAppStore } from '../../store/useAppStore';

export type ArcDevelopmentInsights = {
  strengths: string[];
  growthEdges: string[];
  pitfalls: string[];
};

const MIN_LINES_PER_SECTION = 2;

const normalizeText = (value: string | undefined | null): string =>
  (value ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokenize = (value: string | undefined | null): string[] =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2);

const scoreTemplateMatch = (arc: Arc, template: IdealArcTemplate): number => {
  const arcTokens = new Set(tokenize(`${arc.name} ${arc.narrative ?? ''}`));
  const templateTokens = new Set(tokenize(`${template.name} ${template.northStar ?? ''} ${template.narrative}`));

  if (arcTokens.size === 0 || templateTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  arcTokens.forEach((token) => {
    if (templateTokens.has(token)) {
      overlap += 1;
    }
  });

  // Light bonus when the first word of the Arc name overlaps with the template name.
  const arcFirstWord = (arc.name ?? '').split(' ')[0]?.toLowerCase();
  const templateFirstWord = (template.name ?? '').split(' ')[0]?.toLowerCase();
  if (arcFirstWord && templateFirstWord && arcFirstWord === templateFirstWord) {
    overlap += 2;
  }

  return overlap;
};

const findBestMatchingTemplate = (arc: Arc): IdealArcTemplate | undefined => {
  const templates = listIdealArcTemplates();
  let bestTemplate: IdealArcTemplate | undefined;
  let bestScore = 0;

  for (const template of templates) {
    const score = scoreTemplateMatch(arc, template);
    if (!bestTemplate || score > bestScore) {
      bestTemplate = template;
      bestScore = score;
    }
  }

  // Require at least a minimal overlap to avoid forcing a weak match.
  if (!bestTemplate || bestScore <= 0) {
    return undefined;
  }

  return bestTemplate;
};

const parseInsightsFromReply = (reply: string): ArcDevelopmentInsights | null => {
  try {
    const startIdx = reply.indexOf('{');
    const endIdx = reply.lastIndexOf('}');
    const jsonText =
      startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
        ? reply.slice(startIdx, endIdx + 1)
        : reply;

    const parsed = JSON.parse(jsonText) as {
      strengths?: string[];
      growthEdges?: string[];
      pitfalls?: string[];
    };

    if (!parsed.strengths || !parsed.growthEdges || !parsed.pitfalls) {
      return null;
    }

    const strengths = parsed.strengths.filter((item) => typeof item === 'string' && item.trim());
    const growthEdges = parsed.growthEdges.filter(
      (item) => typeof item === 'string' && item.trim()
    );
    const pitfalls = parsed.pitfalls.filter((item) => typeof item === 'string' && item.trim());

    if (
      strengths.length < MIN_LINES_PER_SECTION ||
      growthEdges.length < MIN_LINES_PER_SECTION ||
      pitfalls.length < MIN_LINES_PER_SECTION
    ) {
      return null;
    }

    return { strengths, growthEdges, pitfalls };
  } catch {
    return null;
  }
};

const buildLocalFallbackFromArc = (arc: Arc, template?: IdealArcTemplate): ArcDevelopmentInsights => {
  const narrative = (arc.narrative ?? '').trim();
  const northStar = template?.northStar ?? '';

  const strengths: string[] = [];
  const growthEdges: string[] = [];
  const pitfalls: string[] = [];

  if (narrative.length > 0) {
    strengths.push(
      'Letting small, concrete projects carry this identity instead of waiting for a perfect season.'
    );
  }

  if (northStar.length > 0) {
    strengths.push(
      `Returning to the heart of “${northStar}” when choices or opportunities feel noisy.`
    );
  } else {
    strengths.push('Protecting a little focused time each week so this Arc has room to grow.');
  }

  growthEdges.push(
    'Choosing one clear lane for this Arc at a time instead of trying to express it everywhere at once.'
  );
  growthEdges.push('Letting the Arc grow through repeatable habits, not only big pushes of effort.');

  pitfalls.push('Treating this Arc as a side note rather than a real part of your identity.');
  pitfalls.push('Waiting until life is perfectly organized before taking small steps inside this Arc.');

  return { strengths, growthEdges, pitfalls };
};

const scoreArcInsightQuality = async (
  arc: Arc,
  candidate: ArcDevelopmentInsights
): Promise<number | null> => {
  const systemProfile = buildUserProfileSummary();

  const judgePromptLines: string[] = [
    'You evaluate how well a set of Arc Development Insights fits a user’s Identity Arc.',
    '',
    'Each insight set has three sections:',
    '- strengths that help people grow this Arc,',
    '- growth edges people often develop on this path,',
    '- pitfalls people on this path learn to navigate.',
    '',
    'Scoring dimensions (0–10 each):',
    '1) alignment – do the lines clearly relate to the Arc name and narrative?',
    '2) developmental_accuracy – do they describe believable ways people grow over time, without diagnosing or giving prescriptive advice?',
    '3) realism – could these show up in an ordinary week for this kind of person, in grounded language?',
    '4) clarity – are lines short, scannable, and free of vague “inspire / unlock / radiate” language?',
    '',
    'Compute final_score as the simple average of the four dimensions, and clamp it to 0–10.',
    '',
    'Return ONLY a JSON object (no markdown, no surrounding text) in this shape:',
    '{',
    '  "total_score": 0,',
    '  "reasoning": "1–2 short sentences explaining your score"',
    '}',
    '',
    `Arc name: ${arc.name}`,
    `Arc narrative: ${arc.narrative ?? 'not provided'}`,
    '',
    'Candidate Arc Development Insights:',
    `- strengths: ${candidate.strengths.join(' | ')}`,
    `- growth_edges: ${candidate.growthEdges.join(' | ')}`,
    `- pitfalls: ${candidate.pitfalls.join(' | ')}`,
  ];

  if (systemProfile) {
    judgePromptLines.push('', `User profile summary: ${systemProfile}`);
  }

  const messages: CoachChatTurn[] = [
    {
      role: 'user',
      content: judgePromptLines.join('\n'),
    },
  ];

  const options: CoachChatOptions = {
    mode: undefined,
  };

  try {
    const reply = await sendCoachChat(messages, options);
    const startIdx = reply.indexOf('{');
    const endIdx = reply.lastIndexOf('}');
    const jsonText =
      startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
        ? reply.slice(startIdx, endIdx + 1)
        : reply;

    const parsed = JSON.parse(jsonText) as {
      total_score?: number;
      totalScore?: number;
    };

    const total =
      typeof parsed.total_score === 'number'
        ? parsed.total_score
        : typeof parsed.totalScore === 'number'
        ? parsed.totalScore
        : null;

    if (total == null || Number.isNaN(total)) {
      return null;
    }

    return total;
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[arcs] Failed to score Arc Development Insights quality', err);
    }
    return null;
  }
};

const generateInsightsForArc = async (arc: Arc): Promise<ArcDevelopmentInsights | null> => {
  const template = findBestMatchingTemplate(arc);
  const systemProfile = buildUserProfileSummary();

  const promptLines: string[] = [
    '🌱 ARC DEVELOPMENT INSIGHTS — SYSTEM PROMPT',
    '',
    'You are generating a short, psychologically grounded “development profile” for a user’s Identity Arc.',
    '',
    'Your job is NOT to give advice or instructions. Instead, offer gentle, kind invitations to notice or consider patterns people on this path often run into.',
    '',
    'Structure:',
    '- strengths: 2–3 short lines about capacities or habits that help people grow this Arc.',
    '- growth_edges: 2–3 short lines about tensions or edges people often work on along this path.',
    '- pitfalls: 2–3 short lines about common traps people on this path learn to navigate.',
    '',
    'Hard rules:',
    '- Do NOT use the word “should”.',
    '- Do NOT tell the user what to do or give step-by-step advice.',
    '- Do NOT diagnose traits, disorders, or fixed labels.',
    '- Keep language grounded, concrete, and non-cosmic (no destiny, vibration, radiance, etc.).',
    '- Prefer an invitational tone (e.g., “Many people find it helpful to…”, “It can be worth noticing…”, “You might observe…”), without prescribing.',
    '- Speak in third-person plural or gentle second-person (“people on this path…”, “you might notice…”).',
    '- Do NOT include bullet characters (no leading "-", "*", "•", or numbered lists). Return plain strings only.',
    '- Lines must be short (one line each) and easy to scan on a phone.',
    '',
    'Anchor your insights in:',
    '- the Arc name and narrative (identity spine, everyday scenes, and tension),',
    '- any ideal Arc template provided,',
    '- any high-level user profile summary.',
    '',
    'Output format (JSON only, no backticks, no prose):',
    '{',
    '  "strengths": string[],',
    '  "growthEdges": string[],',
    '  "pitfalls": string[]',
    '}',
    '',
    `Arc name: ${arc.name}`,
    `Arc narrative: ${arc.narrative ?? 'not provided'}`,
  ];

  if (template) {
    promptLines.push(
      '',
      'Closest ideal Arc template (for reference, not for copying word-for-word):',
      `- name: ${template.name}`,
      template.northStar ? `- north_star: ${template.northStar}` : '',
      `- narrative: ${template.narrative}`
    );
  }

  if (systemProfile) {
    promptLines.push('', `User profile summary: ${systemProfile}`);
  }

  const messages: CoachChatTurn[] = [
    {
      role: 'user',
      content: promptLines.join('\n'),
    },
  ];

  const options: CoachChatOptions = {
    mode: undefined,
  };

  const QUALITY_THRESHOLD = 7.5;
  let bestCandidate: ArcDevelopmentInsights | null = null;
  let bestScore: number | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const reply = await sendCoachChat(messages, options);
      const parsed = parseInsightsFromReply(reply);
      if (!parsed) {
        continue;
      }

      const score = await scoreArcInsightQuality(arc, parsed);
      if (score == null) {
        if (!bestCandidate) {
          bestCandidate = parsed;
        }
        break;
      }

      if (bestScore == null || score > bestScore) {
        bestScore = score;
        bestCandidate = parsed;
      }

      if (score >= QUALITY_THRESHOLD) {
        break;
      }
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[arcs] Failed to generate Arc Development Insights attempt', {
          attempt,
          err,
        });
      }
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  return buildLocalFallbackFromArc(arc, template);
};

/**
 * Public entrypoint used by Arc creation flows and ArcDetail lazy loaders
 * to ensure an Arc has development insights attached. This never throws;
 * failures are logged in development only.
 */
export const ensureArcDevelopmentInsights = async (arcId: string): Promise<void> => {
  const state = useAppStore.getState();
  const arc = state.arcs.find((item) => item.id === arcId);
  if (!arc) {
    return;
  }

  const alreadyPresent =
    (arc.developmentStrengths && arc.developmentStrengths.length > 0) ||
    (arc.developmentGrowthEdges && arc.developmentGrowthEdges.length > 0) ||
    (arc.developmentPitfalls && arc.developmentPitfalls.length > 0);

  if (alreadyPresent) {
    return;
  }

  try {
    const insights = await generateInsightsForArc(arc);
    if (!insights) return;

    useAppStore.getState().updateArc(arc.id, (current) => ({
      ...current,
      developmentStrengths: insights.strengths,
      developmentGrowthEdges: insights.growthEdges,
      developmentPitfalls: insights.pitfalls,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[arcs] Failed to attach Arc Development Insights for arc', {
        arcId,
        err,
      });
    }
  }
};



