import type { Arc, Goal, IdentityProfile } from '../../domain/types';
import { listIdealArcTemplates, type IdealArcTemplate } from '../../domain/idealArcs';
import { buildUserProfileSummary, sendCoachChat, type CoachChatOptions, type CoachChatTurn } from '../../services/ai';
import { useAppStore } from '../../store/useAppStore';

export type ArcGuide = Pick<
  Arc,
  'identity' | 'howThisShowsUp' | 'shape' | 'practice' | 'whenThisGetsHard' | 'reflection' | 'guideVersion'
>;

const inFlightGuideRequests = new Map<string, Promise<void>>();

const normalizeLine = (value: string): string =>
  value
    .trim()
    .replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, '')
    .replace(/\s+/g, ' ')
    .trim();

const ensureSentence = (value: string): string => {
  const trimmed = normalizeLine(value);
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const lowercaseFirst = (value: string): string =>
  value.length > 0 ? `${value[0].toLowerCase()}${value.slice(1)}` : value;

const splitSentences = (value: string | undefined | null): string[] =>
  (value ?? '')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

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

  return bestTemplate && bestScore > 0 ? bestTemplate : undefined;
};

const getRelevantIdentityProfile = (arc: Arc): IdentityProfile | undefined => {
  const profile = useAppStore.getState().userProfile?.identityProfile;
  if (!profile) return undefined;

  const profileName = (profile.aspirationArcName ?? '').trim().toLowerCase();
  const profileNarrative = (profile.aspirationNarrative ?? '').trim().toLowerCase();
  const arcName = (arc.name ?? '').trim().toLowerCase();
  const arcNarrative = (arc.narrative ?? '').trim().toLowerCase();

  if (!profileName && !profileNarrative) {
    return profile;
  }

  if (profileName && arcName && profileName === arcName) {
    return profile;
  }

  if (profileNarrative && arcNarrative && profileNarrative === arcNarrative) {
    return profile;
  }

  return undefined;
};

const buildIdentityStatement = (arc: Arc, profile?: IdentityProfile, template?: IdealArcTemplate): string => {
  const seed =
    profile?.aspirationSlices?.identity ??
    splitSentences(arc.narrative)[0] ??
    template?.northStar ??
    '';

  if (seed) {
    const cleaned = seed
      .replace(/^i want to become someone who\s+/i, '')
      .replace(/^i want to become\s+/i, '')
      .replace(/^i want to be\s+/i, 'be ')
      .replace(/^i want my life to be\s+/i, '')
      .replace(/^i want to\s+/i, '')
      .trim();

    if (cleaned) {
      if (/^who\s+/i.test(cleaned)) {
        return ensureSentence(`You are becoming someone ${lowercaseFirst(cleaned)}`);
      }

      if (/^be\s+/i.test(cleaned)) {
        return ensureSentence(
          `You are becoming someone who is ${lowercaseFirst(cleaned.replace(/^be\s+/i, ''))}`
        );
      }

      if (/^[a-z]+ing\b/i.test(cleaned)) {
        return ensureSentence(`You are becoming someone who is ${lowercaseFirst(cleaned)}`);
      }

      return ensureSentence(`You are becoming someone who ${lowercaseFirst(cleaned)}`);
    }
  }

  return 'You are becoming someone who gives this Arc visible shape in ordinary life.';
};

const buildGenericCentralInsight = (arc: Arc, goals: Goal[], template?: IdealArcTemplate): string => {
  const sentences = splitSentences(arc.narrative);
  if (sentences.length > 1) {
    return ensureSentence(sentences[1]);
  }

  if (template?.northStar) {
    return ensureSentence(template.northStar);
  }

  if (goals.length > 0) {
    return ensureSentence(
      `This Arc gathers force when your goals stop living as good intentions and start becoming visible proof.`
    );
  }

  return 'This Arc becomes real through repeated choices, not just strong feelings about who you want to be.';
};

const buildGenericWhyItMatters = (arc: Arc, goals: Goal[]): string | undefined => {
  if (goals.length > 0) {
    return ensureSentence(
      `This Arc matters because it gives the work already on your plate a clearer identity and direction.`
    );
  }

  if (arc.narrative && arc.narrative.trim().length > 0) {
    return ensureSentence(
      `This Arc matters because it turns a private aspiration into something you can practice in public life.`
    );
  }

  return undefined;
};

