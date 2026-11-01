import type { EditorialRecipe } from './editorialRecipeCatalog';
import { SIMPLE_DINNER_SEAFOOD_01 } from './simpleDinners/seafood01';
import { SIMPLE_DINNER_SEAFOOD_02 } from './simpleDinners/seafood02';
import { SIMPLE_DINNER_SEAFOOD_03 } from './simpleDinners/seafood03';
import { SIMPLE_DINNER_SEAFOOD_04 } from './simpleDinners/seafood04';
import { SIMPLE_DINNER_SEAFOOD_05 } from './simpleDinners/seafood05';

export const SIMPLE_DINNER_SEAFOOD: readonly EditorialRecipe[] = [
  ...SIMPLE_DINNER_SEAFOOD_01,
  ...SIMPLE_DINNER_SEAFOOD_02,
  ...SIMPLE_DINNER_SEAFOOD_03,
  ...SIMPLE_DINNER_SEAFOOD_04,
  ...SIMPLE_DINNER_SEAFOOD_05,
];
