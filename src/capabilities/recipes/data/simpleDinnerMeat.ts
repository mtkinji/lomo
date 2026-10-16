import type { EditorialRecipe } from './editorialRecipeCatalog';
import { SIMPLE_DINNER_MEAT_01 } from './simpleDinners/meat01';
import { SIMPLE_DINNER_MEAT_02 } from './simpleDinners/meat02';
import { SIMPLE_DINNER_MEAT_03 } from './simpleDinners/meat03';
import { SIMPLE_DINNER_MEAT_04 } from './simpleDinners/meat04';
import { SIMPLE_DINNER_MEAT_05 } from './simpleDinners/meat05';
import { SIMPLE_DINNER_MEAT_06 } from './simpleDinners/meat06';
import { SIMPLE_DINNER_MEAT_07 } from './simpleDinners/meat07';
import { SIMPLE_DINNER_MEAT_08 } from './simpleDinners/meat08';
import { SIMPLE_DINNER_MEAT_09 } from './simpleDinners/meat09';

export const SIMPLE_DINNER_MEAT: readonly EditorialRecipe[] = [
  ...SIMPLE_DINNER_MEAT_01,
  ...SIMPLE_DINNER_MEAT_02,
  ...SIMPLE_DINNER_MEAT_03,
  ...SIMPLE_DINNER_MEAT_04,
  ...SIMPLE_DINNER_MEAT_05,
  ...SIMPLE_DINNER_MEAT_06,
  ...SIMPLE_DINNER_MEAT_07,
  ...SIMPLE_DINNER_MEAT_08,
  ...SIMPLE_DINNER_MEAT_09,
];
