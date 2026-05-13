import {
  DRAFT_DISMISSAL_COOLDOWN_MS,
  DRAFT_MULTI_DAY_THRESHOLD_MS,
  applyPartnerCircleKey,
  appendItem,
  buildPartnerCircleKey,
  canSendDraft,
  composeDraftText,
  createDraft,
  describeDraftAgeLabel,
  makeDraftItem,
  markDismissed,
  markSent,
  markSkipped,
  removeBySource,
  removeItem,
  shouldConfirmSkip,
  shouldIncludeInEndOfDayReview,
  shouldShowImmediatePrompt,
  toggleItemInclusion,
} from './checkinDrafts';

const ANCHOR = new Date('2026-05-12T10:00:00-06:00');

function later(ms: number) {
  return new Date(ANCHOR.getTime() + ms);
}

describe('buildPartnerCircleKey', () => {
  test('returns solo for empty input', () => {
    expect(buildPartnerCircleKey([])).toBe('solo');
    expect(buildPartnerCircleKey([null, undefined, ''])).toBe('solo');
  });

  test('is order-independent and deduplicates', () => {
    expect(buildPartnerCircleKey(['b', 'a'])).toBe(buildPartnerCircleKey(['a', 'b']));
    expect(buildPartnerCircleKey(['a', 'a', 'b'])).toBe('a|b');
  });
});

describe('createDraft + appendItem + composeDraftText', () => {
  const baseItem = makeDraftItem(
    {
      sourceType: 'activity',
      sourceId: 'act_1',
      title: 'the workshop outline',
      completedAt: ANCHOR.toISOString(),
    },
    ANCHOR
  );

  test('creates a draft with a single specific message', () => {
    const draft = createDraft({
      goalId: 'goal_1',
      partnerCircleKey: 'u1|u2',
      initialItem: baseItem,
      now: ANCHOR,
    });
    expect(draft.draftText).toBe('I finished the workshop outline.');
    expect(draft.items).toHaveLength(1);
    expect(draft.status).toBe('active');
  });

  test('deduplicates by source identity instead of stacking duplicates', () => {
    const draft = createDraft({
      goalId: 'goal_1',
      partnerCircleKey: 'u1|u2',
      initialItem: baseItem,
      now: ANCHOR,
    });
    const same = makeDraftItem(
      {
        sourceType: 'activity',
        sourceId: 'act_1',
        title: 'the workshop outline',
        completedAt: ANCHOR.toISOString(),
      },
      later(60_000)
    );
    const next = appendItem(draft, same, later(60_000));
    expect(next.items).toHaveLength(1);
  });

  test('composes same-day sentence list for two-three items', () => {
    const draft = createDraft({
      goalId: 'goal_1',
      partnerCircleKey: 'u1|u2',
      initialItem: baseItem,
      now: ANCHOR,
    });
    const a = makeDraftItem(
      {
        sourceType: 'activity',
        sourceId: 'act_2',
        title: 'the slides',
        completedAt: ANCHOR.toISOString(),
      },
      ANCHOR
    );
    const b = makeDraftItem(
      {
        sourceType: 'activity',
        sourceId: 'act_3',
        title: 'the follow-up email',
        completedAt: ANCHOR.toISOString(),
      },
      ANCHOR
    );
    const next = appendItem(appendItem(draft, a, ANCHOR), b, ANCHOR);
    expect(next.draftText).toBe(
      'Today I finished the workshop outline, the slides, and the follow-up email.'
    );
  });

  test('switches to multi-day list framing once items span days', () => {
    const draft = createDraft({
      goalId: 'goal_1',
      partnerCircleKey: 'u1|u2',
      initialItem: baseItem,
      now: ANCHOR,
    });
    const yesterday = new Date(ANCHOR.getTime() - 36 * 60 * 60 * 1000);
    const olderItem = makeDraftItem(
      {
        sourceType: 'activity',
        sourceId: 'act_old',
        title: 'the kickoff',
        completedAt: yesterday.toISOString(),
      },
      yesterday
    );
    const next = appendItem(draft, olderItem, ANCHOR);
    expect(next.draftText.startsWith('This week I finished')).toBe(true);
  });

  test('renders focus session with duration', () => {
    const focus = makeDraftItem(
      {
        sourceType: 'focus_session',
        sourceId: 'fs_1',
        title: 'deep work block',
        completedAt: ANCHOR.toISOString(),
        durationMinutes: 45,
      },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'goal_1',
      partnerCircleKey: 'u1|u2',
      initialItem: focus,
      now: ANCHOR,
    });
    expect(draft.draftText).toBe('I spent 45 min on deep work block.');
  });
});

