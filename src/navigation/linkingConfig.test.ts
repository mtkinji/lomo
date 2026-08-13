import { getStateFromPath } from '@react-navigation/core';
import type { PartialState, NavigationState } from '@react-navigation/native';

import { linkingConfig, prepareIncomingNavigationUrl, normalizeKwiltGamesUrl } from './linkingConfig';

type AnyState = PartialState<NavigationState> | NavigationState | undefined;

type LeafRoute = {
  name: string;
  params?: Record<string, unknown>;
  path: string[];
};

/**
 * Walk the nested navigation state returned by `getStateFromPath` and return
 * the deepest-focused route along with the full stack of route names leading
 * to it (useful for asserting that e.g. `chapters/abc123` ends up inside
 * MainTabs > MoreTab > MoreChapterDetail, not just "some route named
 * MoreChapterDetail").
 */
function getLeafRoute(state: AnyState, trail: string[] = []): LeafRoute | null {
  if (!state || !state.routes || state.routes.length === 0) return null;
  const idx = typeof state.index === 'number' ? state.index : state.routes.length - 1;
  const focused = state.routes[idx];
  if (!focused) return null;
  const nextTrail = [...trail, focused.name];
  if (focused.state) {
    const deeper = getLeafRoute(focused.state as AnyState, nextTrail);
    if (deeper) return deeper;
  }
  return {
    name: focused.name,
    params: focused.params as Record<string, unknown> | undefined,
    path: nextTrail,
  };
}

function parse(path: string): LeafRoute | null {
  // `getStateFromPath` expects a bare path (no scheme/host), consistent with
  // what `NavigationContainer` feeds it after stripping `prefixes`.
  const state = getStateFromPath(path, linkingConfig);
  return getLeafRoute(state as AnyState);
}

