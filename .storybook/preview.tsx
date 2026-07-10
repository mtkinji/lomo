import type { Preview } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const preview: Preview = {
  initialGlobals: {
    viewport: {
      value: 'mobile2',
      isRotated: false,
    },
  },
  decorators: [
    (Story) => (
      <GestureHandlerRootView style={{ minHeight: '100vh' as never }}>
        <SafeAreaProvider>
          <View
            style={{
              minHeight: '100vh' as never,
              backgroundColor: '#FFFFFF',
              padding: 24,
            }}
          >
            <Story />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    ),
  ],
  parameters: {
    controls: {
      expanded: true,
    },
    options: {
      storySort: {
        order: ['Foundation', 'Illustration', 'Primitives', 'Forms', 'Feedback', 'Objects', 'Settings', 'Overlays', 'Navigation'],
      },
    },
  },
};

export default preview;