const buildTemplateFallback = (templateId: IdealArcTemplate['id'] | 'generic'): Omit<ArcGuide, 'identity'> => {
  switch (templateId) {
    case 'venture_entrepreneurship':
      return {
        howThisShowsUp: [
          { text: 'You share progress before it feels perfect.', source: 'ai_generated' },
          { text: 'You finish small useful pieces instead of only refining the vision.', source: 'ai_generated' },
          { text: 'You return to the work after the excitement fades.', source: 'ai_generated' },
          { text: 'You choose fewer priorities so momentum can gather.', source: 'ai_generated' },
        ],
        shape: {
          whatComesNaturally: 'You see possibilities early and can imagine the product before it is obvious to other people.',
          whereItGetsHard: 'The middle stretch, when the work becomes specific and progress depends on repeated decisions more than inspiration.',
          whatCanPullYouAway: 'Starting a newer idea before the current one has had enough time to become useful.',
        },
        practice: {
          name: 'Weekly build-and-share',
          description:
            'Each week, make one visible improvement and put it in front of a real person, even if it is small.',
          cadence: 'weekly',
        },
        whenThisGetsHard: {
          reframe:
            'When a newer idea feels more exciting, do not treat that as proof the current work is wrong. It may be the moment this Arc is asking for patience.',
          nextBestMove: 'Choose the smallest useful improvement you can ship this week, then show it to one real person.',
          ifThen: {
            if: 'If you feel pulled to expand the vision again',
            then: 'first ask what part of the current vision most needs to become real next',
          },
        },
        reflection: {
          prompt: 'Where did I create evidence this week that I can finish what matters?',
        },
        guideVersion: 1,
      };
    case 'making_embodied_creativity':
      return {
        howThisShowsUp: [
          { text: 'You spend time with materials instead of only thinking about the project.', source: 'ai_generated' },
          { text: 'You finish one useful piece before moving on to the next idea.', source: 'ai_generated' },
          { text: 'You keep your tools and space ready enough to begin without friction.', source: 'ai_generated' },
          { text: 'You let repetition teach your hands what your imagination wants.', source: 'ai_generated' },
        ],
        shape: {
          whatComesNaturally: 'You care about form, utility, and the quiet satisfaction of making something tangible.',
          whereItGetsHard: 'When the work gets slower, messier, or more repetitive than the imagined version.',
          whatCanPullYouAway: 'Letting digital busyness crowd out the slower kind of attention this Arc needs.',
        },
        practice: {
          name: 'Weekly hands-on session',
          description: 'Protect one recurring block each week to make, repair, or shape something with your hands.',
          cadence: 'weekly',
        },
        whenThisGetsHard: {
          reframe:
            'A shorter or less glamorous session still counts. This Arc grows through touch, repetition, and return.',
          nextBestMove: 'Set up one small project or tool the night before so it is easy to begin with your hands tomorrow.',
        },
        reflection: {
          prompt: 'What did my hands learn this week that my mind alone could not have taught me?',
        },
        guideVersion: 1,
      };
    case 'craft_contribution':
      return {
        howThisShowsUp: [
          { text: 'You turn fuzzy problems into clear decisions and simple next steps.', source: 'ai_generated' },
          { text: 'You listen to real users before polishing the solution.', source: 'ai_generated' },
          { text: 'You ship useful improvements instead of waiting for a perfect system.', source: 'ai_generated' },
          { text: 'You leave the people around you clearer and more capable.', source: 'ai_generated' },
        ],
        shape: {
          whatComesNaturally: 'You can hold complexity, patterns, and human nuance at the same time.',
          whereItGetsHard: 'When competing inputs make it harder to choose the simplest honest path forward.',
          whatCanPullYouAway: 'Optimizing for polish, consensus, or abstraction before the user problem is clear enough.',
        },
        practice: {
          name: 'Weekly clarity pass',
          description: 'Choose one decision, spec, or workflow each week and make it more understandable and more useful.',
          cadence: 'weekly',
        },
        whenThisGetsHard: {
          reframe:
            'Confusion is not a sign you are off track. It is often the raw material craft asks you to shape.',
          nextBestMove: 'Name the real user problem in one sentence, then make the next decision that serves that sentence.',
        },
        reflection: {
          prompt: 'Where did I make something clearer, simpler, or more humane this week?',
        },
        guideVersion: 1,
      };
    case 'family_stewardship':
      return {
        howThisShowsUp: [
          { text: 'You give your attention before you give advice.', source: 'ai_generated' },
          { text: 'You protect small family rituals even during busy weeks.', source: 'ai_generated' },
          { text: 'You repair quickly after moments of stress or impatience.', source: 'ai_generated' },
          { text: 'You make home feel steadier, warmer, and safer through ordinary choices.', source: 'ai_generated' },
        ],
        shape: {
          whatComesNaturally: 'You care deeply about your people and want your presence to create safety and warmth.',
          whereItGetsHard: 'In rushed or tiring stretches, when care starts competing with efficiency and mental overload.',
          whatCanPullYouAway: 'Treating presence like a bonus instead of a core responsibility of this Arc.',
        },
        practice: {
          name: 'Daily moment of attention',
          description: 'Offer one undistracted, emotionally present moment each day that helps someone at home feel known.',
          cadence: 'daily',
        },
        whenThisGetsHard: {
          reframe:
            'You do not need a perfect day to strengthen this Arc. A small repair or a small act of attention still changes the climate of a home.',
          nextBestMove: 'Choose one person, give them your full attention for a few minutes, and let that be enough for today.',
        },
        reflection: {
          prompt: 'When did the people I love most feel my steadiness this week?',
        },
        guideVersion: 1,
      };
    case 'discipleship':
      return {
        howThisShowsUp: [
          { text: 'You return to prayer, scripture, or quiet reflection before the day carries you away.', source: 'ai_generated' },
          { text: 'You let small moments of speech, patience, and integrity reflect what you say matters most.', source: 'ai_generated' },
          { text: 'You choose repair, humility, and mercy in ordinary interactions.', source: 'ai_generated' },
          { text: 'You keep turning back instead of waiting to feel perfectly ready.', source: 'ai_generated' },
        ],
        shape: {
          whatComesNaturally: 'You want your inner life and outer life to belong to the same set of convictions.',
          whereItGetsHard: 'When noise, hurry, or discouragement make spiritual attention feel easy to postpone.',
          whatCanPullYouAway: 'Thinking this Arc only counts in dramatic moments rather than in daily faithfulness.',
        },
        practice: {
          name: 'Daily return',
          description: 'Create one repeatable moment each day to return your attention to God before reacting to everything else.',
          cadence: 'daily',
        },
        whenThisGetsHard: {
          reframe:
            'Distance is not disqualification. This Arc is practiced every time you return, even after a distracted or uneven stretch.',
          nextBestMove: 'Choose one quiet, concrete act of return today and let that be the doorway back in.',
        },
        reflection: {
          prompt: 'Where did I turn back toward what I say matters most this week?',
        },
        guideVersion: 1,
      };
    default:
      return {
        howThisShowsUp: [
          { text: 'You take one visible step instead of keeping this Arc only in your head.', source: 'ai_generated' },
          { text: 'You return to this Arc after the first wave of motivation passes.', source: 'ai_generated' },
          { text: 'You make room for one small repeatable action during an ordinary week.', source: 'ai_generated' },
        ],
        shape: {
          whatComesNaturally: 'Something in this Arc already feels true enough that it keeps returning for your attention.',
          whereItGetsHard: 'When the work becomes repetitive, ambiguous, or less emotionally exciting than the original vision.',
          whatCanPullYouAway: 'Treating clarity as something you need before acting, instead of something action can create.',
        },
        practice: {
          name: 'One visible move',
          description: 'Each week, make one concrete move that makes this Arc easier to see in real life.',
          cadence: 'weekly',
        },
        whenThisGetsHard: {
          reframe:
            'Friction does not mean the Arc is fake. It often means the Arc has reached the part that can actually change you.',
          nextBestMove: 'Pick the smallest useful action that would make this Arc more visible in the next seven days.',
        },
        reflection: {
          prompt: 'What did I do this week that made this Arc more visible in real life?',
        },
        guideVersion: 1,
      };
  }
};

