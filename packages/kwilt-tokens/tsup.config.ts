import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/colors.ts',
    'src/spacing.ts',
    'src/typography.ts',
    'src/motion.ts',
    'src/surfaces.ts',
    'src/overlays.ts',
    'src/colorUtils.ts',
    'src/objectTypeBadges.ts',
    'src/tailwind-preset.ts',
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
