import { ComponentType } from 'react';
import { LucideProps } from 'lucide-react-native';
import CalendarCheck from 'lucide-react-native/dist/esm/icons/calendar-check';
import Orbit from 'lucide-react-native/dist/esm/icons/orbit';
import BookOpen from 'lucide-react-native/dist/esm/icons/book-open';
import Activity from 'lucide-react-native/dist/esm/icons/activity';
import MessagesSquare from 'lucide-react-native/dist/esm/icons/messages-square';
import ListChecks from 'lucide-react-native/dist/esm/icons/list-checks';
import Paperclip from 'lucide-react-native/dist/esm/icons/paperclip';
import Camera from 'lucide-react-native/dist/esm/icons/camera';
import ImageIcon from 'lucide-react-native/dist/esm/icons/image';
import RefreshCw from 'lucide-react-native/dist/esm/icons/refresh-cw';
import Mic from 'lucide-react-native/dist/esm/icons/mic';
import ArrowUp from 'lucide-react-native/dist/esm/icons/arrow-up';
import Circle from 'lucide-react-native/dist/esm/icons/circle';
import ArrowLeft from 'lucide-react-native/dist/esm/icons/arrow-left';
import Plus from 'lucide-react-native/dist/esm/icons/plus';
import Ellipsis from 'lucide-react-native/dist/esm/icons/ellipsis';
import Target from 'lucide-react-native/dist/esm/icons/target';
import Info from 'lucide-react-native/dist/esm/icons/info';
import Pencil from 'lucide-react-native/dist/esm/icons/pencil';
import House from 'lucide-react-native/dist/esm/icons/house';
import PanelLeft from 'lucide-react-native/dist/esm/icons/panel-left';
import Search from 'lucide-react-native/dist/esm/icons/search';
import Menu from 'lucide-react-native/dist/esm/icons/menu';
import CloseIcon from 'lucide-react-native/dist/esm/icons/x';
import ChevronRight from 'lucide-react-native/dist/esm/icons/chevron-right';
import ChevronDown from 'lucide-react-native/dist/esm/icons/chevron-down';
import Trash from 'lucide-react-native/dist/esm/icons/trash-2';
import Check from 'lucide-react-native/dist/esm/icons/check';
import FlaskConical from 'lucide-react-native/dist/esm/icons/flask-conical';

const icons = {
  today: CalendarCheck,
  home: House,
  arcs: Orbit,
  chapters: BookOpen,
  aiGuide: MessagesSquare,
  activities: ListChecks,
  activity: Activity,
  panelLeft: PanelLeft,
  menu: Menu,
  paperclip: Paperclip,
  camera: Camera,
  image: ImageIcon,
  mic: Mic,
  arrowUp: ArrowUp,
  dot: Circle,
  arrowLeft: ArrowLeft,
  plus: Plus,
  more: Ellipsis,
  goals: Target,
  info: Info,
  edit: Pencil,
  search: Search,
  close: CloseIcon,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  trash: Trash,
  refresh: RefreshCw,
  check: Check,
  dev: FlaskConical,
};

export type IconName = keyof typeof icons;

interface IconProps extends Omit<LucideProps, 'size' | 'color'> {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = '#F9FAFB', ...rest }: IconProps) {
  const Component: ComponentType<LucideProps> = icons[name] ?? icons.dot;
  return <Component size={size} color={color} {...rest} />;
}


