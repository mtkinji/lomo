import type { ComponentProps } from 'react';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { KwiltIcon, type KwiltIconName } from '../icons/KwiltIcons';

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
type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type IconLibrary = 'feather' | 'ion' | 'kwilt' | 'mci';

type IconEntry =
  | { library: 'feather'; name: FeatherName }
  | { library: 'ion'; name: IonName }
  | { library: 'kwilt'; name: KwiltIconName }
  | { library: 'mci'; name: MciName };

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
  pin: { library: 'feather', name: 'map-pin' },
  locate: { library: 'feather', name: 'crosshair' },
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
  target: { library: 'feather', name: 'target' },
  inbox: { library: 'feather', name: 'inbox' },
  layers: { library: 'feather', name: 'layers' },
  checklist: { library: 'feather', name: 'check-square' },
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
  checkCircle: { library: 'feather', name: 'check-circle' },
  dev: { library: 'feather', name: 'code' },
  sparkles: { library: 'feather', name: 'zap' },
  plan: { library: 'feather', name: 'zap' },
  // Calm focus affordance (used for Focus mode / execution).
  focus: { library: 'kwilt', name: 'focus' },
  // Send/push payload outside of Kwilt (export / send out).
  // Use Feather's paper-plane glyph for a clean, familiar “send out” affordance.
  sendTo: { library: 'feather', name: 'send' },
  // Export to external calendar (distinct from “pick a date” calendar usage).
  sendToCalendar: { library: 'kwilt', name: 'sendToCalendar' },
  send: { library: 'feather', name: 'send' },
  clipboard: { library: 'feather', name: 'clipboard' },
  cart: { library: 'feather', name: 'shopping-cart' },
  users: { library: 'feather', name: 'users' },
  userPlus: { library: 'feather', name: 'user-plus' },
  userMinus: { library: 'feather', name: 'user-minus' },
  messageCircle: { library: 'feather', name: 'message-circle' },
  // Star icons: use Ionicons for both outline and filled variants so the shape stays consistent.
  star: { library: 'ion', name: 'star-outline' },
  starFilled: { library: 'ion', name: 'star' },
  funnel: { library: 'feather', name: 'filter' },
  sort: { library: 'feather', name: 'sliders' },
  thumbsDown: { library: 'feather', name: 'thumbs-down' },
  thumbsUp: { library: 'feather', name: 'thumbs-up' },
  sound: { library: 'feather', name: 'volume-2' },
  soundOff: { library: 'feather', name: 'volume-x' },
  // Haptics / tactile feedback (device vibration)
  haptics: { library: 'feather', name: 'smartphone' },
  lock: { library: 'feather', name: 'lock' },
  pause: { library: 'feather', name: 'pause' },
  play: { library: 'feather', name: 'play' },
  stop: { library: 'feather', name: 'square' },
  box: { library: 'feather', name: 'box' },
  // Editor toolbar icons
  // Use Ionicons here because it has more "toolbar-ish" glyphs than Feather for lists.
  listBulleted: { library: 'ion', name: 'list' },
  listOrdered: { library: 'ion', name: 'list-outline' },
  link: { library: 'feather', name: 'link-2' },
  bold: { library: 'feather', name: 'bold' },
  italic: { library: 'feather', name: 'italic' },
  underline: { library: 'feather', name: 'underline' },
  eye: { library: 'feather', name: 'eye' },
  eyeOff: { library: 'feather', name: 'eye-off' },
  // Editor history
  undo: { library: 'feather', name: 'rotate-ccw' },
  redo: { library: 'feather', name: 'rotate-cw' },
  expand: { library: 'feather', name: 'maximize-2' },
  collapse: { library: 'feather', name: 'minimize-2' },
  externalLink: { library: 'feather', name: 'external-link' },
  // Semantic Sort Icons
  sortAlphaAsc: { library: 'mci', name: 'sort-alphabetical-ascending' },
  sortAlphaDesc: { library: 'mci', name: 'sort-alphabetical-descending' },
  sortNumericAsc: { library: 'mci', name: 'sort-numeric-ascending' },
  sortNumericDesc: { library: 'mci', name: 'sort-numeric-descending' },
  sortCalendarAsc: { library: 'mci', name: 'sort-calendar-ascending' },
  sortCalendarDesc: { library: 'mci', name: 'sort-calendar-descending' },
  sortAmountAsc: { library: 'mci', name: 'sort-variant-lock-open' }, // Fallback for general amount
  sortAmountDesc: { library: 'mci', name: 'sort-variant-lock' },
  // View layout icons for activity views
  viewList: { library: 'mci', name: 'view-list' },
  viewKanban: { library: 'mci', name: 'view-column' },
};

export type IconName = keyof typeof iconMap;

type FeatherProps = ComponentProps<typeof Feather>;

interface IconProps extends Omit<FeatherProps, 'name'> {
  name: IconName;
}

export function Icon({ name, size = 20, color = '#F9FAFB', ...rest }: IconProps) {
  const entry = iconMap[name] ?? ({ library: 'feather', name: 'circle' } as const);

  if (entry.library === 'ion') {
    return <Ionicons name={entry.name} size={size} color={color} {...rest} />;
  }

  if (entry.library === 'mci') {
    return <MaterialCommunityIcons name={entry.name} size={size} color={color} {...rest} />;
  }

  if (entry.library === 'kwilt') {
    // `@expo/vector-icons` color prop allows `OpaqueColorValue`; KwiltIcons are string-only.
    const kwiltColor = typeof color === 'string' ? color : '#000';
    return <KwiltIcon name={entry.name} size={size} color={kwiltColor} />;
  }

  return <Feather name={entry.name} size={size} color={color} {...rest} />;
}


