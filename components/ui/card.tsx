import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { StyleSheet, View, type ViewProps } from 'react-native';

function Card({
  className,
  style,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          // Base card shell: 12px padding to match the app spacing scale and
          // a slightly softer, larger radius so cards feel like containers.
          'bg-card border-border flex flex-col gap-6 rounded-2xl border px-3 py-3 shadow-sm shadow-black/5',
          className
        )}
        // React Native fallback so the card still renders as a white, rounded
        // surface with a subtle border even if NativeWind className styling
        // is not available (e.g., during migration or in Storybook).
        style={[styles.card, style]}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function CardHeader({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn('font-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function CardContent({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return <View className={cn('flex flex-row items-center px-6', className)} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    // Match the shared card surface radius so banners and inner content can
    // rely on a consistent container shape.
    borderRadius: 16,
    // 12px padding on all sides to align with the app spacing scale.
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
