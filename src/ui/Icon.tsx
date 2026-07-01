import type { ComponentType } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { LucideProps } from 'lucide-react-native';
import Activity from 'lucide-react-native/dist/cjs/icons/activity';
import Archive from 'lucide-react-native/dist/cjs/icons/archive';
import ArrowDown from 'lucide-react-native/dist/cjs/icons/arrow-down';
import ArrowDown01 from 'lucide-react-native/dist/cjs/icons/arrow-down-0-1';
import ArrowDown10 from 'lucide-react-native/dist/cjs/icons/arrow-down-1-0';
import ArrowDownAZ from 'lucide-react-native/dist/cjs/icons/arrow-down-a-z';
import ArrowDownZA from 'lucide-react-native/dist/cjs/icons/arrow-down-z-a';
import ArrowLeft from 'lucide-react-native/dist/cjs/icons/arrow-left';
import ArrowRight from 'lucide-react-native/dist/cjs/icons/arrow-right';
import ArrowUp from 'lucide-react-native/dist/cjs/icons/arrow-up';
import Bell from 'lucide-react-native/dist/cjs/icons/bell';
import Bold from 'lucide-react-native/dist/cjs/icons/bold';
import BookOpen from 'lucide-react-native/dist/cjs/icons/book-open';
import Box from 'lucide-react-native/dist/cjs/icons/box';
import Briefcase from 'lucide-react-native/dist/cjs/icons/briefcase';
import Calendar from 'lucide-react-native/dist/cjs/icons/calendar';
import CalendarDays from 'lucide-react-native/dist/cjs/icons/calendar-days';
import CalendarX from 'lucide-react-native/dist/cjs/icons/calendar-x';
import Camera from 'lucide-react-native/dist/cjs/icons/camera';
import ChartNoAxesColumnIncreasing from 'lucide-react-native/dist/cjs/icons/chart-no-axes-column-increasing';
import Check from 'lucide-react-native/dist/cjs/icons/check';
import ChevronDown from 'lucide-react-native/dist/cjs/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/dist/cjs/icons/chevron-left';
import ChevronRight from 'lucide-react-native/dist/cjs/icons/chevron-right';
import ChevronUp from 'lucide-react-native/dist/cjs/icons/chevron-up';
import ChevronsUpDown from 'lucide-react-native/dist/cjs/icons/chevrons-up-down';
import Circle from 'lucide-react-native/dist/cjs/icons/circle';
import CircleCheck from 'lucide-react-native/dist/cjs/icons/circle-check';
import CircleQuestionMark from 'lucide-react-native/dist/cjs/icons/circle-question-mark';
import Clipboard from 'lucide-react-native/dist/cjs/icons/clipboard';
import Clock from 'lucide-react-native/dist/cjs/icons/clock';
import Code from 'lucide-react-native/dist/cjs/icons/code';
import Columns3 from 'lucide-react-native/dist/cjs/icons/columns-3';
import Compass from 'lucide-react-native/dist/cjs/icons/compass';
import Crosshair from 'lucide-react-native/dist/cjs/icons/crosshair';
import Ellipsis from 'lucide-react-native/dist/cjs/icons/ellipsis';
import ExternalLink from 'lucide-react-native/dist/cjs/icons/external-link';
import Eye from 'lucide-react-native/dist/cjs/icons/eye';
import EyeOff from 'lucide-react-native/dist/cjs/icons/eye-off';
import FileText from 'lucide-react-native/dist/cjs/icons/file-text';
import Flame from 'lucide-react-native/dist/cjs/icons/flame';
import FlagTriangleRight from 'lucide-react-native/dist/cjs/icons/flag-triangle-right';
import Funnel from 'lucide-react-native/dist/cjs/icons/funnel';
import Heart from 'lucide-react-native/dist/cjs/icons/heart';
import House from 'lucide-react-native/dist/cjs/icons/house';
import Hourglass from 'lucide-react-native/dist/cjs/icons/hourglass';
import ImageIcon from 'lucide-react-native/dist/cjs/icons/image';
import Info from 'lucide-react-native/dist/cjs/icons/info';
import Inbox from 'lucide-react-native/dist/cjs/icons/inbox';
import Italic from 'lucide-react-native/dist/cjs/icons/italic';
import Layers from 'lucide-react-native/dist/cjs/icons/layers';
import LayoutList from 'lucide-react-native/dist/cjs/icons/layout-list';
import Link2 from 'lucide-react-native/dist/cjs/icons/link-2';
import List from 'lucide-react-native/dist/cjs/icons/list';
import ListChecks from 'lucide-react-native/dist/cjs/icons/list-checks';
import ListFilter from 'lucide-react-native/dist/cjs/icons/list-filter';
import ListOrdered from 'lucide-react-native/dist/cjs/icons/list-ordered';
import Lock from 'lucide-react-native/dist/cjs/icons/lock';
import Mail from 'lucide-react-native/dist/cjs/icons/mail';
import MapPin from 'lucide-react-native/dist/cjs/icons/map-pin';
import Maximize2 from 'lucide-react-native/dist/cjs/icons/maximize-2';
import Menu from 'lucide-react-native/dist/cjs/icons/menu';
import MessageCircle from 'lucide-react-native/dist/cjs/icons/message-circle';
import MessageSquare from 'lucide-react-native/dist/cjs/icons/message-square';
import MessagesSquare from 'lucide-react-native/dist/cjs/icons/messages-square';
import Mic from 'lucide-react-native/dist/cjs/icons/mic';
import Minimize2 from 'lucide-react-native/dist/cjs/icons/minimize-2';
import OctagonAlert from 'lucide-react-native/dist/cjs/icons/octagon-alert';
import Orbit from 'lucide-react-native/dist/cjs/icons/orbit';
import PackageOpen from 'lucide-react-native/dist/cjs/icons/package-open';
import PanelLeft from 'lucide-react-native/dist/cjs/icons/panel-left';
import Paperclip from 'lucide-react-native/dist/cjs/icons/paperclip';
import Pause from 'lucide-react-native/dist/cjs/icons/pause';
import Phone from 'lucide-react-native/dist/cjs/icons/phone';
import Play from 'lucide-react-native/dist/cjs/icons/play';
import Plus from 'lucide-react-native/dist/cjs/icons/plus';
import RefreshCw from 'lucide-react-native/dist/cjs/icons/refresh-cw';
import RotateCcw from 'lucide-react-native/dist/cjs/icons/rotate-ccw';
import RotateCw from 'lucide-react-native/dist/cjs/icons/rotate-cw';
import Search from 'lucide-react-native/dist/cjs/icons/search';
import Send from 'lucide-react-native/dist/cjs/icons/send';
import Settings from 'lucide-react-native/dist/cjs/icons/settings';
import Share2 from 'lucide-react-native/dist/cjs/icons/share-2';
import Shield from 'lucide-react-native/dist/cjs/icons/shield';
import ShoppingCart from 'lucide-react-native/dist/cjs/icons/shopping-cart';
import SlidersHorizontal from 'lucide-react-native/dist/cjs/icons/sliders-horizontal';
import Smartphone from 'lucide-react-native/dist/cjs/icons/smartphone';
import Sparkles from 'lucide-react-native/dist/cjs/icons/sparkles';
import Square from 'lucide-react-native/dist/cjs/icons/square';
import SquareCheck from 'lucide-react-native/dist/cjs/icons/square-check';
import SquarePen from 'lucide-react-native/dist/cjs/icons/square-pen';
import Star from 'lucide-react-native/dist/cjs/icons/star';
import Tag from 'lucide-react-native/dist/cjs/icons/tag';
import Target from 'lucide-react-native/dist/cjs/icons/target';
import ThumbsDown from 'lucide-react-native/dist/cjs/icons/thumbs-down';
import ThumbsUp from 'lucide-react-native/dist/cjs/icons/thumbs-up';
import Trash2 from 'lucide-react-native/dist/cjs/icons/trash-2';
import TrendingDown from 'lucide-react-native/dist/cjs/icons/trending-down';
import TrendingUp from 'lucide-react-native/dist/cjs/icons/trending-up';
import TriangleAlert from 'lucide-react-native/dist/cjs/icons/triangle-alert';
import Underline from 'lucide-react-native/dist/cjs/icons/underline';
import User from 'lucide-react-native/dist/cjs/icons/user';
import UserMinus from 'lucide-react-native/dist/cjs/icons/user-minus';
import UserPlus from 'lucide-react-native/dist/cjs/icons/user-plus';
import Users from 'lucide-react-native/dist/cjs/icons/users';
import Volume2 from 'lucide-react-native/dist/cjs/icons/volume-2';
import VolumeX from 'lucide-react-native/dist/cjs/icons/volume-x';
import X from 'lucide-react-native/dist/cjs/icons/x';
import Zap from 'lucide-react-native/dist/cjs/icons/zap';
import { KwiltIcon, type KwiltIconName } from '../icons/KwiltIcons';

