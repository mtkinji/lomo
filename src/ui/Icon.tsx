import type { ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';

// NOTE:
// We originally used `lucide-react-native` icons rendered via `react-native-svg`.
// On this project (Expo SDK 54, React Native 0.81, classic architecture),
// native SVG + Lucide introduced a series of startup crashes:
//   - "No component found for view with name \"RNSVGPath\" / \"RNSVGCircle\" / \"RNSVGGroup\""
//   - Reanimated / Worklets + New Architecture assertions
// Rather than invest in a full native SVG + New Arch migration right now, we
// switched to Feather icons from `@expo/vector-icons`, which are pre-integrated
// with Expo and don't require additional native setup. This keeps the visual
// language consistent and the app stable while we focus on product work.

type FeatherName = ComponentProps<typeof Feather>['name'];

const iconMap: Record<string, FeatherName> = {
  today: 'calendar',
  home: 'home',
  arcs: 'compass',
  chapters: 'book-open',
  aiGuide: 'message-circle',
  activities: 'list',
  activity: 'activity',
  panelLeft: 'sidebar',
  menu: 'menu',
  paperclip: 'paperclip',
  camera: 'camera',
  image: 'image',
  mic: 'mic',
  arrowUp: 'arrow-up',
  arrowDown: 'arrow-down',
  dot: 'circle',
  arrowLeft: 'arrow-left',
  plus: 'plus',
  more: 'more-horizontal',
  goals: 'target',
  info: 'info',
  edit: 'edit-3',
  search: 'search',
  close: 'x',
  chevronRight: 'chevron-right',
  chevronDown: 'chevron-down',
  trash: 'trash-2',
  refresh: 'refresh-cw',
  check: 'check',
  dev: 'code',
  sparkles: 'zap',
  clipboard: 'clipboard',
  star: 'star',
  funnel: 'filter',
  sort: 'sliders',
  thumbsDown: 'thumbs-down',
  thumbsUp: 'thumbs-up',
};

export type IconName = keyof typeof iconMap;

type FeatherProps = ComponentProps<typeof Feather>;

interface IconProps extends Omit<FeatherProps, 'name'> {
  name: IconName;
}

export function Icon({ name, size = 20, color = '#F9FAFB', ...rest }: IconProps) {
  const glyph = iconMap[name] ?? 'circle';
  return <Feather name={glyph} size={size} color={color} {...rest} />;
}


