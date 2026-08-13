type ReplacementCandidate = { title: string; brand: string | null };

export const MIN_MEANINGFUL_TOKEN_LENGTH = 3;
const STOP_WORDS = new Set(['and', 'the', 'for', 'with']);

export const meaningfulConceptTokens = (value: string) =>
  value.toLowerCase().match(/[a-z0-9]+/g)?.filter((token) => token.length > 2) ?? [];

export function productStronglyMatchesConcept(concept: string, product: ReplacementCandidate) {
  const tokens = meaningfulConceptTokens(concept).filter((token) => token.length >= MIN_MEANINGFUL_TOKEN_LENGTH && !STOP_WORDS.has(token));
  const productTokens = new Set(meaningfulConceptTokens(`${product.title} ${product.brand ?? ''}`));
  return tokens.length > 0 && tokens.every((token) => productTokens.has(token));
}

export function replacementMatchesConcept(concept: string, product: ReplacementCandidate) {
  const phrase = meaningfulConceptTokens(concept).join(' ');
  const productText = meaningfulConceptTokens(`${product.title} ${product.brand ?? ''}`).join(' ');
  return phrase.length > 0 && productText.includes(phrase);
}