type IonName = ComponentProps<typeof Ionicons>['name'];
type LucideIconComponent = ComponentType<LucideProps>;

type IconEntry =
  | { library: 'ion'; name: IonName }
  | { library: 'kwilt'; name: KwiltIconName }
  | { library: 'lucide'; icon: LucideIconComponent; fill?: 'color' };

const iconMap = {
  today: { library: 'lucide', icon: Calendar },
  calendar: { library: 'lucide', icon: Calendar },
  outlook: { library: 'ion', name: 'logo-microsoft' },
  apple: { library: 'ion', name: 'logo-apple' },
  google: { library: 'ion', name: 'logo-google' },
  fileText: { library: 'lucide', icon: FileText },
  home: { library: 'lucide', icon: House },
  navHome: { library: 'lucide', icon: House },
  arcs: { library: 'lucide', icon: Compass },
  navArcs: { library: 'lucide', icon: Orbit },
  chapters: { library: 'lucide', icon: BookOpen },
  aiGuide: { library: 'lucide', icon: MessageCircle },
  navAiGuide: { library: 'lucide', icon: MessagesSquare },
  activities: { library: 'lucide', icon: List },
  navActivities: { library: 'lucide', icon: ListChecks },
  activity: { library: 'lucide', icon: Activity },
  estimate: { library: 'lucide', icon: Hourglass },
  difficulty: { library: 'lucide', icon: ChartNoAxesColumnIncreasing },
  identity: { library: 'lucide', icon: User },
  why: { library: 'lucide', icon: CircleQuestionMark },
  daily: { library: 'lucide', icon: Clock },
  clock: { library: 'lucide', icon: Clock },
  bell: { library: 'lucide', icon: Bell },
  phone: { library: 'lucide', icon: Phone },
  pin: { library: 'lucide', icon: MapPin },
  locate: { library: 'lucide', icon: Crosshair },
  panelLeft: { library: 'lucide', icon: PanelLeft },
  menu: { library: 'lucide', icon: Menu },
  briefcase: { library: 'lucide', icon: Briefcase },
  paperclip: { library: 'lucide', icon: Paperclip },
  share: { library: 'lucide', icon: Share2 },
  camera: { library: 'lucide', icon: Camera },
  image: { library: 'lucide', icon: ImageIcon },
  mic: { library: 'lucide', icon: Mic },
  arrowUp: { library: 'lucide', icon: ArrowUp },
  arrowDown: { library: 'lucide', icon: ArrowDown },
  trendUp: { library: 'lucide', icon: TrendingUp },
  trendDown: { library: 'lucide', icon: TrendingDown },
  dot: { library: 'lucide', icon: Circle },
  arrowLeft: { library: 'lucide', icon: ArrowLeft },
  arrowRight: { library: 'lucide', icon: ArrowRight },
  plus: { library: 'lucide', icon: Plus },
  navPlus: { library: 'lucide', icon: Plus },
  tag: { library: 'lucide', icon: Tag },
  more: { library: 'lucide', icon: Ellipsis },
  navMore: { library: 'lucide', icon: Ellipsis },
  settings: { library: 'lucide', icon: Settings },
  goals: { library: 'lucide', icon: Target },
  navGoals: { library: 'lucide', icon: FlagTriangleRight },
  target: { library: 'lucide', icon: Target },
  inbox: { library: 'lucide', icon: Inbox },
  layers: { library: 'lucide', icon: Layers },
  checklist: { library: 'lucide', icon: SquareCheck },
  navChecklist: { library: 'lucide', icon: ListChecks },
  info: { library: 'lucide', icon: Info },
  warning: { library: 'lucide', icon: TriangleAlert },
  danger: { library: 'lucide', icon: OctagonAlert },
  edit: { library: 'lucide', icon: SquarePen },
  search: { library: 'lucide', icon: Search },
  navSearch: { library: 'lucide', icon: Search },
  close: { library: 'lucide', icon: X },
  chevronLeft: { library: 'lucide', icon: ChevronLeft },
  chevronRight: { library: 'lucide', icon: ChevronRight },
  chevronDown: { library: 'lucide', icon: ChevronDown },
  chevronUp: { library: 'lucide', icon: ChevronUp },
  chevronsUpDown: { library: 'lucide', icon: ChevronsUpDown },
  trash: { library: 'lucide', icon: Trash2 },
  archive: { library: 'lucide', icon: Archive },
  refresh: { library: 'lucide', icon: RefreshCw },
  check: { library: 'lucide', icon: Check },
  checkCircle: { library: 'lucide', icon: CircleCheck },
  dev: { library: 'lucide', icon: Code },
  sparkles: { library: 'lucide', icon: Sparkles },
  plan: { library: 'lucide', icon: Calendar },
  navPlan: { library: 'lucide', icon: Calendar },
  focus: { library: 'kwilt', name: 'focus' },
  sendTo: { library: 'lucide', icon: Send },
  sendToCalendar: { library: 'kwilt', name: 'sendToCalendar' },
  send: { library: 'lucide', icon: Send },
  clipboard: { library: 'lucide', icon: Clipboard },
  cart: { library: 'lucide', icon: ShoppingCart },
  users: { library: 'lucide', icon: Users },
  Users: { library: 'lucide', icon: Users },
  heart: { library: 'lucide', icon: Heart },
  userPlus: { library: 'lucide', icon: UserPlus },
  userMinus: { library: 'lucide', icon: UserMinus },
  messageCircle: { library: 'lucide', icon: MessageCircle },
  messageSquare: { library: 'lucide', icon: MessageSquare },
  mail: { library: 'lucide', icon: Mail },
  flame: { library: 'lucide', icon: Flame },
  shield: { library: 'lucide', icon: Shield },
  star: { library: 'lucide', icon: Star },
  starFilled: { library: 'lucide', icon: Star, fill: 'color' },
  funnel: { library: 'lucide', icon: Funnel },
  sort: { library: 'lucide', icon: SlidersHorizontal },
  thumbsDown: { library: 'lucide', icon: ThumbsDown },
  thumbsUp: { library: 'lucide', icon: ThumbsUp },
  sound: { library: 'lucide', icon: Volume2 },
  soundOff: { library: 'lucide', icon: VolumeX },
  haptics: { library: 'lucide', icon: Smartphone },
  lock: { library: 'lucide', icon: Lock },
  pause: { library: 'lucide', icon: Pause },
  play: { library: 'lucide', icon: Play },
  stop: { library: 'lucide', icon: Square },
  box: { library: 'lucide', icon: Box },
  emptyBox: { library: 'lucide', icon: PackageOpen },
  listBulleted: { library: 'lucide', icon: List },
  listOrdered: { library: 'lucide', icon: ListOrdered },
  link: { library: 'lucide', icon: Link2 },
  bold: { library: 'lucide', icon: Bold },
  italic: { library: 'lucide', icon: Italic },
  underline: { library: 'lucide', icon: Underline },
  eye: { library: 'lucide', icon: Eye },
  eyeOff: { library: 'lucide', icon: EyeOff },
  undo: { library: 'lucide', icon: RotateCcw },
  redo: { library: 'lucide', icon: RotateCw },
  moveTime: { library: 'lucide', icon: Clock },
  unschedule: { library: 'lucide', icon: CalendarX },
  expand: { library: 'lucide', icon: Maximize2 },
  collapse: { library: 'lucide', icon: Minimize2 },
  externalLink: { library: 'lucide', icon: ExternalLink },
  sortAlphaAsc: { library: 'lucide', icon: ArrowDownAZ },
  sortAlphaDesc: { library: 'lucide', icon: ArrowDownZA },
  sortNumericAsc: { library: 'lucide', icon: ArrowDown01 },
  sortNumericDesc: { library: 'lucide', icon: ArrowDown10 },
  sortCalendarAsc: { library: 'lucide', icon: CalendarDays },
  sortCalendarDesc: { library: 'lucide', icon: CalendarDays },
  sortAmountAsc: { library: 'lucide', icon: ListFilter },
  sortAmountDesc: { library: 'lucide', icon: ListFilter },
  viewList: { library: 'lucide', icon: LayoutList },
  viewKanban: { library: 'lucide', icon: Columns3 },
} satisfies Record<string, IconEntry>;

export type IconName = keyof typeof iconMap;

interface IconProps extends Omit<LucideProps, 'name'> {
  name: IconName;
}

const fallbackEntry = { library: 'lucide', icon: Circle } satisfies IconEntry;

export function Icon({ name, size = 20, color = '#F9FAFB', ...rest }: IconProps) {
  const entry = iconMap[name] ?? fallbackEntry;
  const iconColor = typeof color === 'string' ? color : '#000';
  const numericSize = typeof size === 'number' ? size : Number(size) || 20;

  if (entry.library === 'ion') {
    return <Ionicons name={entry.name} size={numericSize} color={color} {...rest} />;
  }

  if (entry.library === 'kwilt') {
    return <KwiltIcon name={entry.name} size={numericSize} color={iconColor} />;
  }

  const Component = entry.icon;
  const fill = 'fill' in entry && entry.fill === 'color' ? iconColor : 'none';
  return <Component size={numericSize} color={iconColor} fill={fill} {...rest} />;
}
