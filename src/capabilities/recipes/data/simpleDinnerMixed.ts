import type { EditorialRecipe } from './editorialRecipeCatalog';
import { SIMPLE_DINNER_MIXED_01 } from './simpleDinners/mixed01';
import { SIMPLE_DINNER_MIXED_02 } from './simpleDinners/mixed02';
import { SIMPLE_DINNER_MIXED_03 } from './simpleDinners/mixed03';
import { SIMPLE_DINNER_MIXED_04 } from './simpleDinners/mixed04';

export const SIMPLE_DINNER_MIXED: readonly EditorialRecipe[] = [
  ...SIMPLE_DINNER_MIXED_01,
  ...SIMPLE_DINNER_MIXED_02,
  ...SIMPLE_DINNER_MIXED_03,
  ...SIMPLE_DINNER_MIXED_04,
];