describe('linkingConfig', () => {
  test('kwilt://games resolves to the Games capability shelf', () => {
    const leaf = parse('games');
    expect(leaf?.name).toBe('GamesShelf');
    expect(leaf?.path).toEqual(['Games', 'GamesShelf']);
  });

  test.each([
    ['food', 'RecipeLibrary', undefined],
    ['food/recipe/recipe-1', 'RecipeCooking', { recipeId: 'recipe-1' }],
    ['food/recipe/recipe-1/edit', 'RecipeEdit', { recipeId: 'recipe-1' }],
    ['food/import', 'RecipeImportReview', undefined],
    ['food/groceries/list-1/smiths', 'KrogerCart', { listId: 'list-1' }],
  ] as const)('resolves Food path %s', (path, routeName, params) => {
    const state = getStateFromPath(path, linkingConfig);
    const leaf = getLeafRoute(state);
    expect(leaf?.name).toBe(routeName);
    expect(leaf?.params).toEqual(params);
  });

  test.each([
    ['games/timer', 'GamesTimer', undefined],
    ['games/stitch-five', 'GamesStitchFive', undefined],
    ['games/tumble/farkle', 'GamesTumble', { mode: 'farkle' }],
    ['games/play/common-thread', 'GamesConnection', { gameId: 'common-thread' }],
    ['games/join/ABCD12', 'GamesJoin', { token: 'ABCD12' }],
    ['games/room/room-1', 'GamesRemote', { sessionId: 'room-1' }],
  ] as const)('resolves Games path %s', (path, routeName, params) => {
    const leaf = parse(path);
    expect(leaf?.name).toBe(routeName);
    expect(leaf?.params).toEqual(params);
  });

  test('normalizes standalone and universal Games invites into the Kwilt capability path', () => {
    expect(normalizeKwiltGamesUrl('kwiltgames://join/private-token')).toBe('kwilt://games/join/private-token');
    expect(normalizeKwiltGamesUrl('https://games.kwilt.app/join/private-token')).toBe('kwilt://games/join/private-token');
  });

  test('kwilt://explore resolves to the Explore capability map', () => {
    const leaf = parse('explore');
    expect(leaf?.name).toBe('ExploreMap');
    expect(leaf?.path).toEqual(['Explore', 'ExploreMap']);
  });

  test('kwilt://chat preserves default entry and parses an explicit fresh widget entry', () => {
    expect(parse('chat')).toMatchObject({ name: 'UnifiedChat' });
    expect(parse('chat')?.params).toBeUndefined();
    expect(parse('chat?entry=fresh&source=widget')).toMatchObject({
      name: 'UnifiedChat',
      params: { entry: 'fresh', source: 'widget' },
    });
    expect(parse('chat?entry=fresh&mode=conversation&source=widget')).toMatchObject({
      name: 'UnifiedChat',
      params: { entry: 'fresh', mode: 'conversation', source: 'widget' },
    });
  });

  test('kwilt://home opens Shared Home with an optional exact delivery', () => {
    expect(parse('home')).toMatchObject({ name: 'SharedHome' });
    expect(parse('home/delivery-1')).toMatchObject({
      name: 'SharedHome',
      params: { deliveryId: 'delivery-1' },
    });
  });

  test('gives every incoming Chat widget open a distinct launch id', () => {
    const first = prepareIncomingNavigationUrl('kwilt://chat?entry=fresh&source=widget', 'launch-1');
    const second = prepareIncomingNavigationUrl('kwilt://chat?entry=fresh&source=widget', 'launch-2');

    expect(first).toContain('widgetLaunchId=launch-1');
    expect(second).toContain('widgetLaunchId=launch-2');
    expect(first).not.toBe(second);
    expect(parse(first.replace('kwilt://', ''))?.params).toMatchObject({
      entry: 'fresh',
      source: 'widget',
      widgetLaunchId: 'launch-1',
    });
  });

  test('normalizes a universal-link handoff to the native Household route', () => {
    expect(prepareIncomingNavigationUrl('https://go.kwilt.app/open/household/CHILD12'))
      .toBe('kwilt://household/CHILD12');
  });

  describe('Money capability deep links', () => {
    test.each([
      ['money', 'MoneySummary', ['Money', 'MoneySummary'], undefined],
      ['money/transactions', 'MoneyTransactions', ['Money', 'MoneyTransactions'], undefined],
      ['money/accounts', 'MoneyAccounts', ['Money', 'MoneyAccounts'], undefined],
      [
        'money/category/category-1',
        'MoneyCategoryDetail',
        ['Money', 'MoneyCategoryDetail'],
        { categoryId: 'category-1' },
      ],
      [
        'money/transaction/transaction-1',
        'MoneyTransactionDetail',
        ['Money', 'MoneyTransactionDetail'],
        { transactionId: 'transaction-1' },
      ],
    ] as const)('resolves %s to %s', (path, name, routePath, params) => {
      const leaf = parse(path);
      expect(leaf?.name).toBe(name);
      expect(leaf?.path).toEqual(routePath);
      if (params) expect(leaf?.params).toEqual(params);
    });
  });

  describe('Phase 2 deep links (added for email CTAs)', () => {
    test('kwilt://chapters resolves to MoreChapters inside MoreTab', () => {
      const leaf = parse('chapters');
      expect(leaf).not.toBeNull();
      expect(leaf!.name).toBe('MoreChapters');
      expect(leaf!.path).toEqual(['MainTabs', 'MoreTab', 'MoreChapters']);
    });

    test('kwilt://chapters/:id resolves to MoreChapterDetail with chapterId', () => {
      const leaf = parse('chapters/abc123');
      expect(leaf).not.toBeNull();
      expect(leaf!.name).toBe('MoreChapterDetail');
      expect(leaf!.path).toEqual(['MainTabs', 'MoreTab', 'MoreChapterDetail']);
      expect(leaf!.params).toEqual({ chapterId: 'abc123' });
    });

    test('chapterId param is preserved verbatim (ids may contain dashes/underscores)', () => {
      const leaf = parse('chapters/abc-123_XYZ');
      expect(leaf?.params).toEqual({ chapterId: 'abc-123_XYZ' });
    });

    // Phase 7.3: the digest email's secondary "What did we miss?" CTA
    // appends `?addLine=1` to the chapter deep link. The detail screen
    // uses the parsed boolean to auto-expand + focus the add-a-line
    // input. Regression fence so the parser stays wired.
    test('chapters/:id?addLine=1 parses the boolean param', () => {
      const leaf = parse('chapters/abc123?addLine=1');
      expect(leaf?.params).toMatchObject({ chapterId: 'abc123', addLine: true });
    });

    test('chapters/:id without addLine leaves the param absent', () => {
      const leaf = parse('chapters/abc123');
      expect(leaf?.params).toEqual({ chapterId: 'abc123' });
    });

    test('kwilt://settings/subscription resolves to SettingsManageSubscription', () => {
      const leaf = parse('settings/subscription');
      expect(leaf).not.toBeNull();
      expect(leaf!.name).toBe('SettingsManageSubscription');
      expect(leaf!.path).toEqual(['Settings', 'SettingsManageSubscription']);
    });

    test('kwilt://settings resolves to the shared Settings home', () => {
      const leaf = parse('settings');
      expect(leaf?.name).toBe('SettingsHome');
      expect(leaf?.path).toEqual(['Settings', 'SettingsHome']);
    });

    test('kwilt://settings/games resolves to Games player settings', () => {
      const leaf = parse('settings/games');
      expect(leaf?.name).toBe('SettingsGames');
      expect(leaf?.path).toEqual(['Settings', 'SettingsGames']);
    });

    test('kwilt://settings/money-privacy resolves to Money privacy settings', () => {
      const leaf = parse('settings/money-privacy');
      expect(leaf?.name).toBe('SettingsMoneyPrivacy');
      expect(leaf?.path).toEqual(['Settings', 'SettingsMoneyPrivacy']);
    });

    test('friend invite links resolve to the explicit Settings decision screen', () => {
      const leaf = parse('friend/abc123');
      expect(leaf?.name).toBe('SettingsJoinFriend');
      expect(leaf?.path).toEqual(['Settings', 'SettingsJoinFriend']);
      expect(leaf?.params).toEqual({ inviteCode: 'abc123' });
    });

    test('settings/subscription?openPricingDrawer=1 parses the boolean param', () => {
      const leaf = parse('settings/subscription?openPricingDrawer=1');
      expect(leaf?.params).toMatchObject({ openPricingDrawer: true });
    });
  });

  describe('Pre-existing deep links still resolve (no regression from refactor)', () => {
    test('kwilt://household/:code opens invitation review', () => {
      const leaf = parse('household/CHILD12');
      expect(leaf?.name).toBe('SettingsHousehold');
      expect(leaf?.path).toEqual(['Settings', 'SettingsHousehold']);
      expect(leaf?.params).toEqual({ inviteCode: 'CHILD12' });
    });

    test('development Guided Overture link resolves to the isolated lab route', () => {
      expect(parse('__dev/guided-overture')?.name).toBe('GuidedOvertureLab');
    });

    test('development tools link resolves to the development-only root route', () => {
      expect(parse('__dev/tools')?.name).toBe('DevTools');
    });

    test('kwilt://today -> ActivitiesList', () => {
      expect(parse('today')?.name).toBe('ActivitiesList');
    });

    test('kwilt://focus opens the standalone full-page Focus interstitial', () => {
      const leaf = parse('focus?source=widget');
      expect(leaf?.name).toBe('StandaloneFocus');
      expect(leaf?.path).toEqual(['StandaloneFocus']);
      expect(leaf?.params).toMatchObject({
        source: 'widget',
      });
    });

    test('kwilt://todos aliases the canonical To-dos root', () => {
      const leaf = parse('todos');
      expect(leaf?.name).toBe('ActivitiesList');
      expect(leaf?.path).toEqual(['MainTabs', 'ActivitiesTab', 'ActivitiesList']);
    });

    test('kwilt://todos?openQuickAdd=1 opens the To-dos composer from a widget', () => {
      const leaf = parse('todos?openQuickAdd=1&source=widget');
      expect(leaf?.name).toBe('ActivitiesList');
      expect(leaf?.params).toMatchObject({
        openQuickAdd: true,
        source: 'widget',
      });
    });

    test('kwilt://settings/screen-time opens the Screen Time controls', () => {
      const leaf = parse('settings/screen-time');
      expect(leaf?.name).toBe('SettingsScreenTimeProtection');
      expect(leaf?.path).toEqual(['Settings', 'SettingsScreenTimeProtection']);
    });

    test('kwilt://plan -> PlanTab', () => {
      expect(parse('plan')?.name).toBe('PlanTab');
    });

    test('kwilt://activities -> ActivitiesListFromWidget', () => {
      expect(parse('activities')?.name).toBe('ActivitiesListFromWidget');
    });

    test('kwilt://arcs -> ArcsList', () => {
      expect(parse('arcs')?.name).toBe('ArcsList');
    });

    test('kwilt://arc/:arcId -> ArcDetail with param', () => {
      const leaf = parse('arc/arc_42');
      expect(leaf?.name).toBe('ArcDetail');
      expect(leaf?.params).toEqual({ arcId: 'arc_42' });
    });

    test('kwilt://goal/:goalId -> GoalDetail with param', () => {
      const leaf = parse('goal/goal_42');
      expect(leaf?.name).toBe('GoalDetail');
      expect(leaf?.params).toEqual({ goalId: 'goal_42' });
    });

    test('kwilt://activity/:activityId -> ActivityDetail with param + parsed booleans', () => {
      const leaf = parse('activity/act_42?openFocus=1&openSchedule=true&autoStartFocus=true');
      expect(leaf?.name).toBe('ActivityDetail');
      expect(leaf?.params).toMatchObject({
        activityId: 'act_42',
        openFocus: true,
        openSchedule: true,
        autoStartFocus: true,
      });
    });

    test('kwilt://more -> MoreHome', () => {
      expect(parse('more')?.name).toBe('MoreHome');
    });
  });
});
