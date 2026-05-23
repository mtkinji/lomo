import React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

jest.mock('../../ui/layout/AppShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    AppShell: ({ children }: any) => React.createElement(View, { testID: 'app-shell' }, children),
  };
});

jest.mock('../../ui/layout/PageHeader', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    PageHeader: ({ title, moreMenu }: any) =>
      React.createElement(
        View,
        { testID: 'page-header' },
        React.createElement(Text, null, title),
        moreMenu,
      ),
  };
});

jest.mock('../../ui/DropdownMenu', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Passthrough = ({ children }: any) => React.createElement(View, null, children);
  return {
    DropdownMenu: Passthrough,
    DropdownMenuContent: Passthrough,
    DropdownMenuItem: Passthrough,
    DropdownMenuTrigger: Passthrough,
  };
});

jest.mock('../../ui/Coachmark', () => ({
  Coachmark: () => null,
}));

jest.mock('../../ui/Icon', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Icon: ({ name }: any) => React.createElement(View, { accessibilityLabel: `icon:${name}` }),
  };
});

const mockNavigate = jest.fn();
let focusCallback: (() => void | (() => void)) | null = null;

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      focusCallback = callback;
      React.useEffect(() => callback(), [callback]);
    },
  };
});

const mockCreateDefaultWeeklyReflectionTemplate = jest.fn();
const mockFetchMyChapters = jest.fn();
const mockGetWeeklyDigestSettings = jest.fn();
const mockUpdateWeeklyDigestSettings = jest.fn();

jest.mock('../../services/chapters', () => {
  const actual = jest.requireActual('../../services/chapters');
  return {
    ...actual,
    createDefaultWeeklyReflectionTemplate: (...args: unknown[]) => mockCreateDefaultWeeklyReflectionTemplate(...args),
    fetchMyChapters: (...args: unknown[]) => mockFetchMyChapters(...args),
    getWeeklyDigestSettings: (...args: unknown[]) => mockGetWeeklyDigestSettings(...args),
    updateWeeklyDigestSettings: (...args: unknown[]) => mockUpdateWeeklyDigestSettings(...args),
  };
});

const mockCapture = jest.fn();

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

jest.mock('../../store/useShowedUpToday', () => ({
  useShowedUpToday: () => false,
  useRepairWindowActive: () => false,
}));

jest.mock('./chapterReadState', () => ({
  getChapterReadMap: jest.fn(async () => ({})),
  getChapterReadMapSync: jest.fn(() => ({})),
  subscribeChapterReadChanges: jest.fn(() => jest.fn()),
}));

import { renderWithProviders } from '../../test/renderWithProviders';
import { ChaptersScreen } from './ChaptersScreen';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const chapter = {
  id: 'chapter-1',
  user_id: 'user-1',
  template_id: 'template-1',
  period_start: '2026-05-11T06:00:00.000Z',
  period_end: '2026-05-18T06:00:00.000Z',
  period_key: '2026-W20',
  input_summary: {},
  metrics: {
    activities: { completed_count: 11 },
    time_shape: { active_days_count: 7 },
  },
  output_json: {
    title: 'Backlog Pressure and Consistency',
    dek: 'This week, you completed the visible work.',
  },
  status: 'ready',
  error: null,
  emailed_at: null,
  user_note: null,
  user_note_updated_at: null,
  created_at: '2026-05-21T00:00:00.000Z',
  updated_at: '2026-05-21T00:00:00.000Z',
};

describe('ChaptersScreen loading states', () => {
  beforeEach(() => {
    focusCallback = null;
    mockNavigate.mockReset();
    mockCreateDefaultWeeklyReflectionTemplate.mockReset();
    mockCreateDefaultWeeklyReflectionTemplate.mockResolvedValue(null);
    mockFetchMyChapters.mockReset();
    mockGetWeeklyDigestSettings.mockReset();
    mockGetWeeklyDigestSettings.mockResolvedValue({
      enabled: true,
      deliveryWeekday: 1,
      template: { id: 'template-1' },
    });
    mockUpdateWeeklyDigestSettings.mockReset();
    mockCapture.mockReset();
  });

  it('does not show the weekly chapters empty state before the first chapter fetch resolves', async () => {
    const firstFetch = deferred<typeof chapter[]>();
    mockFetchMyChapters.mockReturnValueOnce(firstFetch.promise);

    const screen = renderWithProviders(<ChaptersScreen />);

    expect(screen.getByText('Loading chapters…')).toBeTruthy();
    expect(screen.queryByText('Your first weekly chapter is on its way')).toBeNull();

    await act(async () => {
      firstFetch.resolve([chapter]);
      await firstFetch.promise;
    });

    await waitFor(() => expect(screen.getByText('Backlog Pressure and Consistency')).toBeTruthy());
  });

  it('keeps automatic focus reloads out of the pull-to-refresh loading indicator', async () => {
    mockFetchMyChapters.mockResolvedValueOnce([chapter]);

    const screen = renderWithProviders(<ChaptersScreen />);

    await waitFor(() => expect(screen.getByText('Backlog Pressure and Consistency')).toBeTruthy());

    const backgroundFetch = deferred<typeof chapter[]>();
    mockFetchMyChapters.mockReturnValueOnce(backgroundFetch.promise);

    await act(async () => {
      focusCallback?.();
    });

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    expect(scrollView.props.refreshControl.props.refreshing).toBe(false);
    expect(screen.getByText('Backlog Pressure and Consistency')).toBeTruthy();

    await act(async () => {
      backgroundFetch.resolve([chapter]);
      await backgroundFetch.promise;
    });
  });
});
