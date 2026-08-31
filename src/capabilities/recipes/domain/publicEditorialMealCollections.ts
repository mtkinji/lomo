import type {
  CollectionDiscoveryRole,
  EditorialCollection,
  EditorialCollectionJobIntent,
} from './editorialMealCollectionContracts';

export type PublicEditorialMealCollectionEntry = {
  id: string;
  rosterId: string;
  discoveryRole: CollectionDiscoveryRole;
  whyTry: string;
  whyDoable: string;
  firstTimeNote?: string;
};

export type PublicEditorialMealCollection = {
  id: string;
  slug: string;
  version: number;
  title: string;
  deck: string;
  eyebrow: string;
  jobIntent: EditorialCollectionJobIntent;
  heroRosterId: string;
  editorialOwner: string;
  supportsPlanReview: boolean;
  sections: Array<{
    id: string;
    title: string;
    note: string;
    entries: PublicEditorialMealCollectionEntry[];
  }>;
};

export type PublicEditorialMealCollectionExport = {
  schemaVersion: 1;
  sourceCommit: string;
  collections: PublicEditorialMealCollection[];
  rotationGroups: string[][];
};

function publicRosterId(recipeId: string): string {
  const match = /^kwilt-recipe-([a-z0-9]+)$/i.exec(recipeId);
  if (!match) throw new Error(`Collection recipe ${recipeId} is not eligible for public export.`);
  return match[1].toUpperCase();
}

export function buildPublicEditorialMealCollectionExport(input: {
  collections: readonly EditorialCollection[];
  rotations: ReadonlyArray<readonly string[]>;
  sourceCommit: string;
}): PublicEditorialMealCollectionExport {
  const collectionIds = new Set(input.collections.map((collection) => collection.id));
  for (const rotation of input.rotations) {
    for (const collectionId of rotation) {
      if (!collectionIds.has(collectionId)) {
        throw new Error(`Editorial rotation references missing Collection ${collectionId}.`);
      }
    }
  }

  return {
    schemaVersion: 1,
    sourceCommit: input.sourceCommit,
    collections: input.collections.map((collection) => ({
      id: collection.id,
      slug: collection.slug,
      version: collection.version,
      title: collection.title,
      deck: collection.deck,
      eyebrow: collection.eyebrow,
      jobIntent: collection.jobIntent,
      heroRosterId: publicRosterId(collection.heroRecipeId),
      editorialOwner: collection.editorialOwner,
      supportsPlanReview: Boolean(collection.mealPlanTemplateId),
      sections: collection.sections.map((section) => ({
        id: section.id,
        title: section.title,
        note: section.note,
        entries: section.entries.map((entry) => ({
          id: entry.id,
          rosterId: publicRosterId(entry.recipeId),
          discoveryRole: entry.discoveryRole,
          whyTry: entry.whyTry,
          whyDoable: entry.whyDoable,
          ...(entry.firstTimeNote ? { firstTimeNote: entry.firstTimeNote } : {}),
        })),
      })),
    })),
    rotationGroups: input.rotations.map((rotation) => [...rotation]),
  };
}
