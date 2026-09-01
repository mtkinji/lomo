const MONEY_STRUCTURE_PATTERN = /\b(?:budgets?|budget\s+categor(?:y|ies)|categor(?:y|ies))\b/i;
const MONEY_STRUCTURE_REVIEW_PATTERN =
  /\b(?:right|better|simpler|structure|system|review|merge|split|add|remove|change|changes|think)\b/i;

export function isMoneyCategoryStructureReview(prompt: string): boolean {
  return MONEY_STRUCTURE_PATTERN.test(prompt) && MONEY_STRUCTURE_REVIEW_PATTERN.test(prompt);
}
