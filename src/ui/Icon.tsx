import type { ComponentProps } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';

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
type IonName = ComponentProps<typeof Ionicons>['name'];

type IconLibrary = 'feather' | 'ion';

type IconEntry = { library: IconLibrary; name: FeatherName | IonName };

const iconMap: Record<string, IconEntry> = {
  today: { library: 'feather', name: 'calendar' },
  home: { library: 'feather', name: 'home' },
  arcs: { library: 'feather', name: 'compass' },
  chapters: { library: 'feather', name: 'book-open' },
  aiGuide: { library: 'feather', name: 'message-circle' },
  activities: { library: 'feather', name: 'list' },
  activity: { library: 'feather', name: 'activity' },
  // Arc identity narrative affordances
  identity: { library: 'feather', name: 'user' },
  why: { library: 'feather', name: 'help-circle' },
  daily: { library: 'feather', name: 'clock' },
  panelLeft: { library: 'feather', name: 'sidebar' },
  menu: { library: 'feather', name: 'menu' },
  paperclip: { library: 'feather', name: 'paperclip' },
  camera: { library: 'feather', name: 'camera' },
  image: { library: 'feather', name: 'image' },
  mic: { library: 'feather', name: 'mic' },
  arrowUp: { library: 'feather', name: 'arrow-up' },
  arrowDown: { library: 'feather', name: 'arrow-down' },
  dot: { library: 'feather', name: 'circle' },
  arrowLeft: { library: 'feather', name: 'arrow-left' },
  plus: { library: 'feather', name: 'plus' },
  more: { library: 'feather', name: 'more-horizontal' },
  goals: { library: 'feather', name: 'target' },
  info: { library: 'feather', name: 'info' },
  edit: { library: 'feather', name: 'edit-3' },
  search: { library: 'feather', name: 'search' },
  close: { library: 'feather', name: 'x' },
  chevronRight: { library: 'feather', name: 'chevron-right' },
  chevronDown: { library: 'feather', name: 'chevron-down' },
  chevronUp: { library: 'feather', name: 'chevron-up' },
  trash: { library: 'feather', name: 'trash-2' },
  refresh: { library: 'feather', name: 'refresh-cw' },
  check: { library: 'feather', name: 'check' },
  dev: { library: 'feather', name: 'code' },
  sparkles: { library: 'feather', name: 'zap' },
  clipboard: { library: 'feather', name: 'clipboard' },
  // Star icons: use Ionicons for both outline and filled variants so the shape stays consistent.
  star: { library: 'ion', name: 'star-outline' },
  starFilled: { library: 'ion', name: 'star' },
  funnel: { library: 'feather', name: 'filter' },
  sort: { library: 'feather', name: 'sliders' },
  thumbsDown: { library: 'feather', name: 'thumbs-down' },
  thumbsUp: { library: 'feather', name: 'thumbs-up' },
};

export type IconName = keyof typeof iconMap;

type FeatherProps = ComponentProps<typeof Feather>;

interface IconProps extends Omit<FeatherProps, 'name'> {
  name: IconName;
}

export function Icon({ name, size = 20, color = '#F9FAFB', ...rest }: IconProps) {
  const entry = iconMap[name] ?? { library: 'feather', name: 'circle' as FeatherName };

  if (entry.library === 'ion') {
    return <Ionicons name={entry.name as IonName} size={size} color={color} {...rest} />;
  }

  return <Feather name={entry.name as FeatherName} size={size} color={color} {...rest} />;
}


