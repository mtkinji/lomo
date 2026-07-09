import type { StorybookConfig } from '@storybook/react-native-web-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(storybookDir, '..');

const config: StorybookConfig = {
  stories: ['../docs/design-system/stories/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      modulesToTranspile: [
        '@expo',
        'expo',
        'expo-linear-gradient',
        'lucide-react-native',
        'react-native-svg',
      ],
      pluginReactOptions: {
        babel: {
          plugins: ['react-native-reanimated/plugin'],
        },
      },
    },
  },
  viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: [
          {
            find: /^@kwilt\/tokens$/,
            replacement: path.resolve(projectRoot, 'packages/kwilt-tokens/src/index.ts'),
          },
          {
            find: /^@kwilt\/tokens\/colors$/,
            replacement: path.resolve(projectRoot, 'packages/kwilt-tokens/src/colors.ts'),
          },
          {
            find: /^@kwilt\/tokens\/motion$/,
            replacement: path.resolve(projectRoot, 'packages/kwilt-tokens/src/motion.ts'),
          },
          {
            find: /^@kwilt\/tokens\/overlays$/,
            replacement: path.resolve(projectRoot, 'packages/kwilt-tokens/src/overlays.ts'),
          },
          {
            find: /^@kwilt\/tokens\/radii$/,
            replacement: path.resolve(projectRoot, 'packages/kwilt-tokens/src/radii.ts'),
          },
          {
            find: /^@kwilt\/tokens\/spacing$/,
            replacement: path.resolve(projectRoot, 'packages/kwilt-tokens/src/spacing.ts'),
          },
          {
            find: /^@kwilt\/tokens\/surfaces$/,
            replacement: path.resolve(projectRoot, 'packages/kwilt-tokens/src/surfaces.ts'),
          },
          {
            find: /^@kwilt\/tokens\/typography$/,
            replacement: path.resolve(projectRoot, 'packages/kwilt-tokens/src/typography.ts'),
          },
          {
            find: /^@\//,
            replacement: `${projectRoot}/`,
          },
          {
            find: 'expo-modules-core',
            replacement: path.resolve(storybookDir, 'shims/expo-modules-core.ts'),
          },
          {
            find: 'expo-linear-gradient',
            replacement: path.resolve(storybookDir, 'shims/expo-linear-gradient.tsx'),
          },
          {
            find: 'expo-haptics',
            replacement: path.resolve(storybookDir, 'shims/expo-haptics.ts'),
          },
          {
            find: 'react-native-reanimated',
            replacement: path.resolve(storybookDir, 'shims/react-native-reanimated.ts'),
          },
          {
            find: 'react-native',
            replacement: 'react-native-web',
          },
        ],
      },
      optimizeDeps: {
        exclude: [
          'expo',
          '@expo',
          'expo-modules-core',
          'expo-linear-gradient',
          'expo-haptics',
          'react-native-reanimated',
        ],
      },
    });
  },
};

export default config;
