export type RecipeUpdateDraft = {
  title: string;
  description: string;
  yieldQuantity: string;
  yieldUnit: string;
  ingredients: Array<{ id: string; originalText: string }>;
  instructions: Array<{ id: string; text: string }>;
  sourceTitle: string;
  sourceAuthor: string;
  notes: string;
};