export const buildLocalArcGuideFallback = (arc: Arc, goals: Goal[] = []): ArcGuide => {
  const template = findBestMatchingTemplate(arc);
  const profile = getRelevantIdentityProfile(arc);
  const fallback = buildTemplateFallback(template?.id ?? 'generic');

  return {
    identity: {
      statement: buildIdentityStatement(arc, profile, template),
      centralInsight:
        profile?.aspirationSlices?.why?.trim()
          ? ensureSentence(profile.aspirationSlices.why)
          : buildGenericCentralInsight(arc, goals, template),
      whyItMatters:
        profile?.aspirationSlices?.daily?.trim()
          ? ensureSentence(`This Arc matters in daily life when ${lowercaseFirst(profile.aspirationSlices.daily)}`)
          : buildGenericWhyItMatters(arc, goals),
    },
    ...fallback,
  };
};

const parseGuideFromReply = (reply: string): ArcGuide | null => {
  try {
    const startIdx = reply.indexOf('{');
    const endIdx = reply.lastIndexOf('}');
    const jsonText =
      startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
        ? reply.slice(startIdx, endIdx + 1)
        : reply;

    const parsed = JSON.parse(jsonText) as ArcGuide;
    const howThisShowsUp = (parsed.howThisShowsUp ?? [])
      .map((item) => ({
        text: normalizeLine(item?.text ?? ''),
        source: item?.source ?? 'ai_generated',
      }))
      .filter((item) => item.text.length > 0)
      .slice(0, 5);

    const statement = ensureSentence(parsed.identity?.statement ?? '');
    const centralInsight = ensureSentence(parsed.identity?.centralInsight ?? '');
    const whyItMatters = parsed.identity?.whyItMatters
      ? ensureSentence(parsed.identity.whyItMatters)
      : undefined;
    const whatComesNaturally = ensureSentence(parsed.shape?.whatComesNaturally ?? '');
    const whereItGetsHard = ensureSentence(parsed.shape?.whereItGetsHard ?? '');
    const whatCanPullYouAway = ensureSentence(parsed.shape?.whatCanPullYouAway ?? '');
    const practiceName = normalizeLine(parsed.practice?.name ?? '');
    const practiceDescription = ensureSentence(parsed.practice?.description ?? '');
    const reframe = ensureSentence(parsed.whenThisGetsHard?.reframe ?? '');
    const nextBestMove = ensureSentence(parsed.whenThisGetsHard?.nextBestMove ?? '');
    const ifThenIf = parsed.whenThisGetsHard?.ifThen?.if ? ensureSentence(parsed.whenThisGetsHard.ifThen.if) : undefined;
    const ifThenThen = parsed.whenThisGetsHard?.ifThen?.then
      ? ensureSentence(parsed.whenThisGetsHard.ifThen.then)
      : undefined;
    const reflectionPrompt = ensureSentence(parsed.reflection?.prompt ?? '');

    if (
      !statement ||
      !centralInsight ||
      howThisShowsUp.length < 3 ||
      !whatComesNaturally ||
      !whereItGetsHard ||
      !whatCanPullYouAway ||
      !practiceName ||
      !practiceDescription ||
      !reframe ||
      !nextBestMove ||
      !reflectionPrompt
    ) {
      return null;
    }

    return {
      identity: {
        statement,
        centralInsight,
        ...(whyItMatters ? { whyItMatters } : {}),
      },
      howThisShowsUp,
      shape: {
        whatComesNaturally,
        whereItGetsHard,
        whatCanPullYouAway,
      },
      practice: {
        name: practiceName,
        description: practiceDescription,
        cadence: parsed.practice?.cadence,
      },
      whenThisGetsHard: {
        reframe,
        nextBestMove,
        ...(ifThenIf && ifThenThen
          ? {
              ifThen: {
                if: ifThenIf,
                then: ifThenThen,
              },
            }
          : {}),
      },
      reflection: {
        prompt: reflectionPrompt,
      },
      guideVersion: 1,
    };
  } catch {
    return null;
  }
};

