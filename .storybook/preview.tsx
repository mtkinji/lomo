import type { Preview } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { colors } from '../src/theme/colors';

const preview: Preview = {
  decorators: [
    (Story) => (
      <View
        style={{
          minHeight: '100vh' as never,
          backgroundColor: colors.shellAlt,
          padding: 24,
        }}
      >
        <Story />
      </View>
    ),
  ],
  parameters: {
    controls: {
      expanded: true,
    },
    options: {
      storySort: {
        order: ['Foundation', 'Primitives', 'Settings'],
      },
    },
  },
};

export default preview;