describe('item removal', () => {
  test('removeItem updates draft text', () => {
    const a = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const b = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_2', title: 'B', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    let draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: a,
      now: ANCHOR,
    });
    draft = appendItem(draft, b, ANCHOR);
    draft = removeItem(draft, a.id, ANCHOR);
    expect(draft.items).toHaveLength(1);
    expect(draft.draftText).toBe('I finished B.');
  });

  test('removeBySource is a no-op when source not present', () => {
    const a = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: a,
      now: ANCHOR,
    });
    const next = removeBySource(draft, 'activity', 'other', ANCHOR);
    expect(next).toBe(draft);
  });

  test('toggleItemInclusion excludes item from composed text', () => {
    const a = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: a,
      now: ANCHOR,
    });
    const next = toggleItemInclusion(draft, a.id, ANCHOR);
    expect(next.items[0].includeInDraft).toBe(false);
    expect(next.draftText).toBe('');
  });
});

describe('prompt cooldowns', () => {
  test('immediate prompt fires when no dismissal cooldown', () => {
    const item = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: item,
      now: ANCHOR,
    });
    expect(shouldShowImmediatePrompt(draft, ANCHOR)).toBe(true);
  });

  test('dismissal suppresses immediate re-prompt during cooldown', () => {
    const item = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    let draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: item,
      now: ANCHOR,
    });
    draft = markDismissed(draft, ANCHOR);
    expect(shouldShowImmediatePrompt(draft, later(DRAFT_DISMISSAL_COOLDOWN_MS / 2))).toBe(false);
    expect(shouldShowImmediatePrompt(draft, later(DRAFT_DISMISSAL_COOLDOWN_MS + 1000))).toBe(true);
  });

  test('end-of-day review excludes empty or recently dismissed drafts', () => {
    const item = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: item,
      now: ANCHOR,
    });
    expect(shouldIncludeInEndOfDayReview(draft, ANCHOR)).toBe(true);
    const dismissed = markDismissed(draft, ANCHOR);
    expect(shouldIncludeInEndOfDayReview(dismissed, later(2 * 60 * 60 * 1000))).toBe(false);
  });
});

describe('partner circle changes', () => {
  test('partner circle change triggers re-approval', () => {
    const item = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: item,
      now: ANCHOR,
    });
    const updated = applyPartnerCircleKey(draft, 'u1|u3', ANCHOR);
    expect(updated.needsReapprovalAt).not.toBeNull();
    expect(updated.partnerCircleKey).toBe('u1|u3');
  });

  test('same key is a no-op', () => {
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      now: ANCHOR,
    });
    expect(applyPartnerCircleKey(draft, 'u1|u2', ANCHOR)).toBe(draft);
  });

  test('solo partner circle cannot send', () => {
    const item = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'solo',
      initialItem: item,
      now: ANCHOR,
    });
    expect(canSendDraft(draft)).toBe(false);
  });
});

describe('send / skip semantics', () => {
  test('markSent transitions status and clears reapproval flag', () => {
    const item = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: item,
      now: ANCHOR,
    });
    const sent = markSent(draft, ANCHOR);
    expect(sent.status).toBe('sent');
    expect(sent.sentAt).not.toBeNull();
  });

  test('markSkipped clears items and text', () => {
    const item = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: item,
      now: ANCHOR,
    });
    const skipped = markSkipped(draft, ANCHOR);
    expect(skipped.items).toEqual([]);
    expect(skipped.draftText).toBe('');
    expect(skipped.status).toBe('skipped');
  });

  test('shouldConfirmSkip requires confirmation for multi-item or multi-day drafts', () => {
    const itemA = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const itemB = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_2', title: 'B', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    let draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: itemA,
      now: ANCHOR,
    });
    expect(shouldConfirmSkip(draft, ANCHOR)).toBe(false);
    draft = appendItem(draft, itemB, ANCHOR);
    expect(shouldConfirmSkip(draft, ANCHOR)).toBe(true);

    let oldDraft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: itemA,
      now: ANCHOR,
    });
    expect(
      shouldConfirmSkip(oldDraft, later(DRAFT_MULTI_DAY_THRESHOLD_MS + 1000))
    ).toBe(true);
  });
});

describe('describeDraftAgeLabel', () => {
  test('returns ready_to_send for fresh same-day single-item draft', () => {
    const item = makeDraftItem(
      { sourceType: 'activity', sourceId: 'act_1', title: 'A', completedAt: ANCHOR.toISOString() },
      ANCHOR
    );
    const draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      initialItem: item,
      now: ANCHOR,
    });
    expect(describeDraftAgeLabel(draft, ANCHOR)).toBe('ready_to_send');
  });

  test('returns a_few_wins_collected once item count crosses threshold', () => {
    let draft = createDraft({
      goalId: 'g',
      partnerCircleKey: 'u1|u2',
      now: ANCHOR,
    });
    for (let i = 0; i < 3; i += 1) {
      draft = appendItem(
        draft,
        makeDraftItem(
          {
            sourceType: 'activity',
            sourceId: `act_${i}`,
            title: `Item ${i}`,
            completedAt: ANCHOR.toISOString(),
          },
          ANCHOR
        ),
        ANCHOR
      );
    }
    expect(describeDraftAgeLabel(draft, ANCHOR)).toBe('a_few_wins_collected');
  });
});
