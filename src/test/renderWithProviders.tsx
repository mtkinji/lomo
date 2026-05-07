import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  WorkflowRuntimeContext,
  type WorkflowRuntimeContextValue,
} from '../features/ai/WorkflowRuntimeContext';

type ProviderOptions = {
  withNavigation?: boolean;
  workflowRuntime?: WorkflowRuntimeContextValue;
};

const TEST_INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function TestProviders({
  children,
  options,
}: {
  children: ReactNode;
  options: ProviderOptions;
}) {
  const { withNavigation = false, workflowRuntime } = options;
  let content: ReactNode = children;

  if (workflowRuntime) {
    content = (
      <WorkflowRuntimeContext.Provider value={workflowRuntime}>
        {content}
      </WorkflowRuntimeContext.Provider>
    );
  }

  if (withNavigation) {
    content = <NavigationContainer>{content}</NavigationContainer>;
  }

  return (
    <SafeAreaProvider initialMetrics={TEST_INITIAL_METRICS}>
      {content}
    </SafeAreaProvider>
  );
}

export type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> &
  ProviderOptions;

/**
 * Render a React Native component tree with the providers commonly required
 * by Kwilt feature components: SafeAreaProvider, optional NavigationContainer,
 * and optional WorkflowRuntimeContext.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult {
  const { withNavigation, workflowRuntime, ...renderOptions } = options;
  return render(ui, {
    ...renderOptions,
    wrapper: ({ children }) => (
      <TestProviders options={{ withNavigation, workflowRuntime }}>
        {children}
      </TestProviders>
    ),
  });
}

export { TEST_INITIAL_METRICS };
