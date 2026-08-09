import { replacementMatchesConcept } from './krogerProductMatching';

describe('Kroger replacement matching', () => {
  it('requires the grocery concept as a phrase instead of accepting scattered search terms', () => {
    expect(replacementMatchesConcept('baking powder', {
      title: 'Rumford Baking Powder - Gluten Free',
      brand: 'Rumford',
    })).toBe(true);
    expect(replacementMatchesConcept('baking powder', {
      title: 'Ghirardelli Premium Baking Cocoa 100% Cocoa Dutch Process Unsweetened Cocoa Powder',
      brand: 'Ghirardelli',
    })).toBe(false);
  });
});