const generateGuideForArc = async (arc: Arc, goals: Goal[]): Promise<ArcGuide> => {
  const template = findBestMatchingTemplate(arc);
  const profile = getRelevantIdentityProfile(arc);
  const profileSummary = buildUserProfileSummary();
  const goalTitles = goals.map((goal) => goal.title.trim()).filter(Boolean);

  const promptLines: string[] = [
    'You are generating a structured Arc guide for a life-coaching app.',
    '',
    'The guide must create three user experiences:',
    '1. Recognition: the user feels seen.',
    '2. Orientation: the user understands what the Arc means in real life.',
    '3. Activation: the user knows what to do next.',
    '',
    'Return JSON only. No markdown. No commentary.',
    '',
    'Required JSON shape:',
    '{',
    '  "identity": {',
    '    "statement": "You are becoming someone who ...",',
    '    "centralInsight": "One concise interpretive insight.",',
    '    "whyItMatters": "Optional one-sentence why this matters."',
    '  },',
    '  "howThisShowsUp": [',
    '    { "text": "Observable behavior", "source": "ai_generated" }',
    '  ],',
    '  "shape": {',
    '    "whatComesNaturally": "...",',
    '    "whereItGetsHard": "...",',
    '    "whatCanPullYouAway": "..."',
    '  },',
    '  "practice": {',
    '    "name": "Short practice name",',
    '    "description": "1-2 sentences",',
    '    "cadence": "daily" | "weekly" | "monthly" | "project_based" | "flexible"',
    '  },',
    '  "whenThisGetsHard": {',
    '    "reframe": "Supportive reframe",',
    '    "nextBestMove": "Concrete next move",',
    '    "ifThen": { "if": "Optional condition", "then": "Optional response" }',
    '  },',
    '  "reflection": {',
    '    "prompt": "One reflection question"',
    '  }',
    '}',
    '',
    'Hard rules:',
    '- The identity statement must begin with "You are becoming someone who".',
    '- "How this shows up" must be 3 to 5 short bullets.',
    '- Every "how this shows up" bullet must be behavior-first and observable.',
    '- Do not use vague trait language like "be more intentional" or "be more disciplined".',
    '- "Shape" must feel interpretive, not clinical.',
    '- "When this gets hard" must be warm, grounded, and concrete.',
    '- Avoid cliches like "one small step", "bring this dream to life", or "unlock your potential".',
    '- Keep the tone emotionally intelligent and plainspoken.',
    '',
    `Arc name: ${arc.name}`,
    `Arc narrative: ${arc.narrative ?? 'not provided'}`,
  ];

  if (profile?.aspirationSlices) {
    promptLines.push(
      '',
      'Survey-derived aspiration slices:',
      `- identity: ${profile.aspirationSlices.identity}`,
      `- why: ${profile.aspirationSlices.why}`,
      `- daily: ${profile.aspirationSlices.daily}`
    );
  }

  if (template) {
    promptLines.push(
      '',
      'Closest canonical Arc reference (for shape only, not for copying):',
      `- name: ${template.name}`,
      template.northStar ? `- north_star: ${template.northStar}` : '',
      `- narrative: ${template.narrative}`
    );
  }

  if (goalTitles.length > 0) {
    promptLines.push('', `Linked goal titles: ${goalTitles.join(' | ')}`);
  }

  if (profileSummary) {
    promptLines.push('', `User profile summary: ${profileSummary}`);
  }

  const messages: CoachChatTurn[] = [{ role: 'user', content: promptLines.filter(Boolean).join('\n') }];
  const options: CoachChatOptions = {
    aiJob: 'arc_generation',
    workflowStepId: 'arc_guide_generate',
  };

  try {
    const reply = await sendCoachChat(messages, options);
    const parsed = parseGuideFromReply(reply);
    if (parsed) {
      return parsed;
    }
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[arcs] Failed to generate Arc guide', { arcId: arc.id, err });
    }
  }

  return buildLocalArcGuideFallback(arc, goals);
};

