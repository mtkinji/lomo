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
  outlook: { library: 'ion', name: 'logo-microsoft' },
  apple: { library: 'ion', name: 'logo-apple' },
  google: { library: 'ion', name: 'logo-google' },
  fileText: { library: 'feather', name: 'file-text' },
  home: { library: 'feather', name: 'home' },
  arcs: { library: 'feather', name: 'compass' },
  chapters: { library: 'feather', name: 'book-open' },
  aiGuide: { library: 'feather', name: 'message-circle' },
  activities: { library: 'feather', name: 'list' },
  activity: { library: 'feather', name: 'activity' },
  // Planning / metadata affordances
  estimate: { library: 'ion', name: 'hourglass-outline' },
  difficulty: { library: 'feather', name: 'bar-chart-2' },
  // Arc identity narrative affordances
  identity: { library: 'feather', name: 'user' },
  why: { library: 'feather', name: 'help-circle' },
  daily: { library: 'feather', name: 'clock' },
  bell: { library: 'feather', name: 'bell' },
  panelLeft: { library: 'feather', name: 'sidebar' },
  menu: { library: 'feather', name: 'menu' },
  paperclip: { library: 'feather', name: 'paperclip' },
  share: { library: 'feather', name: 'share' },
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
  warning: { library: 'feather', name: 'alert-triangle' },
  danger: { library: 'feather', name: 'alert-octagon' },
  edit: { library: 'feather', name: 'edit-3' },
  search: { library: 'feather', name: 'search' },
  close: { library: 'feather', name: 'x' },
  chevronLeft: { library: 'feather', name: 'chevron-left' },
  chevronRight: { library: 'feather', name: 'chevron-right' },
  chevronDown: { library: 'feather', name: 'chevron-down' },
  chevronUp: { library: 'feather', name: 'chevron-up' },
  chevronsUpDown: { library: 'ion', name: 'chevron-expand' },
  trash: { library: 'feather', name: 'trash-2' },
  archive: { library: 'feather', name: 'archive' },
  refresh: { library: 'feather', name: 'refresh-cw' },
  check: { library: 'feather', name: 'check' },
  dev: { library: 'feather', name: 'code' },
  sparkles: { library: 'feather', name: 'zap' },
  clipboard: { library: 'feather', name: 'clipboard' },
  cart: { library: 'feather', name: 'shopping-cart' },
  // Star icons: use Ionicons for both outline and filled variants so the shape stays consistent.
  star: { library: 'ion', name: 'star-outline' },
  starFilled: { library: 'ion', name: 'star' },
  funnel: { library: 'feather', name: 'filter' },
  sort: { library: 'feather', name: 'sliders' },
  thumbsDown: { library: 'feather', name: 'thumbs-down' },
  thumbsUp: { library: 'feather', name: 'thumbs-up' },
  sound: { library: 'feather', name: 'volume-2' },
  soundOff: { library: 'feather', name: 'volume-x' },
  pause: { library: 'feather', name: 'pause' },
  play: { library: 'feather', name: 'play' },
  stop: { library: 'feather', name: 'square' },
  // Editor toolbar icons
  // Use Ionicons here because it has more "toolbar-ish" glyphs than Feather for lists.
  listBulleted: { library: 'ion', name: 'list' },
  listOrdered: { library: 'ion', name: 'list-outline' },
  link: { library: 'feather', name: 'link-2' },
  bold: { library: 'feather', name: 'bold' },
  italic: { library: 'feather', name: 'italic' },
  underline: { library: 'feather', name: 'underline' },
  // Editor history
  undo: { library: 'feather', name: 'rotate-ccw' },
  redo: { library: 'feather', name: 'rotate-cw' },
  expand: { library: 'feather', name: 'maximize-2' },
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


