// ShadCN-style primitive exports for kwilt.
// These are the canonical UI building blocks (inspired by React Native Reusables)
// that screens should depend on. Higher-level, app-specific components can compose
// these primitives while preserving the app shell vs canvas layering.

export { Button, IconButton } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { BottomDrawer as Sheet } from './BottomDrawer';
export { Badge } from './Badge';
export { DropdownMenu } from './DropdownMenu';
export { Dialog } from './Dialog';
export { VStack, HStack } from './Stack';
export { Text, Heading, ButtonLabel } from './Typography';
export { CelebrationGif } from './CelebrationGif';
export { EmptyState } from './EmptyState';
export { ThreeColumnRow } from './layout/ThreeColumnRow';
export { Combobox } from './Combobox';

// Aliases for clarity in forms: Textarea is just Input with multiline enabled.
export { Input as Textarea } from './Input';


