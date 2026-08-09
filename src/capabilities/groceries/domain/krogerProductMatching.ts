type ReplacementCandidate = { title: string; brand: string | null };

const normalizedWords = (value: string) =>
  value.toLowerCase().match(/[a-z0-9]+/g)?.filter((token) => token.length > 2) ?? [];

export function replacementMatchesConcept(concept: string, product: ReplacementCandidate) {
  const phrase = normalizedWords(concept).join(' ');
  const productText = normalizedWords(`${product.title} ${product.brand ?? ''}`).join(' ');
  return phrase.length > 0 && productText.includes(phrase);
}
