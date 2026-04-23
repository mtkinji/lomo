import { getStateFromPath } from '@react-navigation/core';
import type { PartialState, NavigationState } from '@react-navigation/native';

import { linkingConfig } from './linkingConfig';

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

    test('settings/subscription?openPricingDrawer=1 parses the boolean param', () => {
      const leaf = parse('settings/subscription?openPricingDrawer=1');
      expect(leaf?.params).toMatchObject({ openPricingDrawer: true });
    });
  });

  describe('Pre-existing deep links still resolve (no regression from refactor)', () => {
    test('kwilt://today -> ActivitiesList', () => {
      expect(parse('today')?.name).toBe('ActivitiesList');
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
      const leaf = parse('activity/act_42?openFocus=1&autoStartFocus=true');
      expect(leaf?.name).toBe('ActivityDetail');
      expect(leaf?.params).toMatchObject({
        activityId: 'act_42',
        openFocus: true,
        autoStartFocus: true,
      });
    });

    test('kwilt://more -> MoreHome', () => {
      expect(parse('more')?.name).toBe('MoreHome');
    });
  });
});
