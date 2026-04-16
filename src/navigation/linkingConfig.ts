import type { LinkingOptions } from '@react-navigation/native';

import type { RootDrawerParamList } from './RootNavigator';

/**
 * Deep-link configuration for the app's `NavigationContainer`.
 *
 * Extracted from `RootNavigator.tsx` so it can be unit-tested in isolation
 * (e.g. via `@react-navigation/core`'s `getStateFromPath`) and kept stable
 * as the canonical source of truth for every scheme / universal-link path
 * the app accepts.
 *
 * Examples:
 *   - `kwilt://today` -> ActivitiesTab > ActivitiesList (canonical Today entry)
 *   - `kwilt://chapters` -> MoreTab > MoreChapters
 *   - `kwilt://chapters/abc123` -> MoreTab > MoreChapterDetail (chapterId=abc123)
 *   - `kwilt://settings/subscription` -> Settings > SettingsManageSubscription
 *
 * When adding a new deep link path:
 *   1. Add the `path` under the correct nested `screens` here.
 *   2. Add it to the kwilt-site `OPEN_ROUTES` allow-list so the
 *      universal-link handoff will forward to it.
 *   3. Claim it (if needed) in the site's AASA `paths` array.
 */
export const LINKING_PREFIXES = [
  'kwilt://',
  'https://go.kwilt.app',
  'https://kwilt.app',
] as const;

export const linkingConfig: LinkingOptions<RootDrawerParamList>['config'] = {
  screens: {
    MainTabs: {
      screens: {
        GoalsTab: {
          screens: {
            GoalsList: {
              path: 'goals',
            },
            GoalDetail: {
              path: 'goal/:goalId',
            },
            JoinSharedGoal: {
              path: 'join/:inviteCode',
            },
          },
        },
        ActivitiesTab: {
          screens: {
            ActivitiesList: {
              // Canonical "Today" entrypoint for ecosystem surfaces.
              // We route into the Activities canvas (shell/canvas preserved) and let the
              // screen decide what "Today" means based on current state.
              path: 'today',
              parse: {
                highlightSuggested: (v: string) => v === '1' || v === 'true',
                contextGoalId: (v: string) => String(v),
                source: (v: string) => String(v),
              },
            },
            ActivitiesListFromWidget: {
              // Widget entrypoint for Activities list views.
              path: 'activities',
              parse: {
                viewId: (v: string) => String(v),
                source: (v: string) => String(v),
              },
            },
            ActivityDetail: {
              path: 'activity/:activityId',
              parse: {
                openFocus: (v: string) => v === '1' || v === 'true',
                autoStartFocus: (v: string) => v === '1' || v === 'true',
                endFocus: (v: string) => v === '1' || v === 'true',
                minutes: (v: string) => {
                  const parsed = Number(v);
                  return Number.isFinite(parsed) ? parsed : undefined;
                },
                source: (v: string) => String(v),
              },
            },
          },
        },
        PlanTab: {
          path: 'plan',
        },
        MoreTab: {
          screens: {
            MoreHome: {
              path: 'more',
            },
            // Chapter digest emails link to `kwilt://chapters/:id`. Without
            // these entries the app silently drops the route on launch.
            MoreChapters: {
              path: 'chapters',
            },
            MoreChapterDetail: {
              path: 'chapters/:chapterId',
            },
          },
        },
      },
    },
    Agent: {
      path: 'agent',
    },
    ArcsStack: {
      screens: {
        ArcsList: {
          path: 'arcs',
        },
        ArcDetail: {
          path: 'arc/:arcId',
        },
      },
    },
    Settings: {
      screens: {
        // Trial-expiry and Pro-grant emails deep-link into the Manage
        // Subscription screen, so paying users land on the right place.
        SettingsManageSubscription: {
          path: 'settings/subscription',
          parse: {
            openPricingDrawer: (v: string) => v === '1' || v === 'true',
            openPricingDrawerNonce: (v: string) => {
              const parsed = Number(v);
              return Number.isFinite(parsed) ? parsed : undefined;
            },
          },
        },
      },
    },
  },
};