export const hasArcGuide = (arc: Arc | null | undefined): boolean =>
  Boolean(
    arc?.identity?.statement &&
      arc?.identity?.centralInsight &&
      arc?.howThisShowsUp &&
      arc.howThisShowsUp.length > 0 &&
      arc?.shape?.whatComesNaturally &&
      arc?.shape?.whereItGetsHard &&
      arc?.shape?.whatCanPullYouAway &&
      arc?.practice?.name &&
      arc?.practice?.description &&
      arc?.whenThisGetsHard?.reframe &&
      arc?.whenThisGetsHard?.nextBestMove &&
      arc?.reflection?.prompt
  );

export const ensureArcGuide = async (arcId: string): Promise<void> => {
  if (inFlightGuideRequests.has(arcId)) {
    return inFlightGuideRequests.get(arcId) as Promise<void>;
  }

  const run = (async () => {
    const state = useAppStore.getState();
    const arc = state.arcs.find((item) => item.id === arcId);
    if (!arc || hasArcGuide(arc)) {
      return;
    }

    const goals = state.goals.filter((goal) => goal.arcId === arc.id);
    const guide = await generateGuideForArc(arc, goals);

    useAppStore.getState().updateArc(arc.id, (current) => {
      if (hasArcGuide(current)) {
        return current;
      }

      return {
        ...current,
        ...guide,
        updatedAt: new Date().toISOString(),
      };
    });
  })();

  inFlightGuideRequests.set(arcId, run);

  try {
    await run;
  } finally {
    inFlightGuideRequests.delete(arcId);
  }
};
