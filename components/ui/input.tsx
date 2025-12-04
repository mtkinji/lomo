import { cn } from '@/lib/utils';
import { Platform, TextInput, type TextInputProps } from 'react-native';

function Input({
  className,
  placeholderClassName,
  ...props
}: TextInputProps & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        // Root input: solid white background, tighter dark contact shadow, no border in default or focused states.
        // Slightly taller height so descenders (g, y, p) never get clipped on iOS.
        'bg-background text-foreground flex h-11 w-full min-w-0 flex-row items-center rounded-md px-3 py-2 text-base leading-5 shadow-[0_1px_2px_rgba(15,23,42,0.32)] sm:h-9',
        props.editable === false &&
          cn(
            'opacity-50',
            Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })
          ),
        Platform.select({
          web: cn(
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none md:text-sm'
          ),
          native: 'placeholder:text-muted-foreground/50',
        }),
        className
      )}
      {...props}
    />
  );
}

export { Input };
