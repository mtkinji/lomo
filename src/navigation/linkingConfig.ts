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
 *   - `kwilt://settings/connections` -> Settings > SettingsConnectedTools
 *
 * When adding a new deep link path:
 *   1. Add the `path` under the correct nested `screens` here.
 *   2. Add it to the kwilt-site `OPEN_ROUTES` allow-list so the
 *      universal-link handoff will forward to it.
 *   3. Claim it (if needed) in the site's AASA `paths` array.
 */
export const LINKING_PREFIXES = [
  'kwilt://',
  'kwiltgames://',
  'https://go.kwilt.app',
  'https://kwilt.app',
  'https://games.kwilt.app',
] as const;

export function normalizeKwiltGamesUrl(url: string) {
  if (url.startsWith('kwiltgames://join/')) {
    return `kwilt://games/join/${url.slice('kwiltgames://join/'.length)}`;
  }
  if (url.startsWith('https://games.kwilt.app/join/')) {
    return `kwilt://games/join/${url.slice('https://games.kwilt.app/join/'.length)}`;
  }
  return url;
}

let widgetLaunchSequence = 0;

export function prepareIncomingNavigationUrl(
  url: string,
  launchId = `${Date.now()}-${++widgetLaunchSequence}`,
) {
  let normalized = normalizeKwiltGamesUrl(url);
  try {
    const handoff = new URL(normalized);
    const host = handoff.hostname.toLowerCase();
    const path = handoff.pathname.replace(/^\/+/, '');
    if ((host === 'go.kwilt.app' || host === 'kwilt.app') && path.startsWith('open/')) {
      const nativePath = path.slice('open/'.length);
      if (nativePath) normalized = `kwilt://${nativePath}${handoff.search}`;
    }
  } catch {
    // Let React Navigation handle malformed or unsupported URLs as before.
  }
  try {
    const parsed = new URL(normalized);
    if (
      parsed.protocol === 'kwilt:' &&
      parsed.hostname === 'chat' &&
      parsed.searchParams.get('entry') === 'fresh' &&
      parsed.searchParams.get('source') === 'widget'
    ) {
      parsed.searchParams.set('widgetLaunchId', launchId);
      return parsed.toString();
    }
  } catch {
    // Let React Navigation handle malformed or unsupported URLs as before.
  }
  return normalized;
}

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
              alias: ['todos'],
              parse: {
                autoStartStandaloneFocus: (v: string) => v === '1' || v === 'true',
                openStandaloneFocus: (v: string) => v === '1' || v === 'true',
                focusMinutes: (v: string) => {
                  const parsed = Number(v);
                  return Number.isFinite(parsed) ? parsed : undefined;
                },
                focusAudio: (v: string) => String(v),
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
                openSchedule: (v: string) => v === '1' || v === 'true',
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
              parse: {
                // Phase 7.3 of docs/chapters-plan.md: the weekly
                // digest's secondary "What did we miss?" CTA opens the
                // Chapter detail with `addLine=1`, which the screen
                // uses to auto-expand + focus the Add-a-line input.
                addLine: (v: string) => v === '1' || v === 'true',
              },
            },
          },
        },
      },
    },
    Agent: {
      path: 'agent',
    },
    UnifiedChat: {
      path: 'chat',
      parse: {
        entry: (value: string) => value === 'fresh' ? 'fresh' : undefined,
        source: (value: string) => String(value),
        widgetLaunchId: (value: string) => String(value),
      },
    },
    // Development-only lab route. The matching screen is not mounted in production builds.
    GuidedOvertureLab: {
      path: '__dev/guided-overture',
    },
    DevTools: {
      path: '__dev/tools',
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
    Money: {
      screens: {
        MoneySummary: 'money',
        MoneyTransactions: 'money/transactions',
        MoneyAccounts: 'money/accounts',
        MoneyCategoryDetail: 'money/category/:categoryId',
        MoneyTransactionDetail: 'money/transaction/:transactionId',
      },
    },
    Explore: {
      screens: {
        ExploreMap: 'explore',
      },
    },
    Games: {
      screens: {
        GamesShelf: 'games',
        GamesTimer: 'games/timer',
        GamesTumble: 'games/tumble/:mode?',
        GamesConnection: 'games/play/:gameId',
        GamesJoin: 'games/join/:token?',
        GamesRemote: 'games/room/:sessionId',
        GamesAccount: 'games/account',
      },
    },
    Settings: {
      screens: {
        SettingsHome: 'settings',
        SettingsExplore: 'settings/explore',
        SettingsGames: 'settings/games',
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
        SettingsConnectedTools: {
          path: 'settings/connections',
        },
        SettingsHousehold: {
          path: 'household/:inviteCode?',
        },
        SettingsMoneyPrivacy: 'settings/money-privacy',
        SettingsJoinFriend: 'friend/:inviteCode',
      },
    },
  },
};
