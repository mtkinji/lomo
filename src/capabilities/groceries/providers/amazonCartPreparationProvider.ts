import { Linking } from 'react-native';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import {
  getAffiliateRetailerTestingEnabled,
  getAmazonBatchPreparationEnabled,
} from '../../../utils/getEnv';
import {
  parseRetailerBatchPreparation,
  summarizeRetailerBatchPreparation,
  type RetailerBatchPreparation,
} from '../domain/retailerBatchPreparation';

export type AmazonPreparationInput = {
  listId: string;
  listRevision: number;
  items: Array<{
    id: string;
    concept: string;
    quantityMin: number | null;
    quantityMax: number | null;
    unit: string | null;
  }>;
};

type Invoke = (name: string, options: { body: AmazonPreparationInput }) => Promise<{
  data: unknown;
  error: unknown;
}>;

function createPreview(input: AmazonPreparationInput): RetailerBatchPreparation {
  return {
    schemaVersion: 1,
    retailerId: 'amazon',
    listId: input.listId,
    listRevision: input.listRevision,
    source: 'preview',
    observedAt: new Date().toISOString(),
    cartUrl: null,
    items: input.items.map((item) => ({
      itemId: item.id,
      status: 'review',
      productId: `preview:${item.id}`,
      title: `${item.concept} · example Amazon match`,
      reason: 'Amazon catalog matching is not connected',
    })),
  };
}

export function createAmazonCartPreparationProvider(dependencies?: {
  invoke?: Invoke;
  testingEnabled?: boolean;
  batchPreparationEnabled?: boolean;
}) {
  const invoke = dependencies?.invoke ?? ((name, options) => getSupabaseClient().functions.invoke(name, options));
  const testingEnabled = dependencies?.testingEnabled ?? getAffiliateRetailerTestingEnabled();
  const batchPreparationEnabled = dependencies?.batchPreparationEnabled ?? getAmazonBatchPreparationEnabled();
  return {
    async prepare(input: AmazonPreparationInput): Promise<RetailerBatchPreparation> {
      if (testingEnabled) return createPreview(input);
      if (!batchPreparationEnabled) throw new Error('amazon.preparation_unavailable');
      const { data, error } = await invoke('amazon-grocery-prepare', { body: input });
      if (error) throw new Error('amazon.preparation_unavailable');
      const parsed = parseRetailerBatchPreparation(data, {
        listId: input.listId,
        listRevision: input.listRevision,
        itemIds: input.items.map((item) => item.id),
      });
      if (!parsed) throw new Error('amazon.preparation_invalid');
      return parsed;
    },
  };
}

export const amazonCartPreparationProvider = createAmazonCartPreparationProvider();

export async function openAmazonPreparedCart(preparation: RetailerBatchPreparation): Promise<boolean> {
  if (!summarizeRetailerBatchPreparation(preparation).canOpenBatchCart || !preparation.cartUrl) return false;
  await Linking.openURL(preparation.cartUrl);
  return true;
}
