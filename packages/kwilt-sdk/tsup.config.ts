import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/client.ts',
    'src/types.ts',
    'src/activities.ts',
    'src/goals.ts',
    'src/arcs.ts',
    'src/chapters.ts',
    'src/checkins.ts',
    'src/views.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  splitting: false,
  treeshake: true,
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
