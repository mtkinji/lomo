import { readFileSync } from 'fs';
import path from 'path';

import { ObjectPageHeader } from './ObjectPageHeader';
import { floatingControl } from '../../theme/overlays';

describe('immersive object page headers', () => {
  it('is owned by the shared object-page header', () => {
    expect(ObjectPageHeader).toBeDefined();
  });

  it('uses one compact floating-control treatment across headers and docks', () => {
    expect(floatingControl.material).toMatchObject({
      intensity: 20,
      borderColor: '#FFFFFF',
      borderWidth: 1,
    });
    expect(floatingControl.shadow).toMatchObject({
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    });
  });

  it.each([
    '../../features/arcs/ArcDetailScreen.tsx',
    '../../features/arcs/GoalDetailScreen.tsx',
    '../../features/activities/ActivityDetailRefresh.tsx',
  ])('keeps fixed action pills without a full-width header surface in %s', (relativePath) => {
    const source = readFileSync(path.join(__dirname, relativePath), 'utf8');
    const objectHeader = source.match(/<ObjectPageHeader[\s\S]*?\/>/)?.[0] ?? '';

    expect(objectHeader).toContain('showFullWidthBackground={false}');
    expect(objectHeader).not.toContain('backgroundOpacity=');
  });

  it.each([
    '../../features/arcs/ArcDetailScreen.tsx',
    '../../features/arcs/GoalDetailScreen.tsx',
  ])('uses the floating-white material for every fixed control in %s', (relativePath) => {
    const source = readFileSync(path.join(__dirname, relativePath), 'utf8');

    expect(source.match(/materialVariant="floatingWhite"/g)).toHaveLength(3);
  });

  it('uses the floating-white material for every fixed To-do control', () => {
    const source = readFileSync(
      path.join(__dirname, '../../features/activities/ActivityDetailRefresh.tsx'),
      'utf8',
    );

    expect(source.match(/materialVariant="floatingWhite"/g)).toHaveLength(3);
  });
});
