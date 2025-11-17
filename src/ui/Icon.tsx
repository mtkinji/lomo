import { ComponentType } from 'react';
import { LucideProps } from 'lucide-react-native';
import CalendarCheck from 'lucide-react-native/dist/esm/icons/calendar-check';
import Sparkles from 'lucide-react-native/dist/esm/icons/sparkles';
import BookOpen from 'lucide-react-native/dist/esm/icons/book-open';
import Activity from 'lucide-react-native/dist/esm/icons/activity';
import MessagesSquare from 'lucide-react-native/dist/esm/icons/messages-square';
import ListChecks from 'lucide-react-native/dist/esm/icons/list-checks';
import Paperclip from 'lucide-react-native/dist/esm/icons/paperclip';
import ImageIcon from 'lucide-react-native/dist/esm/icons/image';
import Mic from 'lucide-react-native/dist/esm/icons/mic';
import ArrowUp from 'lucide-react-native/dist/esm/icons/arrow-up';
import Circle from 'lucide-react-native/dist/esm/icons/circle';
import ArrowLeft from 'lucide-react-native/dist/esm/icons/arrow-left';
import Plus from 'lucide-react-native/dist/esm/icons/plus';
import Ellipsis from 'lucide-react-native/dist/esm/icons/ellipsis';
import Target from 'lucide-react-native/dist/esm/icons/target';
import Info from 'lucide-react-native/dist/esm/icons/info';
import House from 'lucide-react-native/dist/esm/icons/house';

const icons = {
  today: CalendarCheck,
  home: House,
  arcs: Sparkles,
  chapters: BookOpen,
  aiGuide: MessagesSquare,
  activities: ListChecks,
  activity: Activity,
  paperclip: Paperclip,
  image: ImageIcon,
  mic: Mic,
  arrowUp: ArrowUp,
  dot: Circle,
  arrowLeft: ArrowLeft,
  plus: Plus,
  more: Ellipsis,
  goals: Target,
  info: Info,
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


