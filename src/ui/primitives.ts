// Curated ShadCN-aligned exports for Kwilt UI.
// This barrel includes canonical primitives plus documented candidate/local
// compositions for migration compatibility. Import presence alone does not grant
// canonical status; docs/design-system/component-inventory.md is authoritative.

export { Button, IconButton } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { BottomDrawer as Sheet } from './BottomDrawer';
export { Badge } from './Badge';
export { DropdownMenu } from './DropdownMenu';
export { Dialog } from './Dialog';
export { VStack, HStack } from './Stack';
export { Text, Heading, ButtonLabel } from './Typography';
export { SurveyCard } from './SurveyCard';
export { QuestionCard } from './QuestionCard';
export { CelebrationGif } from './CelebrationGif';
export { CelebrationInterstitialHost } from './CelebrationInterstitial';
export { EmptyState } from './EmptyState';
export { ThreeColumnRow } from './layout/ThreeColumnRow';
export { Combobox } from './Combobox';
export { ObjectPicker } from './ObjectPicker';
export {
  EnumPickerField,
  SmallSetPickerField,
  RelationPickerField,
  type PickerFieldOption,
  type PickerFieldRecommendedOption,
} from './PickerFields';
export { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

// Aliases for clarity in forms: Textarea is just Input with multiline enabled.
export { Input as Textarea } from './Input';
