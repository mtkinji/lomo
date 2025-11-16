import { ComponentType } from 'react';
import { LucideProps } from 'lucide-react-native';
import CalendarCheck from 'lucide-react-native/dist/esm/icons/calendar-check';
import Sparkles from 'lucide-react-native/dist/esm/icons/sparkles';
import BookOpen from 'lucide-react-native/dist/esm/icons/book-open';
import Activity from 'lucide-react-native/dist/esm/icons/activity';
import Circle from 'lucide-react-native/dist/esm/icons/circle';

const icons = {
  today: CalendarCheck,
  arcs: Sparkles,
  chapters: BookOpen,
  activity: Activity,
  dot: Circle,
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


